import { gradeDemoImage, isDemoMode, loadDemoSampleBlob } from './demoMode'
import { predictionOutcome } from './gradingPolicy'
import type { DemoOutcome, Grade, SampleType } from './kioskState'

const DEFAULT_API_URL = 'http://10.42.0.1:5000'
const DEFAULT_CAMERA_URL = 'http://10.42.0.1:8080'
const TIMEOUT_MS = 8_000
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
  const apiUrl = (localStorage.getItem('tunaeye-rpi-url') || import.meta.env.VITE_PI_API_URL || DEFAULT_API_URL).replace(/\/$/, '')
  const cameraUrl = (localStorage.getItem('tunaeye-camera-url') || import.meta.env.VITE_PI_CAMERA_URL || DEFAULT_CAMERA_URL).replace(/\/$/, '')
  return { mode: 'development-local', configured: true, apiUrl, cameraUrl, streamUrl: `${cameraUrl}/stream`, snapshotUrl: `${cameraUrl}/snapshot` } satisfies PiSettings
}

function requirePiSettings(stage: PiStage): PiSettings {
  const settings = getPiSettings()
  if (!settings.configured) throw new PiIntegrationError(stage, PI_CONNECTION_GUIDANCE)
  return settings
}

async function request(url: string, stage: PiStage, init?: RequestInit, attempts = 2): Promise<Response> {
  if (window.location.protocol === 'https:' && url.startsWith('http://')) throw new PiIntegrationError(stage, PI_CONNECTION_GUIDANCE)
  const label = stage === 'snapshot' ? 'Snapshot' : stage === 'inference' ? 'Inference' : 'Status'
  let lastError: unknown
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, { ...init, credentials: url.startsWith('https://') ? 'include' : init?.credentials, signal: AbortSignal.timeout(TIMEOUT_MS) })
      if (stage === 'inference' && response.status === 422) {
        const body = await response.json().catch(() => ({}))
        const expected = init?.body instanceof FormData && init.body.get('image_type') === 'tailcut' ? 'Tail-Cut' : 'Sashibo Core'
        const message = body?.error === 'sample_type_mismatch'
          ? `Wrong sample type. Please upload a ${expected} image.`
          : 'Sample type cannot be determined. Retake or upload another image.'
        throw new PiIntegrationError(stage, message, 422)
      }
      if (!response.ok) throw new PiIntegrationError(stage, response.status === 401 || response.status === 403
        ? `TunaEye gateway authentication failed (HTTP ${response.status}). Sign in to the gateway, then reconnect.`
        : `${label} failed: HTTP ${response.status}${stage === 'snapshot' ? '' : '.'}`, response.status)
      return response
    } catch (error) {
      if (error instanceof PiIntegrationError && error.status === 422) throw error
      lastError = error instanceof PiIntegrationError
        ? error
        : new PiIntegrationError(stage, error instanceof DOMException && error.name === 'TimeoutError'
          ? `${label} request timed out after ${TIMEOUT_MS / 1000} seconds.`
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
  const { snapshotUrl } = requirePiSettings('snapshot')
  const blob = await request(snapshotUrl, 'snapshot', undefined, 2).then(response => response.blob())
  if (!blob.type.startsWith('image/') || blob.size === 0) throw new PiIntegrationError('snapshot', 'Snapshot failed: the camera returned an invalid image.')
  return blob
}

export async function gradePiImage(blob: Blob, sample: SampleType): Promise<PiGradeResult> {
  if (isDemoMode()) return gradeDemoImage(sample)
  const { apiUrl } = requirePiSettings('inference')
  const imageType = sample === 'Tail cut' ? 'tailcut' : 'sashibocore'
  const extension = ({ 'image/png': 'png', 'image/webp': 'webp' } as Record<string, string>)[blob.type] ?? 'jpg'
  const form = new FormData()
  form.append('image_type', imageType)
  form.append('image', blob, `capture.${extension}`)
  const response = await request(`${apiUrl}/grade`, 'inference', { method: 'POST', body: form }, 2)
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
    throw new PiIntegrationError('inference', 'Inference failed: malformed prediction response.')
  }
  if (typeof data.image_type === 'string' && data.image_type !== imageType) throw new PiIntegrationError('inference', 'Inference failed: response capture type does not match the selected sample.')
  return {
    id,
    captureId,
    imageType,
    modelSource: 'raspberry-pi',
    outcome: predictionOutcome(invalid, confidence!, data.status),
    grade,
    confidence,
    rawConfidence: rawConfidence!,
    scores: Object.fromEntries(expectedScores.map(key => [key, scores![key] as number])),
  }
}
