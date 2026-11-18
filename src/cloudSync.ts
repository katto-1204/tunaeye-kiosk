import { deleteCapturedEvidence, getCapturedEvidence, markEvidenceSynced, updateEvidenceSyncState } from './evidenceStorage'
import { loadRecords, saveRecords, type GradingRecord } from './gradingRecords'
import { sqliteSaveStatus } from './sqliteStore'
import { CloudUnavailableError, ensureSupabaseUser, getSupabase, isCloudNetworkError, isSupabaseConfigured, reportCloudConnection, requireCloudConnection, type Database } from './supabase'

const BUCKET = 'grading-images'
const sampleType = (sample: string) => sample === 'Tail cut' ? 'tail_cut' as const : 'sashibo_core' as const
const grade = (record: GradingRecord) => ['A', 'B', 'C'].includes(record.grade) ? record.grade as 'A' | 'B' | 'C' : 'Invalid'
const imageExtension = (mimeType: string) => ({ 'image/png': 'png', 'image/webp': 'webp' }[mimeType] ?? 'jpg')
const RETAIN_SYNCED_RECORDS = 200

function setSyncState(id: string, syncState: 'pending' | 'syncing' | 'synced' | 'failed', lastSyncError?: string, remoteImagePath?: string) {
  saveRecords(loadRecords().map(record => record.id === id ? {
    ...record,
    remoteImagePath: remoteImagePath ?? record.remoteImagePath,
    transaction: { ...record.transaction, currency: record.transaction?.currency ?? 'PHP', amount: record.transaction?.amount ?? null, syncState, lastSyncError },
  } : record))
}

export interface SyncSummary { synced: number; failed: number; skipped: number; waiting: number; firstError?: string }
export type SyncPhase = 'offline' | 'connecting' | 'syncing' | 'synced' | 'failed'
export const SYNC_STATUS_EVENT = 'tunaeye-sync-status'
function emitSyncStatus(phase: SyncPhase, detail?: string) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(SYNC_STATUS_EVENT, { detail: { phase, detail } }))
}

let activeSync: Promise<SyncSummary> | null = null

function sameValue(field: string, actual: unknown, expected: unknown) {
  if (field.endsWith('_at') && typeof actual === 'string' && typeof expected === 'string') return Date.parse(actual) === Date.parse(expected)
  // PostgreSQL jsonb returns score keys in its own order.
  if (field === 'scores' && actual && expected && typeof actual === 'object' && typeof expected === 'object') {
    const stored = actual as Record<string, unknown>
    const scores = expected as Record<string, unknown>
    return Object.keys(stored).length === Object.keys(scores).length && Object.keys(scores).every(key => Object.hasOwn(stored, key) && stored[key] === scores[key])
  }
  return JSON.stringify(actual ?? null) === JSON.stringify(expected ?? null)
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message
  return 'Unknown synchronization error'
}

async function sameBlob(left: Blob, right: Blob) {
  if (left.size !== right.size) return false
  const [leftBytes, rightBytes] = await Promise.all([left.arrayBuffer(), right.arrayBuffer()])
  const rightView = new Uint8Array(rightBytes)
  return new Uint8Array(leftBytes).every((value, index) => value === rightView[index])
}

