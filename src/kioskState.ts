import { experimentalPolicy, meetsExperimentalPolicy, policyDescription } from './gradingPolicy'

export type Screen =
  | 'welcome'
  | 'select-role'
  | 'admin'
  | 'admin-dashboard'
  | 'grader'
  | 'grader-dashboard'
  | 'sample'
  | 'association'
  | 'tutorial'
  | 'weight'
  | 'camera'
  | 'review'
  | 'analysis'
  | 'individual-result'
  | 'overview'
  | 'print'
  | 'complete'

export type Role = 'admin' | 'expert'
export type SampleType = 'Sashibo core' | 'Tail cut'
export type Grade = 'A' | 'B' | 'C'
export type DemoOutcome = 'valid' | 'uncertain' | 'invalid'
export type SameFish = 'same' | 'different' | null

export interface SampleResult {
  sample: SampleType
  fishId: string
  status: DemoOutcome
  originalGrade: Grade | null
  originalConfidence: number | null
  rawConfidence?: number
  overrideGrade: Grade | null
  overrideReason: string
  overrideActor?: string
  overrideAt?: string
  captured: boolean
  weight: string
  inferenceId?: string
  captureId?: string
  scores?: Record<string, number>
  imageType?: 'sashibocore' | 'tailcut'
  modelSource?: 'raspberry-pi' | 'demo'
  tailAvailability?: 'available' | 'not_available'
  provisional?: boolean
  reviewStatus?: 'confirmed' | 'manual_review' | 'provisional_review'
}

export interface Session {
  screen: Screen
  role: Role | null
  graderName: string
  rememberName: boolean
  selectedSamples: SampleType[]
  sameFish: SameFish
  fishWeights: Record<string, string>
  tutorialStep: number
  currentSampleIndex: number
  demoOutcome: DemoOutcome
  tailAvailability?: 'pending' | 'available' | 'not_available'
  results: Partial<Record<SampleType, SampleResult>>
  adminPin: string
  adminError: string
  adminAuthenticated: boolean
  printIndex: number
  printedSamples: SampleType[]
}

export const sampleOrder: SampleType[] = ['Sashibo core', 'Tail cut']
export const ACCEPT_CONFIDENCE = 75

export type GradeSource = 'sashibo' | 'combined' | 'expert' | 'tail-needed' | 'expert-needed' | 'retake' | 'pending'

export interface FinalDecision {
  grade: Grade | null
  confidence: number | null
  source: GradeSource
  title: string
  detail: string
  provisional?: boolean
  reviewFlagged?: boolean
  next: 'print' | 'tail' | 'override' | 'retake' | 'wait'
}

export function isAccepted(result: SampleResult | number | null | undefined) {
  if (experimentalPolicy) return typeof result === 'object' && result !== null && meetsExperimentalPolicy(result)
  if (typeof result === 'object' && result !== null) {
    return result.status !== 'invalid' && result.originalGrade !== null && typeof result.originalConfidence === 'number' && result.originalConfidence >= ACCEPT_CONFIDENCE
  }
  return typeof result === 'number' && Number.isFinite(result) && result >= ACCEPT_CONFIDENCE
}

export function combineGrades(sashibo: SampleResult, tail: SampleResult): { grade: Grade } {
  const keys = ['GRADE_A', 'GRADE_B', 'GRADE_C'] as const
  const labels: Grade[] = ['A', 'B', 'C']
  const hasScores = keys.every(key => typeof sashibo.scores?.[key] === 'number' && typeof tail.scores?.[key] === 'number')
  if (hasScores) {
    const blended = keys.map(key => ((sashibo.scores?.[key] ?? 0) + (tail.scores?.[key] ?? 0)) / 2)
    const winner = blended.reduce((best, value, index) => value > blended[best] ? index : best, 0)
    return { grade: labels[winner] }
  }
  const points: Record<Grade, number> = { A: 3, B: 2, C: 1 }
  const sashiboConfidence = sashibo.originalConfidence ?? 0
  const tailConfidence = tail.originalConfidence ?? 0
  const weight = sashiboConfidence + tailConfidence || 1
  const score = ((points[sashibo.originalGrade ?? 'C'] * sashiboConfidence) + (points[tail.originalGrade ?? 'C'] * tailConfidence)) / weight
  return { grade: score >= 2.5 ? 'A' : score >= 1.5 ? 'B' : 'C' }
}

