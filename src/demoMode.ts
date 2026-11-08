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

export type DemoScenario = 'confident' | 'needs-tail' | 'needs-expert'

const scenarioTable: Record<DemoScenario, Record<SampleType, { grade: Grade; confidence: number }>> = {
  confident: {
    'Sashibo core': { grade: 'A', confidence: 96.3 },
    'Tail cut': { grade: 'A', confidence: 94.1 },
  },
  'needs-tail': {
    'Sashibo core': { grade: 'C', confidence: 74.2 },
    'Tail cut': { grade: 'B', confidence: 91.4 },
  },
  'needs-expert': {
    'Sashibo core': { grade: 'B', confidence: 68.1 },
    'Tail cut': { grade: 'C', confidence: 66.4 },
  },
}

let scenario: DemoScenario = 'confident'

export function demoScenarios() {
  return [
    { id: 'confident' as const, label: 'Sashibo accepts', detail: '96% — print immediately' },
    { id: 'needs-tail' as const, label: 'Tail cut needed', detail: '74% then 91% — blended grade' },
    { id: 'needs-expert' as const, label: 'Expert needed', detail: 'Both under 80%' },
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
  const grade = defaultDemoGrade(sampleIndex)
  setDemoGradeHint(sample, grade)
  const response = await fetch(demoAssetPath(sample, grade))
  if (!response.ok) throw new Error(`Demo sample missing: ${demoAssetPath(sample, grade)}`)
  return response.blob()
}

export function getDemoPreviewUrl(sample: SampleType, sampleIndex: number) {
  return demoAssetPath(sample, defaultDemoGrade(sampleIndex))
}

export async function gradeDemoImage(sample: SampleType): Promise<PiGradeResult> {
  await new Promise(resolve => window.setTimeout(resolve, 700))
  const preset = scenarioTable[scenario][sample]
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
