import { gradeDemoImage, isDemoMode, loadDemoSampleBlob } from './demoMode'
import { predictionOutcome } from './gradingPolicy'
import type { DemoOutcome, Grade, SampleType } from './kioskState'

const DEFAULT_API_URL = 'http://10.42.0.1:5000'
const DEFAULT_CAMERA_URL = 'http://10.42.0.1:8080'
const STATUS_TIMEOUT_MS = 2_500
const SNAPSHOT_TIMEOUT_MS = 3_000
export const PI_CONNECTION_GUIDANCE = 'Connect to the TunaRpi Wi-Fi and open http://10.42.0.1:5000, or configure an authenticated HTTPS TunaEye gateway.'

export type PiDeploymentMode = 'pi-local' | 'hosted-gateway' | 'development-local' | 'unconfigured'

export interface PiSettings {
  mode: PiDeploymentMode
  configured: boolean
  apiUrl: string
  cameraUrl: string
  streamUrl: string
  snapshotUrl: string
}

export interface PiGradeResult {
  id: string
  captureId: string
  imageType: 'sashibocore' | 'tailcut'
  modelSource: 'raspberry-pi' | 'demo'
  outcome: DemoOutcome
  grade: Grade | null
  confidence: number | null
  rawConfidence: number
  scores: Record<string, number>
}

export interface PiStatusResponse {
  status?: string
  service?: string
  version?: string
  model?: string
  models?: { sashibocore?: boolean; tailcut?: boolean }
  classes?: string[]
}

type PiStage = 'status' | 'snapshot' | 'inference'

export class PiIntegrationError extends Error {
  constructor(public stage: PiStage, message: string, public status?: number, options?: ErrorOptions) {
    super(message, options)
    this.name = 'PiIntegrationError'
  }
}

export const getPiSettings = () => {
  if (import.meta.env.VITE_PI_LOCAL_HOSTED === 'true') {
    return { mode: 'pi-local', configured: true, apiUrl: '', cameraUrl: '', streamUrl: '/stream', snapshotUrl: '/snapshot' } satisfies PiSettings
  }
  const configuredGateway = import.meta.env.VITE_PI_GATEWAY_URL?.trim().replace(/\/$/, '')
  const savedGateway = localStorage.getItem('tunaeye-rpi-url')?.trim().replace(/\/$/, '')
  const gatewayUrl = configuredGateway || (savedGateway?.startsWith('https://') ? savedGateway : '')
  if (configuredGateway || window.location.protocol === 'https:') {
    if (!gatewayUrl?.startsWith('https://')) return { mode: 'unconfigured', configured: false, apiUrl: '', cameraUrl: '', streamUrl: '', snapshotUrl: '' } satisfies PiSettings
    return { mode: 'hosted-gateway', configured: true, apiUrl: gatewayUrl, cameraUrl: gatewayUrl, streamUrl: `${gatewayUrl}/stream`, snapshotUrl: `${gatewayUrl}/snapshot` } satisfies PiSettings
  }
  const isLocalLoopback = ['localhost', '127.0.0.1', '127.0.0.2'].includes(window.location.hostname)
  const hostDefaultApi = window.location.protocol === 'http:' && !isLocalLoopback && window.location.hostname
    ? `http://${window.location.hostname}:5000`
    : (import.meta.env.VITE_PI_API_URL || DEFAULT_API_URL)
  const hostDefaultCamera = window.location.protocol === 'http:' && !isLocalLoopback && window.location.hostname
    ? `http://${window.location.hostname}:8080`
    : (import.meta.env.VITE_PI_CAMERA_URL || DEFAULT_CAMERA_URL)
  const apiUrl = (localStorage.getItem('tunaeye-rpi-url') || hostDefaultApi).replace(/\/$/, '')
  const cameraUrl = (localStorage.getItem('tunaeye-camera-url') || hostDefaultCamera).replace(/\/$/, '')
  return { mode: 'development-local', configured: true, apiUrl, cameraUrl, streamUrl: `${cameraUrl}/stream`, snapshotUrl: `${cameraUrl}/snapshot` } satisfies PiSettings
}

function requirePiSettings(stage: PiStage): PiSettings {
  const settings = getPiSettings()
  if (!settings.configured) throw new PiIntegrationError(stage, PI_CONNECTION_GUIDANCE)
  return settings
}

