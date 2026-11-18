import type { GradingRecord } from './gradingRecords'

let pending = Promise.resolve()
let failure: string | undefined
export async function readSqliteRecords(): Promise<GradingRecord[]> {
  const response = await fetch('/local-api/records', { cache: 'no-store' })
  if (!response.ok) throw Error('SQLite service unavailable')
  return (await response.json()).records
}
export function queueSqliteRecords(records: GradingRecord[]) {
  pending = pending.then(async () => {
    try {
      for (const record of records) {
        const evidence = record.capturedImageId ? await (await import('./evidenceStorage')).getCapturedEvidence(record.capturedImageId) : undefined
        if (record.capturedImageId && !evidence) throw Error('Image missing; SQLite save incomplete')
        let image: string | undefined
        if (evidence) {
          const bytes = new Uint8Array(await evidence.blob.arrayBuffer())
          const chunks: string[] = []
          for (let i = 0; i < bytes.length; i += 8192) chunks.push(String.fromCharCode(...bytes.subarray(i, i + 8192)))
          image = btoa(chunks.join(''))
        }
        const response = await fetch('/local-api/records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ record, evidence: evidence ? { ...evidence, blob: undefined, image } : undefined }) })
        if (!response.ok) throw Error('SQLite service did not confirm saving')
      }
      failure = undefined
    } catch (error) { failure = error instanceof Error ? error.message : 'SQLite unavailable' }
  })
}
export async function sqliteSaveStatus(): Promise<string> {
  await pending
  return failure ? `Saved in browser only. ${failure}. Keep this browser data until SQLite backup succeeds.` : 'Saved to SQLite on this station.'
}