export function decisionFor(state: Session): FinalDecision {
  const sashibo = state.results['Sashibo core']
  const tail = state.results['Tail cut']
  const provisional = state.tailAvailability === 'not_available' || Boolean(sashibo?.provisional)
  if (!sashibo) return { grade: null, confidence: null, source: 'pending', title: 'Capture the sashibo core', detail: 'Sashibo core is the main sample for this fish.', next: 'wait' }
  if (sashibo.status === 'invalid') return { grade: null, confidence: sashibo.originalConfidence, source: 'retake', title: 'Retake the sashibo core', detail: 'This image cannot be graded. Capture it again inside the guide.', next: 'retake' }
  if (tail?.overrideGrade) return { grade: tail.overrideGrade, confidence: tail.originalConfidence, source: 'expert', title: `Grade ${tail.overrideGrade}`, detail: 'An authorized grader confirmed the final grade after review.', provisional: false, next: 'print' }
  if (sashibo.overrideGrade) return { grade: sashibo.overrideGrade, confidence: sashibo.originalConfidence, source: 'expert', title: provisional ? `Grade ${sashibo.overrideGrade} (Provisional)` : `Grade ${sashibo.overrideGrade}`, detail: provisional ? 'Provisional Sashibo-only assessment confirmed by an authorized grader (Tail-Cut not available).' : 'An authorized grader confirmed the final grade.', provisional, next: 'print' }
  if (provisional && !tail) {
    if (sashibo.originalGrade && (sashibo.originalConfidence ?? 0) >= 60) {
      return { grade: sashibo.originalGrade, confidence: sashibo.originalConfidence, source: 'sashibo', title: `Grade ${sashibo.originalGrade} (Provisional)`, detail: `Sashibo Core is Grade ${sashibo.originalGrade} (${sashibo.originalConfidence ?? '—'}%). Tail-Cut is not available.`, provisional: true, next: 'print' }
    }
    return { grade: sashibo.originalGrade ?? 'C', confidence: sashibo.originalConfidence, source: 'expert-needed', title: `Grade ${sashibo.originalGrade ?? 'C'} (Provisional)`, detail: `Sashibo Core confidence is very low (${sashibo.originalConfidence ?? '—'}%) and Tail-Cut is not available. Flagged for manual override by a registered expert grader.`, provisional: true, reviewFlagged: true, next: 'print' }
  }
  if (!tail) {
    if (isAccepted(sashibo) && sashibo.originalGrade && sashibo.originalGrade !== 'C') {
      return { grade: sashibo.originalGrade, confidence: sashibo.originalConfidence, source: 'sashibo', title: `Grade ${sashibo.originalGrade}`, detail: `Sashibo Core is Grade ${sashibo.originalGrade} (${sashibo.originalConfidence ?? '—'}%) above the ${ACCEPT_CONFIDENCE}% confidence threshold. Tail-Cut not required.`, next: 'print' }
    }
    const lowGradeC = sashibo.originalGrade === 'C' && isAccepted(sashibo)
    return {
      grade: sashibo.originalGrade,
      confidence: sashibo.originalConfidence,
      source: 'tail-needed',
      title: 'Is a Tail-Cut sample available?',
      detail: lowGradeC
        ? `Sashibo Core is Grade C (${sashibo.originalConfidence ?? '—'}%). Scan Tail-Cut to verify or lift the grade, or continue provisionally.`
        : `Sashibo Core confidence is below ${ACCEPT_CONFIDENCE}% (${sashibo.originalConfidence ?? '—'}%). Scan Tail-Cut if available, or continue provisionally.`,
      next: 'tail'
    }
  }
  if (tail.status === 'invalid') return { grade: null, confidence: tail.originalConfidence, source: 'retake', title: 'Retake the tail cut', detail: 'This tail-cut image cannot be graded. Capture it again inside the guide.', next: 'retake' }
  const avgConfidence = ((sashibo.originalConfidence ?? 0) + (tail.originalConfidence ?? 0)) / 2
  const bothBelowThreshold = !isAccepted(sashibo) && !isAccepted(tail)
  const severeDisagreement = Boolean(sashibo.originalGrade && tail.originalGrade && ((sashibo.originalGrade === 'A' && tail.originalGrade === 'C') || (sashibo.originalGrade === 'C' && tail.originalGrade === 'A')))
  if (bothBelowThreshold || avgConfidence < ACCEPT_CONFIDENCE || severeDisagreement) {
    const predicted = sashibo.originalGrade && tail.originalGrade ? combineGrades(sashibo, tail).grade : (sashibo.originalGrade ?? tail.originalGrade ?? 'B')
    const reason = severeDisagreement
      ? `Severe model disagreement: Sashibo Core (Grade ${sashibo.originalGrade}, ${sashibo.originalConfidence ?? '—'}%) vs Tail-Cut (Grade ${tail.originalGrade}, ${tail.originalConfidence ?? '—'}%).`
      : `Combined confidence (${avgConfidence.toFixed(1)}%) is below the ${ACCEPT_CONFIDENCE}% threshold (Core ${sashibo.originalConfidence ?? '—'}%, Tail ${tail.originalConfidence ?? '—'}%).`
    return { grade: predicted, confidence: Math.round(avgConfidence * 10) / 10, source: 'expert-needed', title: `Grade ${predicted}`, detail: `${reason} Flagged for manual override by a registered expert grader.`, reviewFlagged: true, next: 'print' }
  }
  if (sashibo.originalGrade && tail.originalGrade) {
    if (sashibo.originalGrade === tail.originalGrade) {
      return { grade: sashibo.originalGrade, confidence: sashibo.originalConfidence, source: 'combined', title: `Grade ${sashibo.originalGrade}`, detail: `Sashibo Core (${sashibo.originalGrade}, ${sashibo.originalConfidence ?? '—'}%) and Tail-Cut (${tail.originalGrade}, ${tail.originalConfidence ?? '—'}%) agree.`, next: 'print' }
    }
    const combined = combineGrades(sashibo, tail)
    return { grade: combined.grade, confidence: tail.originalConfidence, source: 'combined', title: `Grade ${combined.grade}`, detail: `Combined Sashibo Core (${sashibo.originalGrade}, ${sashibo.originalConfidence ?? '—'}%) and Tail-Cut (${tail.originalGrade}, ${tail.originalConfidence ?? '—'}%) to Grade ${combined.grade}.`, next: 'print' }
  }
  return { grade: sashibo.originalGrade ?? tail.originalGrade ?? 'B', confidence: tail.originalConfidence, source: 'expert-needed', title: `Grade ${sashibo.originalGrade ?? tail.originalGrade ?? 'B'}`, detail: 'Flagged for manual override by a registered expert grader.', reviewFlagged: true, next: 'print' }
}

