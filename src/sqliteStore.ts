import type { GradingRecord } from './gradingRecords'
import { getCapturedEvidence } from './evidenceStorage'

let pending = Promise.resolve()
let failure: string | undefined
export async function readSqliteRecords(): Promise<GradingRecord[]> {
  const response = await fetch('/local-api/records', { cache: 'no-store', signal: AbortSignal.timeout(3000) })
  if (!response.ok) throw Error('SQLite service unavailable')
  const records = (await response.json()).records
  if (!Array.isArray(records)) throw Error('Invalid SQLite response')
  return records
}
export function queueSqliteRecords(records: GradingRecord[]) {
  if (!records.length) return
  pending = pending.then(async () => {
    try {
      for (const record of records) {
        const evidence = record.capturedImageId ? await getCapturedEvidence(record.capturedImageId) : undefined
        if (record.capturedImageId && !evidence) throw Error('Image missing; SQLite save incomplete')
        let image: string | undefined
        if (evidence) {
          const bytes = new Uint8Array(await evidence.blob.arrayBuffer())
          const chunks: string[] = []
          for (let i = 0; i < bytes.length; i += 8192) chunks.push(String.fromCharCode(...bytes.subarray(i, i + 8192)))
          image = btoa(chunks.join(''))
        }
        const response = await fetch('/local-api/records', { method: 'POST', signal: AbortSignal.timeout(8000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ record, evidence: evidence ? { ...evidence, blob: undefined, image } : undefined }) })
        if (!response.ok || (await response.json()).saved !== record.id) throw Error('SQLite service did not confirm saving')
      }
      failure = undefined
    } catch (error) { failure = error instanceof Error ? error.message : 'SQLite unavailable' }
  })
}

export async function readSqliteEvidence(id: string) {
  const response = await fetch(`/local-api/evidence/${encodeURIComponent(id)}`, { cache: 'no-store', signal: AbortSignal.timeout(3000) })
  if (!response.ok) return undefined
  const evidence = (await response.json()).evidence
  if (!evidence?.image) return undefined
  const bytes = Uint8Array.from(atob(evidence.image), char => char.charCodeAt(0))
  const { image: _image, ...metadata } = evidence
  return { ...metadata, blob: new Blob([bytes], { type: evidence.mimeType }) }
}
export async function sqliteSaveStatus(): Promise<string> {
  await pending
  return failure ? `Saved in browser only. ${failure}. Keep this browser data until SQLite backup succeeds.` : 'Saved to SQLite on this station.'
}

export const DURABLE_STATE_KEYS = [
  'tunaeye-expert-graders-v1',
  'tunaeye-admin-pin-v1',
  'tunaeye-prices',
  'tunaeye-audit-log',
  'tunaeye-station',
  'tunaeye-graders',
  'tunaeye-auto-sync',
] as const

export function queueSqliteState(key: string, value: string) {
  pending = pending.then(async () => {
    try {
      const response = await fetch('/local-api/state', {
        method: 'POST',
        signal: AbortSignal.timeout(5000),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      })
      if (!response.ok) throw Error('SQLite state backup failed')
    } catch { /* Browser storage remains active when sidecar is offline. */ }
  })
}

export async function restoreSqliteStationState(): Promise<void> {
  try {
    const response = await fetch('/local-api/state', { cache: 'no-store', signal: AbortSignal.timeout(3000) })
    if (!response.ok) return
    const state = (await response.json()).state as Record<string, string> | undefined
    if (!state || typeof state !== 'object') return
    for (const key of DURABLE_STATE_KEYS) {
      const localVal = localStorage.getItem(key)
      if (localVal === null && typeof state[key] === 'string') {
        localStorage.setItem(key, state[key])
      } else if (localVal !== null && state[key] !== localVal) {
        queueSqliteState(key, localVal)
      }
    }
  } catch { /* Sidecar offline — browser storage continues operating normally. */ }
}