function extractErrorDetail(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed || trimmed.startsWith('<')) return ''
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>
    for (const key of ['message', 'detail', 'error']) {
      const value = parsed?.[key]
      if (typeof value === 'string' && value.trim()) return value.trim().slice(0, 180)
    }
    return ''
  } catch {
    return trimmed.slice(0, 180)
  }
}

async function detectImageMimeType(blob: Blob): Promise<string | null> {
  if (blob.type.startsWith('image/')) return blob.type
  const header = new Uint8Array(await blob.slice(0, 12).arrayBuffer())
  if (header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) return 'image/jpeg'
  if (header.length >= 4 && header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47) return 'image/png'
  if (
    header.length >= 12 &&
    header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46 &&
    header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50
  ) return 'image/webp'
  return null
}

async function request(url: string, stage: PiStage, init?: RequestInit, attempts = 1): Promise<Response> {
  if (window.location.protocol === 'https:' && url.startsWith('http://')) throw new PiIntegrationError(stage, PI_CONNECTION_GUIDANCE)
  const label = stage === 'snapshot' ? 'Snapshot' : stage === 'inference' ? 'Inference' : 'Status'
  const timeoutMs = stage === 'status' ? STATUS_TIMEOUT_MS : stage === 'snapshot' ? SNAPSHOT_TIMEOUT_MS : null
  let lastError: unknown
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const signal = init?.signal ?? (timeoutMs !== null ? AbortSignal.timeout(timeoutMs) : undefined)
      const response = await fetch(url, { ...init, credentials: url.startsWith('https://') ? 'include' : init?.credentials, signal })
      if (stage === 'inference' && response.status === 422) {
        const body = await response.json().catch(() => ({}))
        const expected = init?.body instanceof FormData && init.body.get('image_type') === 'tailcut' ? 'Tail-Cut' : 'Sashibo Core'
        const message = body?.error === 'sample_type_mismatch'
          ? `Wrong sample type. Please upload a ${expected} image.`
          : 'Sample type cannot be determined. Retake or upload another image.'
        console.warn('[TunaEye] inference 422', { url, error: body?.error ?? 'unknown' })
        throw new PiIntegrationError(stage, message, 422)
      }
      if (!response.ok) {
        const rawBody = await response.text().catch(() => '')
        const detail = extractErrorDetail(rawBody)
        console.warn('[TunaEye] HTTP error', { stage, url, status: response.status, detail: detail || undefined })
        if (response.status === 401 || response.status === 403) {
          throw new PiIntegrationError(stage, `TunaEye gateway authentication failed (HTTP ${response.status}). Sign in to the gateway, then reconnect.`, response.status)
        }
        const suffix = detail ? `: ${detail}` : stage === 'snapshot' ? '' : '.'
        throw new PiIntegrationError(stage, `${label} failed: HTTP ${response.status}${suffix}`, response.status)
      }
      return response
    } catch (error) {
      if (error instanceof PiIntegrationError && error.status === 422) throw error
      lastError = error instanceof PiIntegrationError
        ? error
        : new PiIntegrationError(stage, error instanceof DOMException && error.name === 'TimeoutError'
          ? `${label} request timed out after ${(timeoutMs ?? 0) / 1000} seconds.`
          : `${label} request failed. ${url.startsWith('https://') ? 'Check gateway authentication, CORS, and Private Network Access.' : 'Check the configured URL and browser CORS.'}`, undefined, { cause: error })
      if (attempt + 1 < attempts) await new Promise(resolve => setTimeout(resolve, 350 * (attempt + 1)))
    }
  }
  throw lastError
}

export async function checkPiHealth(apiUrl = getPiSettings().apiUrl): Promise<PiStatusResponse> {
  if (!apiUrl) apiUrl = requirePiSettings('status').apiUrl
  apiUrl = apiUrl.replace(/\/$/, '')
  const response = await request(`${apiUrl}/status`, 'status', undefined, 3)
  try {
    const data = await response.json() as unknown
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Expected an object.')
    return data as PiStatusResponse
  } catch (error) {
    throw new PiIntegrationError('status', 'Status failed: malformed JSON response.', undefined, { cause: error })
  }
}