export const initialSession: Session = {
  screen: 'welcome',
  role: null,
  graderName: typeof window !== 'undefined' ? (localStorage.getItem('tunaeye-grader-name') ?? 'Maria Santos') : 'Maria Santos',
  rememberName: true,
  selectedSamples: ['Sashibo core'],
  sameFish: 'same',
  fishWeights: {},
  tutorialStep: 0,
  currentSampleIndex: 0,
  demoOutcome: 'valid',
  results: {},
  adminPin: '',
  adminError: '',
  adminAuthenticated: false,
  printIndex: 0,
  printedSamples: [],
}

export type Action =
  | { type: 'navigate'; screen: Screen }
  | { type: 'setRole'; role: Role }
  | { type: 'setGraderName'; value: string }
  | { type: 'setRememberName'; value: boolean }
  | { type: 'setSamples'; samples: SampleType[] }
  | { type: 'setSameFish'; value: Exclude<SameFish, null> }
  | { type: 'setFishWeight'; fishId: string; value: string }
  | { type: 'setTutorialStep'; step: number }
  | { type: 'setDemoOutcome'; outcome: DemoOutcome }
  | { type: 'setTailAvailability'; value: 'available' | 'not_available' }
  | { type: 'captured' }
  | { type: 'startAnalysis' }
  | { type: 'finishAnalysis'; outcome: DemoOutcome; grade?: Grade | null; confidence?: number | null; rawConfidence?: number; inferenceId?: string; captureId?: string; scores?: Record<string, number>; imageType?: 'sashibocore' | 'tailcut'; modelSource?: 'raspberry-pi' | 'demo' }
  | { type: 'setAdminPin'; value: string }
  | { type: 'adminError'; message: string }
  | { type: 'adminAuthenticated' }
  | { type: 'setOverride'; sample: SampleType; grade: Grade; reason: string; actor?: string; timestamp?: string }
  | { type: 'nextSample' }
  | { type: 'requestTail' }
  | { type: 'startPrinting' }
  | { type: 'printed'; sample: SampleType }
  | { type: 'gradeAnother' }
  | { type: 'reset' }

