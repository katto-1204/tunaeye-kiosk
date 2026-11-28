import { createId } from './id'
import { hashRecoveryCode, verifyTotpCode } from './offlineTotp'
import { queueSqliteState } from './sqliteStore'

export interface ExpertGrader {
  id: string
  name: string
  salt: string
  pinHash: string
  algo: 'pbkdf2' | 'fnv'
  totpEnabled?: boolean
  totpSecret?: string
  recoveryCodeHashes?: string[]
  createdAt: number
}

const STORAGE_KEY = 'tunaeye-expert-graders-v1'
const ATTEMPTS_KEY = 'tunaeye-expert-pin-attempts-v1'

const hex = (bytes: ArrayBuffer) =>
  [...new Uint8Array(bytes)].map(v => v.toString(16).padStart(2, '0')).join('')

function fallbackHash(pin: string, salt: string): string {
  // Deterministic salted fallback only when Web Crypto subtle is unavailable on insecure HTTP LAN.
  const input = `${salt}:${pin}:tunaeye-expert-v1`
  let h1 = 0x811c9dc5
  let h2 = 0x9e3779b9
  for (let i = 0; i < input.length; i += 1) {
    const c = input.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 0x01000193)
    h2 = Math.imul(h2 ^ (c + i), 0x85ebca6b)
  }
  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`
}

async function derivePinHash(pin: string, salt: string, preferredAlgo?: 'pbkdf2' | 'fnv'): Promise<{ hash: string; algo: 'pbkdf2' | 'fnv' }> {
  const usePbkdf2 = preferredAlgo ? preferredAlgo === 'pbkdf2' : Boolean(typeof crypto !== 'undefined' && crypto.subtle)
  if (usePbkdf2 && typeof crypto !== 'undefined' && crypto.subtle) {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits'])
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 120000, hash: 'SHA-256' },
      key,
      256
    )
    return { hash: hex(bits), algo: 'pbkdf2' }
  }
  return { hash: fallbackHash(pin, salt), algo: 'fnv' }
}

function randomSalt(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    return hex(crypto.getRandomValues(new Uint8Array(16)).buffer)
  }
  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`
}

function readRaw(): ExpertGrader[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is ExpertGrader =>
        Boolean(item) &&
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        typeof item.salt === 'string' &&
        typeof item.pinHash === 'string'
    )
  } catch {
    return []
  }
}

function writeRaw(list: ExpertGrader[]) {
  const payload = JSON.stringify(list)
  localStorage.setItem(STORAGE_KEY, payload)
  queueSqliteState(STORAGE_KEY, payload)
}

let seedPromise: Promise<ExpertGrader[]> | null = null

export async function ensureSeededExpertGraders(): Promise<ExpertGrader[]> {
  const existing = readRaw()
  if (existing !== null) return existing
  seedPromise ??= (async () => {
    const defaults: Array<{ name: string; pin: string }> = [
      { name: 'Maria Santos', pin: '2468' },
      { name: 'Jose Dela Cruz', pin: '1357' },
    ]
    const seeded: ExpertGrader[] = []
    for (const entry of defaults) {
      const salt = randomSalt()
      const { hash, algo } = await derivePinHash(entry.pin, salt)
      seeded.push({
        id: createId(),
        name: entry.name,
        salt,
        pinHash: hash,
        algo,
        createdAt: Date.now(),
      })
    }
    writeRaw(seeded)
    return seeded
  })().finally(() => {
    seedPromise = null
  })
  return seedPromise
}

export function listExpertGradersSync(): ExpertGrader[] {
  return readRaw() ?? []
}

export async function listExpertGraders(): Promise<ExpertGrader[]> {
  return ensureSeededExpertGraders()
}

export async function registerExpertGrader(name: string, pin: string): Promise<ExpertGrader> {
  const clean = name.trim()
  if (!clean) throw new Error('Enter the expert grader’s full name.')
  if (!/^\d{4}$/.test(pin)) throw new Error('Assign a 4-digit personal PIN for this expert grader.')
  const current = await ensureSeededExpertGraders()
  if (current.some(item => item.name.toLocaleLowerCase() === clean.toLocaleLowerCase())) {
    throw new Error('That expert grader is already registered.')
  }
  const salt = randomSalt()
  const { hash, algo } = await derivePinHash(pin, salt)
  const created: ExpertGrader = {
    id: createId(),
    name: clean,
    salt,
    pinHash: hash,
    algo,
    createdAt: Date.now(),
  }
  writeRaw([...current, created])
  return created
}