export async function capturePiImage(sample?: SampleType, sampleIndex = 0): Promise<Blob> {
  if (isDemoMode() && sample) return loadDemoSampleBlob(sample, sampleIndex)
  const { apiUrl, snapshotUrl } = requirePiSettings('snapshot')
  let usedUrl = snapshotUrl
  let blob: Blob
  try {
    blob = await request(snapshotUrl, 'snapshot', { cache: 'no-store' }, 2).then(response => response.blob())
  } catch (error) {
    const fallbackUrl = apiUrl ? `${apiUrl}/snapshot` : ''
    const canFallback = Boolean(fallbackUrl)
      && error instanceof PiIntegrationError
      && error.status === undefined
      && new URL(snapshotUrl, window.location.href).origin !== new URL(fallbackUrl, window.location.href).origin
    if (!canFallback) throw error
    console.warn('[TunaEye] primary snapshot failed, trying API proxy fallback', { snapshotUrl, fallbackUrl })
    usedUrl = fallbackUrl
    try {
      blob = await request(fallbackUrl, 'snapshot', { cache: 'no-store' }, 1).then(response => response.blob())
    } catch {
      throw error
    }
  }
  if (blob.size === 0) throw new PiIntegrationError('snapshot', 'Snapshot failed: the camera returned an empty image.')
  const mimeType = await detectImageMimeType(blob)
  if (!mimeType) throw new PiIntegrationError('snapshot', 'Snapshot failed: the camera returned an invalid image.')
  const normalized = blob.type === mimeType ? blob : new Blob([blob], { type: mimeType })
  console.info('[TunaEye] snapshot captured', { url: usedUrl, size: normalized.size, type: normalized.type })
  return normalized
}

export async function gradePiImage(blob: Blob, sample: SampleType): Promise<PiGradeResult> {
  if (isDemoMode()) return gradeDemoImage(sample)
  const { apiUrl } = requirePiSettings('inference')
  const imageType = sample === 'Tail cut' ? 'tailcut' : 'sashibocore'
  const extension = ({ 'image/png': 'png', 'image/webp': 'webp' } as Record<string, string>)[blob.type] ?? 'jpg'
  const form = new FormData()
  form.append('image_type', imageType)
  form.append('image', blob, `capture.${extension}`)
  const gradeUrl = `${apiUrl}/grade`
  const response = await request(gradeUrl, 'inference', { method: 'POST', body: form }, 1)
  let data: Record<string, unknown>
  try {
    const parsed = await response.json() as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Expected an object.')
    data = parsed as Record<string, unknown>
  } catch (error) {
    throw new PiIntegrationError('inference', 'Inference failed: malformed JSON response.', undefined, { cause: error })
  }
  const rawGrade = typeof data.grade === 'string' ? data.grade : ''
  const grade = ({ GRADE_A: 'A', GRADE_B: 'B', GRADE_C: 'C', A: 'A', B: 'B', C: 'C' } as Record<string, Grade>)[rawGrade] ?? null
  const rawConfidence = typeof data.confidence === 'number' ? data.confidence : null
  const confidence = rawConfidence === null ? null : Math.round((rawConfidence <= 1 ? rawConfidence * 100 : rawConfidence) * 100) / 100
  const invalid = rawGrade === 'INVALID'
  const scores = data.scores && typeof data.scores === 'object' && !Array.isArray(data.scores) ? data.scores as Record<string, unknown> : null
  const expectedScores = ['GRADE_A', 'GRADE_B', 'GRADE_C', 'INVALID']
  const validScores = scores && expectedScores.every(key => typeof scores[key] === 'number' && Number.isFinite(scores[key]))
  const id = typeof data.id === 'string' ? data.id.trim() : ''
  const captureId = typeof data.capture_id === 'string' ? data.capture_id.trim() : ''
  if ((!invalid && !grade) || confidence === null || !Number.isFinite(confidence) || confidence < 0 || confidence > 100 || !validScores || !id || !captureId) {
    console.warn('[TunaEye] malformed prediction response', { url: gradeUrl, imageType, rawGrade, hasScores: Boolean(validScores), hasIds: Boolean(id && captureId) })
    throw new PiIntegrationError('inference', 'Inference failed: malformed prediction response.')
  }
  if (typeof data.image_type === 'string' && data.image_type !== imageType) throw new PiIntegrationError('inference', 'Inference failed: response capture type does not match the selected sample.')
  const outcome = predictionOutcome(invalid, confidence!, data.status)
  console.info('[TunaEye] inference complete', { url: gradeUrl, imageType, blobSize: blob.size, grade: rawGrade, confidence, outcome })
  return {
    id,
    captureId,
    imageType,
    modelSource: 'raspberry-pi',
    outcome,
    grade,
    confidence,
    rawConfidence: rawConfidence!,
    scores: Object.fromEntries(expectedScores.map(key => [key, scores![key] as number])),
  }
}
