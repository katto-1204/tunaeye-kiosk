const DATABASE_NAME = 'tunaeye-offline'
const STORE_NAME = 'evidence'

export interface EvidenceRecord {
  id: string
  sessionId: string
  sample: string
  fishId: string
  capturedAt: number
  mimeType: string
  blob: Blob
  syncState: 'pending' | 'syncing' | 'synced' | 'failed'
  remotePath?: string
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1)
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE_NAME, { keyPath: 'id' })
      store.createIndex('syncState', 'syncState')
      store.createIndex('sessionId', 'sessionId')
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveCapturedEvidence(record: Omit<EvidenceRecord, 'mimeType' | 'syncState'>): Promise<EvidenceRecord> {
  const evidence = { ...record, mimeType: record.blob.type || 'image/jpeg', syncState: 'pending' as const }
  const database = await openDatabase()
  try {
    await requestResult(database.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(evidence))
    return evidence
  } finally {
    database.close()
  }
}

export async function getCapturedEvidence(id: string): Promise<EvidenceRecord | undefined> {
  const database = await openDatabase()
  try {
    return await requestResult(database.transaction(STORE_NAME).objectStore(STORE_NAME).get(id))
  } finally {
    database.close()
  }
}

export async function promoteCapturedEvidence(temporaryId: string, id: string): Promise<void> {
  const database = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite'), store = transaction.objectStore(STORE_NAME)
      const request = store.get(temporaryId)
      request.onsuccess = () => {
        if (!request.result) { transaction.abort(); return }
        store.put({ ...request.result, id }); store.delete(temporaryId)
      }
      transaction.oncomplete = () => resolve()
      transaction.onabort = transaction.onerror = () => reject(transaction.error ?? new Error('Evidence promotion failed'))
    })
  } finally { database.close() }
}

export async function listPendingEvidence(): Promise<EvidenceRecord[]> {
  const database = await openDatabase()
  try {
    return await requestResult(database.transaction(STORE_NAME).objectStore(STORE_NAME).index('syncState').getAll('pending'))
  } finally {
    database.close()
  }
}

export async function markEvidenceSynced(id: string, remotePath: string): Promise<void> {
  const evidence = await getCapturedEvidence(id)
  if (!evidence) return
  const database = await openDatabase()
  try {
    await requestResult(database.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put({ ...evidence, syncState: 'synced', remotePath }))
  } finally {
    database.close()
  }
}

export async function updateEvidenceSyncState(id: string, syncState: EvidenceRecord['syncState']): Promise<void> {
  const evidence = await getCapturedEvidence(id)
  if (!evidence) return
  const database = await openDatabase()
  try {
    await requestResult(database.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put({ ...evidence, syncState }))
  } finally {
    database.close()
  }
}

export async function deleteCapturedEvidence(id: string): Promise<void> {
  const database = await openDatabase()
  try {
    await requestResult(database.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(id))
  } finally {
    database.close()
  }
}
