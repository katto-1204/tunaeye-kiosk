// Enable only after coordinated backend validation and review of known A/B/C samples.
export const experimentalPolicy = import.meta.env.VITE_EXPERIMENTAL_GRADING_POLICY === 'true'
export const policyDescription = experimentalPolicy
  ? 'Backend acceptance, confidence ≥85% and score margin ≥20 percentage points'
  : 'Confidence ≥80%'

export function meetsExperimentalPolicy(result: { status: string; originalConfidence: number | null; scores?: Record<string, number> } | undefined): boolean {
  if (!result || result.status !== 'valid' || result.originalConfidence === null || !Number.isFinite(result.originalConfidence) || result.originalConfidence < 85) return false
  const values = ['GRADE_A', 'GRADE_B', 'GRADE_C', 'INVALID'].map(key => result.scores?.[key])
  if (values.some(value => typeof value !== 'number' || !Number.isFinite(value))) return false
  const ranked = (values as number[]).sort((a, b) => b - a)
  const scale = ranked[0] > 1 ? 100 : 1
  return (ranked[0] - ranked[1]) / scale >= .20
}

export function predictionOutcome(invalid: boolean, _confidence: number, status: unknown): 'valid' | 'uncertain' | 'invalid' {
  if (invalid || (experimentalPolicy && status === 'invalid')) return 'invalid'
  return 'valid'
}
