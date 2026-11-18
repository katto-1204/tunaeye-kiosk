const { buildSync } = require('esbuild')
const assert = require('node:assert/strict')
for (const enabled of [false, true]) {
  const compiled = buildSync({ stdin: { contents: "export * from './src/gradingPolicy';export * from './src/kioskState'", resolveDir: process.cwd() }, bundle: true, write: false, platform: 'node', format: 'cjs', define: { 'import.meta.env': JSON.stringify({ VITE_EXPERIMENTAL_GRADING_POLICY: String(enabled) }) } })
  const m = { exports: {} }; new Function('module', 'exports', compiled.outputFiles[0].text)(m, m.exports)
  const p = m.exports
  const result = { sample: 'Sashibo core', status: 'valid', originalGrade: 'A', originalConfidence: 85, scores: { GRADE_A: .85, GRADE_B: .05, GRADE_C: .05, INVALID: .05 } }
  assert.equal(p.isAccepted(result), true)
  assert.equal(p.isAccepted({ ...result, originalConfidence: 84.99 }), !enabled)
  assert.equal(p.isAccepted({ ...result, scores: undefined }), !enabled)
  assert.equal(p.isAccepted({ ...result, status: 'uncertain' }), !enabled)
  assert.equal(p.meetsExperimentalPolicy({ ...result, scores: { GRADE_A: 85, GRADE_B: 65, GRADE_C: 0, INVALID: 0 } }), true)
  assert.equal(p.meetsExperimentalPolicy({ ...result, scores: { GRADE_A: 85, GRADE_B: 65.01, GRADE_C: 0, INVALID: 0 } }), false)
  assert.equal(p.meetsExperimentalPolicy({ ...result, scores: { ...result.scores, INVALID: NaN } }), false)
  assert.equal(p.predictionOutcome(false, 91, undefined), enabled ? 'uncertain' : 'valid')
  assert.equal(p.predictionOutcome(false, 91, 'accepted'), 'valid')
  assert.equal(p.predictionOutcome(false, 91, 'invalid'), enabled ? 'invalid' : 'valid')
  const state = { ...p.initialSession, results: { 'Sashibo core': { ...result, status: 'uncertain' } } }
  assert.equal(p.decisionFor(state).next, enabled ? 'tail' : 'print')
  console.log(`PASS ${enabled ? 'experimental' : 'legacy'} policy: status, confidence, margin, missing/nonfinite scores and final decision`)
}
