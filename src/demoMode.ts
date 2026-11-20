import type { DemoOutcome, Grade, SampleType } from './kioskState'
import type { PiGradeResult } from './piClient'
import { createId } from './id'

const DEMO_FLAG = 'tunaeye-demo-mode'
const DEMO_SESSION = 'tunaeye-demo-session'
const gradeHints = new Map<SampleType, Grade>()
const demoAvailable = import.meta.env.VITE_DEMO_MODE === 'true'
let enabled = false

export function demoCanStart() {
  return demoAvailable || import.meta.env.DEV
}

export type DemoScenario =
  | 'confident'
  | 'needs-tail'
  | 'core-uncertain-tail-a'
  | 'core-uncertain-tail-c'
  | 'no-tail-provisional'
  | 'borderline-75'
  | 'needs-expert'
  | 'tail-uncertain-expert'
  | 'grade-b'
  | 'grade-c'
  | 'invalid-core'
  | 'invalid-tail'

const scenarioTable: Record<DemoScenario, Record<SampleType, { grade: Grade; confidence: number }>> = {
  confident: {
    'Sashibo core': { grade: 'A', confidence: 96.3 },
    'Tail cut': { grade: 'A', confidence: 94.1 },
  },
  'needs-tail': {
    'Sashibo core': { grade: 'C', confidence: 74.2 },
    'Tail cut': { grade: 'B', confidence: 91.4 },
  },
  'core-uncertain-tail-a': {
    'Sashibo core': { grade: 'B', confidence: 71.5 },
    'Tail cut': { grade: 'A', confidence: 93.8 },
  },
  'core-uncertain-tail-c': {
    'Sashibo core': { grade: 'B', confidence: 72.4 },
    'Tail cut': { grade: 'C', confidence: 89.2 },
  },
  'no-tail-provisional': {
    'Sashibo core': { grade: 'B', confidence: 72.0 },
    'Tail cut': { grade: 'B', confidence: 72.0 },
  },
  'borderline-75': {
    'Sashibo core': { grade: 'B', confidence: 75.5 },
    'Tail cut': { grade: 'B', confidence: 88.0 },
  },
  'needs-expert': {
    'Sashibo core': { grade: 'B', confidence: 68.1 },
    'Tail cut': { grade: 'C', confidence: 66.4 },
  },
  'tail-uncertain-expert': {
    'Sashibo core': { grade: 'A', confidence: 73.2 },
    'Tail cut': { grade: 'B', confidence: 71.8 },
  },
  'grade-b': { 'Sashibo core': { grade: 'B', confidence: 94 }, 'Tail cut': { grade: 'B', confidence: 94 } },
  'grade-c': { 'Sashibo core': { grade: 'C', confidence: 94 }, 'Tail cut': { grade: 'C', confidence: 94 } },
  'invalid-core': { 'Sashibo core': { grade: 'A', confidence: 97 }, 'Tail cut': { grade: 'A', confidence: 94 } },
  'invalid-tail': { 'Sashibo core': { grade: 'C', confidence: 74.2 }, 'Tail cut': { grade: 'A', confidence: 97 } },
}

let scenario: DemoScenario = 'confident'

export function demoScenarios() {
  return [
    { id: 'confident' as const, label: 'Sashibo accepts', detail: '96.3% Grade A — print immediately' },
    { id: 'needs-tail' as const, label: 'Tail cut needed', detail: 'Core 74.2% C -> Tail 91.4% B' },
    { id: 'core-uncertain-tail-a' as const, label: 'Tail upgrades to A', detail: 'Core 71.5% B -> Tail 93.8% A' },
    { id: 'core-uncertain-tail-c' as const, label: 'Tail confirms C', detail: 'Core 72.4% B -> Tail 89.2% C' },
    { id: 'no-tail-provisional' as const, label: 'No tail cut (Provisional)', detail: 'Core 72% B — choose No Tail-Cut' },
    { id: 'borderline-75' as const, label: 'Borderline 75% pass', detail: '75.5% B — passes without Tail-Cut' },
    { id: 'needs-expert' as const, label: 'Expert needed', detail: 'Both under 75% — override required' },
    { id: 'tail-uncertain-expert' as const, label: 'Tail also uncertain', detail: 'Core 73.2% A -> Tail 71.8% B' },
    { id: 'grade-b' as const, label: 'Grade B', detail: 'Confident Grade B (94%)' },
    { id: 'grade-c' as const, label: 'Grade C', detail: 'Confident Grade C (94%)' },
    { id: 'invalid-core' as const, label: 'Invalid core', detail: 'Retake required' },
    { id: 'invalid-tail' as const, label: 'Invalid tail cut', detail: 'Supplementary image rejected' },
  ]
}

export function getDemoScenario() {
  return scenario
}

export function setDemoScenario(next: DemoScenario) {
  scenario = next
  gradeHints.clear()
}