async function pruneVerifiedLocalRecords() {
  const records = loadRecords()
  const removable = records
    .filter(record => record.transaction?.syncState === 'synced')
    .sort((left, right) => right.timestamp - left.timestamp)
    .slice(RETAIN_SYNCED_RECORDS)
  const removed = new Set<string>()
  for (const record of removable) {
    if (record.capturedImageId) await deleteCapturedEvidence(record.capturedImageId)
    removed.add(record.id)
  }
  if (removed.size) saveRecords(records.filter(record => !removed.has(record.id)))
}

  async function runPendingSync(limit = 50): Promise<SyncSummary> {
    if (!isSupabaseConfigured()) throw new Error('Supabase is missing from this build. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then redeploy or rebuild the kiosk.')
    const allPending = loadRecords().filter(record => record.transaction?.syncState !== 'synced')
    const pending = allPending.slice(0, Math.max(1, limit))
    const summary: SyncSummary = { synced: 0, failed: 0, skipped: Math.max(0, allPending.length - pending.length), waiting: 0 }
    if (!pending.length) { emitSyncStatus('synced'); return summary }
    emitSyncStatus('connecting')
    try {
      await requireCloudConnection()
    } catch (error) {
      if (isCloudNetworkError(error)) emitSyncStatus('offline', errorMessage(error))
      else emitSyncStatus('failed', errorMessage(error))
      throw error
    }
    const supabase = getSupabase()
    const user = await ensureSupabaseUser()
    emitSyncStatus('syncing')

    for (const record of pending) {
      setSyncState(record.id, 'syncing')
      try {
        const isDemoRecord = record.result?.modelSource === 'demo'
        const evidence = record.capturedImageId ? await getCapturedEvidence(record.capturedImageId) : undefined
        if (record.capturedImageId && !evidence && !isDemoRecord) throw new Error('Captured evidence is missing. The record remains pending.')
        let imagePath = record.remoteImagePath ?? evidence?.remotePath ?? null
        if (evidence && !imagePath) {
          imagePath = `${user.id}/${record.id}/${sampleType(record.sample)}.${imageExtension(evidence.mimeType)}`
          await updateEvidenceSyncState(evidence.id, 'syncing')
          const { error: uploadError } = await supabase.storage.from(BUCKET).upload(imagePath, evidence.blob, { contentType: evidence.mimeType, upsert: true })
          if (uploadError) throw uploadError
        }

        const cloudRecord: Database['public']['Tables']['grading_records']['Insert'] = {
          id: record.id,
          user_id: user.id,
          source: 'kiosk',
          station_id: localStorage.getItem('tunaeye-station') ?? 'TunaEye Station 01',
          session_id: record.sessionId,
          grader_name: record.grader,
          sample_type: sampleType(record.sample),
          fish_id: record.fish,
          weight_kg: Number.parseFloat(record.weight) || null,
          grade: grade(record),
          confidence: record.result?.originalConfidence ?? null,
          result_status: record.result?.provisional ? 'provisional' : (record.result?.status ?? record.status),
          original_grade: record.result?.originalGrade as 'A' | 'B' | 'C' | null | undefined,
          override_grade: record.result?.overrideGrade as 'A' | 'B' | 'C' | null | undefined,
          override_reason: record.result?.overrideReason || null,
          override_actor: record.result?.overrideActor ?? null,
          override_at: record.result?.overrideAt ?? null,
          currency_code: record.transaction?.currency ?? 'PHP',
          grade_unit_rate_per_kg: record.transaction?.unitRatePerKg ?? null,
          total_fish_price: record.transaction?.amount ?? null,
          capture_id: record.result?.captureId ?? null,
          inference_id: record.result?.inferenceId ?? null,
          raw_confidence: record.result?.rawConfidence ?? null,
          scores: record.result?.scores ?? null,
          image_type: record.result?.imageType ?? null,
          model_source: record.result?.modelSource ?? null,
          image_path: imagePath,
          captured_at: new Date(evidence?.capturedAt ?? record.timestamp).toISOString(),
          updated_at: new Date().toISOString(),
        }
        const { error } = await supabase.from('grading_records').upsert(cloudRecord, { onConflict: 'id' })
        if (error) throw error

        const verifiedFields = 'id,user_id,source,station_id,session_id,grader_name,sample_type,fish_id,weight_kg,grade,confidence,result_status,original_grade,override_grade,override_reason,override_actor,override_at,capture_id,inference_id,raw_confidence,scores,image_type,model_source,currency_code,grade_unit_rate_per_kg,total_fish_price,image_path,captured_at'
        const { data: verified, error: verifyError } = await supabase.from('grading_records').select(verifiedFields).eq('id', record.id).single()
        if (verifyError || !verified) throw verifyError ?? new Error('Cloud persistence could not be verified.')
        const expected = cloudRecord as Record<string, unknown>
        const actual = verified as unknown as Record<string, unknown>
        for (const field of verifiedFields.split(',')) {
          if (!sameValue(field, actual[field], expected[field])) throw new Error(`Cloud verification failed for ${field}. The local record remains pending.`)
        }
        if (evidence && imagePath) {
          const { data: cloudImage, error: imageError } = await supabase.storage.from(BUCKET).download(imagePath)
          if (imageError) throw new Error(`Cloud image verification failed: ${imageError.message}`)
          if (!cloudImage || !await sameBlob(evidence.blob, cloudImage)) throw new Error('Cloud image verification failed: stored bytes do not match the captured evidence.')
        }
        if (evidence && imagePath) await markEvidenceSynced(evidence.id, imagePath)
        setSyncState(record.id, 'synced', undefined, imagePath ?? undefined)
        summary.synced += 1
      } catch (error) {
        if (isCloudNetworkError(error)) {
          reportCloudConnection(false)
          if (record.capturedImageId) await updateEvidenceSyncState(record.capturedImageId, 'pending').catch(() => undefined)
          setSyncState(record.id, 'pending')
          summary.waiting = pending.length - summary.synced - summary.failed
          summary.firstError = new CloudUnavailableError().message
          break
        }
        const message = errorMessage(error)
        if (record.capturedImageId) await updateEvidenceSyncState(record.capturedImageId, 'failed').catch(() => undefined)
        setSyncState(record.id, 'failed', message)
        summary.failed += 1
        summary.firstError ??= message
      }
    }
    await pruneVerifiedLocalRecords()
    await sqliteSaveStatus()
    emitSyncStatus(summary.failed > 0 ? 'failed' : summary.waiting > 0 ? 'offline' : 'synced', summary.firstError)
    return summary
  }

    export function syncPendingRecords(options?: { limit?: number }): Promise<SyncSummary> {
      activeSync ??= runPendingSync(options?.limit).finally(() => { activeSync = null })
      return activeSync
    }

    export async function syncPriceSchedule(prices: Record<'A' | 'B' | 'C', number>) {
      if (!isSupabaseConfigured()) throw new Error('Supabase is missing from this build.')
      await requireCloudConnection()
      const user = await ensureSupabaseUser()
      const stationId = localStorage.getItem('tunaeye-station') ?? 'TunaEye Station 01'
      const rows: Database['public']['Tables']['price_schedules']['Insert'][] = (['A', 'B', 'C'] as const).map(item => ({ user_id: user.id, station_id: stationId, grade: item, currency_code: 'PHP', price_per_kg: prices[item], updated_at: new Date().toISOString() }))
      const supabase = getSupabase()
      const { error } = await supabase.from('price_schedules').upsert(rows, { onConflict: 'user_id,station_id,grade' })
      if (isCloudNetworkError(error)) { reportCloudConnection(false); throw new CloudUnavailableError() }
      if (error) throw new Error(`Price schedule sync failed: ${error.message}`)
      const { data: verified, error: verifyError } = await supabase
        .from('price_schedules')
        .select('user_id,station_id,grade,currency_code,price_per_kg')
        .eq('user_id', user.id)
        .eq('station_id', stationId)
      if (isCloudNetworkError(verifyError)) { reportCloudConnection(false); throw new CloudUnavailableError() }
      if (verifyError) throw new Error(`Price schedule verification failed: ${verifyError.message}`)
      const verifiedByGrade = new Map((verified ?? []).map(row => [row.grade, row]))
      for (const row of rows) {
        const actual = verifiedByGrade.get(row.grade)
        if (!actual || actual.user_id !== row.user_id || actual.station_id !== row.station_id || actual.currency_code !== row.currency_code || Number(actual.price_per_kg) !== row.price_per_kg) {
          throw new Error(`Price schedule verification failed for Grade ${row.grade}. The local schedule was retained.`)
        }
      }
    }

      export async function fetchCloudRecords(limit = 200): Promise<GradingRecord[]> {
        if (!isSupabaseConfigured() || !navigator.onLine) return []
        await ensureSupabaseUser()
        const { data, error } = await getSupabase().from('grading_records').select('*').order('captured_at', { ascending: false }).limit(Math.max(1, limit))
        if (error) throw error
        const rows: Database['public']['Tables']['grading_records']['Row'][] = data ?? []
        return rows.map(row => ({
          id: row.id, sessionId: row.session_id, timestamp: Date.parse(row.captured_at), time: new Date(row.captured_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
          grader: row.grader_name, sample: row.sample_type === 'tail_cut' ? 'Tail cut' : 'Sashibo core', fish: row.fish_id,
          weight: row.weight_kg === null ? '—' : `${row.weight_kg} kg`, grade: row.grade, status: row.override_grade ? 'Override' : row.result_status,
          remoteImagePath: row.image_path ?? undefined,
          result: { status: row.result_status, originalGrade: row.original_grade, originalConfidence: row.confidence, rawConfidence: row.raw_confidence ?? undefined, overrideGrade: row.override_grade, overrideReason: row.override_reason ?? '', overrideActor: row.override_actor ?? undefined, overrideAt: row.override_at ?? undefined, inferenceId: row.inference_id ?? undefined, captureId: row.capture_id ?? undefined, scores: row.scores ?? undefined, imageType: row.image_type ?? undefined, modelSource: row.model_source ?? undefined },
          transaction: { currency: row.currency_code ?? 'PHP', unitRatePerKg: row.grade_unit_rate_per_kg, amount: row.total_fish_price, syncState: 'synced' },
        }))
      }

export async function syncGradersToCloud(names: string[]) {
  const clean = [...new Set(names.map(n => n.trim()).filter(Boolean))].slice(0, 25)
  if (!clean.length || !isSupabaseConfigured() || !navigator.onLine) return
  try {
    const user = await ensureSupabaseUser()
    const supabase = getSupabase()
    const stationId = localStorage.getItem('tunaeye-station') ?? 'TunaEye Station 01'
    const now = new Date().toISOString()
    await supabase.from('profiles').update({ display_name: clean[0], updated_at: now }).eq('user_id', user.id)
    const rows = clean.map(name => ({
      id: `${user.id}:${stationId}:${name.toLocaleLowerCase()}`,
      user_id: user.id,
      station_id: stationId,
      grader_name: name,
      active: true,
      last_seen_at: now,
    }))
    await supabase.from('station_graders').upsert(rows, { onConflict: 'id' })
  } catch { /* Offline or station_graders migration not yet applied; local list stays intact. */ }
}

export async function fetchCloudGraders(): Promise<string[]> {
  if (!isSupabaseConfigured() || !navigator.onLine) return []
  try {
    await ensureSupabaseUser()
    const { data, error } = await getSupabase().from('station_graders').select('grader_name').eq('active', true).order('last_seen_at', { ascending: false }).limit(50)
    if (error || !data) return []
    return [...new Set(data.map(row => row.grader_name.trim()).filter(Boolean))]
  } catch { return [] }
}