export async function removeExpertGrader(id: string): Promise<void> {
  const current = await ensureSeededExpertGraders()
  writeRaw(current.filter(item => item.id !== id))
}

export async function enableExpertTotp(graderId: string, secret: string, verificationCode: string, recoveryCodes: string[]): Promise<ExpertGrader> {
  const current = await ensureSeededExpertGraders()
  const grader = current.find(item => item.id === graderId)
  if (!grader) throw new Error('Expert grader not found.')
  if (!verifyTotpCode(secret, verificationCode, 1)) {
    throw new Error('The 6-digit authenticator code did not match. Check your phone clock and try again.')
  }
  const cleanSecret = secret.toUpperCase().replace(/[^A-Z2-7]/g, '')
  const recoveryCodeHashes = recoveryCodes.map(code => hashRecoveryCode(code, grader.salt))
  const updated: ExpertGrader = { ...grader, totpEnabled: true, totpSecret: cleanSecret, recoveryCodeHashes }
  writeRaw(current.map(item => (item.id === graderId ? updated : item)))
  return updated
}

export async function disableExpertTotp(graderId: string): Promise<void> {
  const current = await ensureSeededExpertGraders()
  writeRaw(current.map(item => (item.id === graderId ? { ...item, totpEnabled: false, totpSecret: undefined, recoveryCodeHashes: [] } : item)))
}

export async function verifyExpertSecondFactor(graderId: string, codeInput: string): Promise<{ ok: boolean; method?: 'totp' | 'recovery'; remainingRecovery?: number; error?: string }> {
  const list = await ensureSeededExpertGraders()
  const grader = list.find(item => item.id === graderId)
  if (!grader) return { ok: false, error: 'Expert grader not found.' }
  if (!grader.totpEnabled || !grader.totpSecret) return { ok: true }
  const trimmed = codeInput.trim()
  if (!trimmed) return { ok: false, error: `Enter the 6-digit offline 2FA code (or a recovery code) for ${grader.name}.` }
  if (verifyTotpCode(grader.totpSecret, trimmed, 1)) {
    return { ok: true, method: 'totp' }
  }
  const candidateHash = hashRecoveryCode(trimmed, grader.salt)
  const hashes = grader.recoveryCodeHashes ?? []
  const matchIdx = hashes.indexOf(candidateHash)
  if (matchIdx >= 0) {
    const nextHashes = hashes.filter((_, idx) => idx !== matchIdx)
    writeRaw(list.map(item => (item.id === graderId ? { ...item, recoveryCodeHashes: nextHashes } : item)))
    return { ok: true, method: 'recovery', remainingRecovery: nextHashes.length }
  }
  return { ok: false, error: `Invalid 6-digit 2FA or recovery code for ${grader.name}.` }
}

type AttemptMap = Record<string, { failures: number; until: number }>

function readAttempts(): AttemptMap {
  try {
    return JSON.parse(localStorage.getItem(ATTEMPTS_KEY) ?? '{}') || {}
  } catch {
    return {}
  }
}

export async function verifyExpertGraderPin(graderId: string, pin: string): Promise<{ ok: boolean; grader?: ExpertGrader; error?: string }> {
  const list = await ensureSeededExpertGraders()
  const grader = list.find(item => item.id === graderId)
  if (!grader) return { ok: false, error: 'Select a registered expert grader first.' }
  const map = readAttempts()
  const state = map[graderId] ?? { failures: 0, until: 0 }
  if (state.until > Date.now()) {
    return { ok: false, error: `Too many PIN attempts for ${grader.name}. Try again in ${Math.ceil((state.until - Date.now()) / 1000)}s.` }
  }
  if (!/^\d{4}$/.test(pin)) return { ok: false, error: 'Enter a 4-digit PIN.' }
  const { hash } = await derivePinHash(pin, grader.salt, grader.algo)
  const valid = hash === grader.pinHash
  map[graderId] = valid
    ? { failures: 0, until: 0 }
    : { failures: state.failures + 1, until: state.failures + 1 >= 5 ? Date.now() + 60000 : 0 }
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(map))
  return valid
    ? { ok: true, grader }
    : { ok: false, error: `Incorrect PIN for ${grader.name}.` }
}