export function demoScenarioLabel(id: DemoScenario) {
  return demoScenarios().find(item => item.id === id)?.label ?? id
}

export function initDemoMode() {
  if (typeof window === 'undefined') return
  const params = new URLSearchParams(window.location.search)
  const requested = params.get('demo') === '1'
  const stored = localStorage.getItem(DEMO_FLAG) === '1'

  if (!demoAvailable) {
    enabled = import.meta.env.DEV && sessionStorage.getItem(DEMO_SESSION) === '1'
    localStorage.removeItem(DEMO_FLAG)
    return
  }

  enabled = true
  localStorage.setItem(DEMO_FLAG, '1')
  if (!requested && !stored) return
}

export function startPresentationDemo() {
  if (!demoCanStart() || typeof window === 'undefined') return false
  enabled = true
  sessionStorage.setItem(DEMO_SESSION, '1')
  return true
}

export function stopPresentationDemo() {
  if (demoAvailable || typeof window === 'undefined') return
  enabled = false
  sessionStorage.removeItem(DEMO_SESSION)
}

export function isDemoMode() {
  return enabled
}

// Explicit kiosk control; never enabled by a failed camera or inference request.
export function setKioskDemoMode(value: boolean) {
  enabled = value
}

export function demoAssetPath(sample: SampleType, grade: Grade) {
  const prefix = sample === 'Tail cut' ? 'TAILCUT' : 'SASHIBOCORE'
  return `/DEMO_SAMPLES/${prefix}_${grade}.png`
}

export function defaultDemoGrade(sampleIndex: number): Grade {
  return (['A', 'B', 'C'] as Grade[])[Math.min(sampleIndex, 2)] ?? 'A'
}

export function parseDemoGradeFromFilename(filename: string): Grade | null {
  const match = filename.toUpperCase().match(/(?:SASHIBOCORE|TAILCUT)_([ABC])\.(?:PNG|JPG|JPEG|WEBP)$/)
  return match ? (match[1] as Grade) : null
}

export function setDemoGradeHint(sample: SampleType, grade: Grade) {
  gradeHints.set(sample, grade)
}

function demoScores(grade: Grade): Record<string, number> {
  const base = grade === 'A' ? 0.96 : grade === 'B' ? 0.91 : 0.78
  return {
    GRADE_A: grade === 'A' ? base : 0.04,
    GRADE_B: grade === 'B' ? base : 0.03,
    GRADE_C: grade === 'C' ? base : 0.02,
    INVALID: 0.01,
  }
}

export async function loadDemoSampleBlob(sample: SampleType, sampleIndex: number): Promise<Blob> {
  const grade = gradeHints.get(sample) ?? scenarioTable[scenario][sample].grade
  try {
    const response = await fetch(demoAssetPath(sample, grade))
    if (response.ok) return await response.blob()
  } catch { /* Offline or disconnected from station host: fall back to generated canvas blob */ }
  const canvas = document.createElement('canvas')
  canvas.width = 320; canvas.height = 200
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = sample === 'Tail cut' ? '#7f1d1d' : '#991b1b'
  ctx.fillRect(0, 0, 320, 200)
  const fallback = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9))
  if (fallback) return fallback
  throw new Error(`Demo sample missing: ${demoAssetPath(sample, grade)}`)
}

export function getDemoPreviewUrl(sample: SampleType, sampleIndex: number) {
  return demoAssetPath(sample, defaultDemoGrade(sampleIndex))
}

export async function gradeDemoImage(sample: SampleType): Promise<PiGradeResult> {
  await new Promise(resolve => window.setTimeout(resolve, 700))
  const preset = scenarioTable[scenario][sample]
  if ((scenario === 'invalid-core' && sample === 'Sashibo core') || (scenario === 'invalid-tail' && sample === 'Tail cut')) return {
    id: `demo-${createId()}`, captureId: `demo-capture-${createId()}`, imageType: sample === 'Tail cut' ? 'tailcut' : 'sashibocore', modelSource: 'demo', outcome: 'invalid', grade: null, confidence: 97, rawConfidence: .97, scores: { GRADE_A: .01, GRADE_B: .01, GRADE_C: .01, INVALID: .97 },
  }
  const hinted = gradeHints.get(sample)
  const grade = hinted ?? preset.grade
  const confidence = hinted ? (grade === 'A' ? 96.3 : grade === 'B' ? 91.2 : 74.2) : preset.confidence
  const outcome: DemoOutcome = confidence < 70 ? 'uncertain' : 'valid'
  return {
    id: `demo-${createId()}`,
    captureId: `demo-capture-${createId()}`,
    imageType: sample === 'Tail cut' ? 'tailcut' : 'sashibocore',
    modelSource: 'demo',
    outcome,
    grade,
    confidence,
    rawConfidence: confidence / 100,
    scores: demoScores(grade),
  }
}
