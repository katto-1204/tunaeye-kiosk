import { queueSqliteRecords, readSqliteRecords } from './sqliteStore'
export type SyncState = 'pending' | 'syncing' | 'synced' | 'failed'

export interface GradingRecord {
  id: string
  sessionId: string
  timestamp: number
  time: string
  grader: string
  sample: string
  fish: string
  weight: string
  grade: string
  status: string
  capturedImage?: string
  capturedImageId?: string
  remoteImagePath?: string
  result?: { status: string; originalGrade: string | null; originalConfidence: number | null; rawConfidence?: number; overrideGrade: string | null; overrideReason: string; overrideActor?: string; overrideAt?: string; inferenceId?: string; captureId?: string; scores?: Record<string, number>; imageType?: 'sashibocore' | 'tailcut'; modelSource?: 'raspberry-pi' | 'demo' }
  transaction?: { currency: string; unitRatePerKg?: number | null; amount: number | null; syncState: SyncState; lastSyncError?: string }
}

export const RECORDS_KEY = 'tunaeye-records'

export const loadRecords = (): GradingRecord[] => {
  try {
    const saved = JSON.parse(localStorage.getItem(RECORDS_KEY) ?? '[]')
    return Array.isArray(saved) ? saved as GradingRecord[] : []
  } catch {
    return []
  }
}

export function saveRecords(records: GradingRecord[]) {
  const previous = new Map(loadRecords().map(record => [record.id, JSON.stringify(record)]))
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records))
  queueSqliteRecords(records.filter(record => previous.get(record.id) !== JSON.stringify(record)))
  window.dispatchEvent(new Event('tunaeye-records-updated'))
}

export async function restoreSqliteRecords() {
  try {
    const durable = await readSqliteRecords(), current = loadRecords()
    const merged = new Map(durable.map(record => [record.id, record]))
    current.forEach(record => merged.set(record.id, record))
    localStorage.setItem(RECORDS_KEY, JSON.stringify([...merged.values()]))
    queueSqliteRecords(current)
  } catch { /* Browser outbox remains available when the station service is offline. */ }
}

export function updateRecord(id: string, update: Partial<GradingRecord>) {
  saveRecords(loadRecords().map(record => record.id === id ? { ...record, ...update } : record))
}