function fishForSample(sample: SampleType, sameFish: SameFish): string {
  return sameFish === 'different' ? (sample === 'Sashibo core' ? 'Fish 1' : 'Fish 2') : 'Fish 1'
}

function resultFor(state: Session, sample: SampleType): SampleResult | undefined {
  return state.results[sample]
}

export function currentSample(state: Session): SampleType {
  return state.selectedSamples[state.currentSampleIndex] ?? state.selectedSamples[0] ?? 'Sashibo core'
}

export function fishIdForSample(state: Session, sample: SampleType): string {
  return fishForSample(sample, state.sameFish)
}

export function weightForSample(state: Session, sample: SampleType): string {
  return state.fishWeights[fishForSample(sample, state.sameFish)] ?? ''
}

export function reducer(state: Session, action: Action): Session {
  switch (action.type) {
    case 'navigate':
      return { ...state, screen: action.screen }
    case 'setRole':
      return { ...state, role: action.role }
    case 'setGraderName':
      return { ...state, graderName: action.value }
    case 'setRememberName':
      return { ...state, rememberName: action.value }
    case 'setSamples':
      return { ...state, selectedSamples: action.samples, currentSampleIndex: 0 }
    case 'setSameFish':
      return { ...state, sameFish: action.value }
    case 'setFishWeight':
      return { ...state, fishWeights: { ...state.fishWeights, [action.fishId]: action.value } }
    case 'setTutorialStep':
      return { ...state, tutorialStep: action.step }
    case 'setDemoOutcome':
      return { ...state, demoOutcome: action.outcome }
    case 'setTailAvailability': {
      const sashibo = state.results['Sashibo core']
      const provisional = action.value === 'not_available'
      return {
        ...state,
        tailAvailability: action.value,
        results: sashibo ? {
          ...state.results,
          'Sashibo core': {
            ...sashibo,
            tailAvailability: action.value,
            provisional,
            reviewStatus: provisional ? 'provisional_review' : sashibo.reviewStatus,
          },
        } : state.results,
      }
    }
    case 'captured':
      return { ...state, screen: 'review' }
    case 'startAnalysis':
      return { ...state, screen: 'analysis' }
    case 'finishAnalysis': {
      const sample = currentSample(state)
      const grade = action.grade ?? null
      const confidence = action.confidence ?? null
      return {
        ...state,
        screen: 'individual-result',
        results: {
          ...state.results,
          [sample]: {
            sample,
            fishId: fishForSample(sample, state.sameFish),
            status: action.outcome,
            originalGrade: grade,
            originalConfidence: confidence,
            rawConfidence: action.rawConfidence,
            overrideGrade: resultFor(state, sample)?.overrideGrade ?? null,
            overrideReason: resultFor(state, sample)?.overrideReason ?? '',
            captured: true,
            weight: weightForSample(state, sample),
            inferenceId: action.inferenceId,
            captureId: action.captureId,
            scores: action.scores,
            imageType: action.imageType,
            modelSource: action.modelSource,
          },
        },
      }
    }
    case 'setAdminPin':
      return { ...state, adminPin: action.value, adminError: '' }
    case 'adminError':
      return { ...state, adminError: action.message }
    case 'adminAuthenticated':
      return { ...state, adminAuthenticated: true, adminError: '', screen: 'admin-dashboard' }
    case 'setOverride': {
      const existing = state.results[action.sample]
      if (!existing) return state
      return { ...state, results: { ...state.results, [action.sample]: { ...existing, status: 'valid', overrideGrade: action.grade, overrideReason: action.reason, overrideActor: action.actor, overrideAt: action.timestamp } } }
    }
    case 'nextSample':
      return { ...state, currentSampleIndex: state.currentSampleIndex + 1, screen: 'camera', demoOutcome: 'valid' }
    case 'requestTail':
      return { ...state, selectedSamples: ['Sashibo core', 'Tail cut'], sameFish: 'same', currentSampleIndex: 1, screen: 'camera', demoOutcome: 'valid' }
    case 'startPrinting':
      return { ...state, printIndex: 0, printedSamples: [], screen: 'print' }
    case 'printed':
      return { ...state, printedSamples: [...state.printedSamples, action.sample], printIndex: state.printIndex + 1 }
    case 'gradeAnother':
      return { ...initialSession, screen: 'weight', role: 'expert', graderName: state.graderName, rememberName: state.rememberName, selectedSamples: ['Sashibo core'], sameFish: 'same' }
    case 'reset':
      return { ...initialSession }
    default:
      return state
  }
}
