const KEY = 'tunaeye-admin-pin-v1'
const ATTEMPTS = 'tunaeye-admin-pin-attempts'
type Credential = { salt: string; hash: string }
const hex = (bytes: ArrayBuffer) => [...new Uint8Array(bytes)].map(value => value.toString(16).padStart(2, '0')).join('')
async function hash(pin: string, salt: string): Promise<string> {
  if (!crypto.subtle) throw Error('Protected PIN access requires HTTPS or the station localhost address.')
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits'])
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 120000, hash: 'SHA-256' }, key, 256))
}
function credential(): Credential | undefined {
  const saved = localStorage.getItem(KEY)
  if (saved) {
    const parsed = JSON.parse(saved)
    if (typeof parsed.salt !== 'string' || !/^[a-f0-9]{64}$/i.test(parsed.hash)) throw Error('Stored administrator PIN configuration is invalid.')
    return parsed
  }
  const salt = import.meta.env.VITE_ADMIN_PIN_SALT, digest = import.meta.env.VITE_ADMIN_PIN_HASH
  if (salt && digest && /^[a-f0-9]{64}$/i.test(digest)) return { salt, hash: digest }
}
function attempts(): { failures: number; until: number } {
  try { return JSON.parse(localStorage.getItem(ATTEMPTS) || 'null') || { failures: 0, until: 0 } } catch { return { failures: 0, until: 0 } }
}
export function adminPinConfigured(): boolean {
  const isLocalStationHttp = typeof location !== 'undefined' && location.protocol === 'http:'
  return Boolean(credential()) || isLocalStationHttp || import.meta.env.VITE_PI_LOCAL_HOSTED === 'true' || Boolean(import.meta.env.DEV && ['localhost', '127.0.0.1', '127.0.0.2'].includes(location.hostname))
}
export async function verifyAdminPin(pin: string): Promise<boolean> {
  const state = attempts()
  if (state.until > Date.now()) throw Error(`Too many PIN attempts. Try again in ${Math.ceil((state.until - Date.now()) / 1000)} seconds.`)
  if (!/^\d{4}$/.test(pin)) return false
  const stored = credential()
  // A frontend PIN is an offline station gate, never a substitute for server authorization.
  if (!stored && !adminPinConfigured()) throw Error('Administrator PIN is not configured for this station. Configure its deployment PIN before use.')
  const valid = stored ? await hash(pin, stored.salt) === stored.hash : pin === '1234'
  localStorage.setItem(ATTEMPTS, JSON.stringify(valid ? { failures: 0, until: 0 } : { failures: state.failures + 1, until: state.failures + 1 >= 5 ? Date.now() + 60000 : 0 }))
  return valid
}
export async function changeAdminPin(current: string, next: string): Promise<void> {
  if (!/^\d{4}$/.test(next)) throw Error('Use a four-digit administrator PIN.')
  if (!await verifyAdminPin(current)) throw Error('The current administrator PIN is incorrect.')
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)).buffer)
  localStorage.setItem(KEY, JSON.stringify({ salt, hash: await hash(next, salt) }))
}

export function mountPinSettings(w: Window, host: HTMLElement): void {
  const form = w.document.createElement('form')
  form.className = 'ea-card'
  form.innerHTML = '<h2>Administrator PIN</h2><p>Use the current station PIN to change its four-digit access code. Cloud administrator authorization is checked separately.</p><div class="ea-form"><label>Current PIN<input name="current" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="current-password" required></label><label>New PIN<input name="next" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="new-password" required></label></div><div class="ea-row" style="margin-top:18px"><button type="submit">Change PIN</button><span role="status"></span></div>'
  form.onsubmit = async event => {
    event.preventDefault()
    const button = form.querySelector<HTMLButtonElement>('button')!, status = form.querySelector<HTMLElement>('[role=status]')!
    if (button.disabled) return
    button.disabled = true; status.textContent = 'Updating PIN…'
    try {
      await changeAdminPin((form.elements.namedItem('current') as HTMLInputElement).value, (form.elements.namedItem('next') as HTMLInputElement).value)
      form.reset(); status.textContent = 'Administrator PIN updated on this station.'
    } catch (error) { status.textContent = error instanceof Error ? error.message : 'PIN could not be updated.' }
    finally { button.disabled = false }
  }
  host.append(form)
}
