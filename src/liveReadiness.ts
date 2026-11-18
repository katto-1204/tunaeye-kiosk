import { checkPiHealth, capturePiImage, getPiSettings } from './piClient'
import { createId } from './id'

type Row = { key: string; label: string; state: 'checking' | 'ready' | 'error'; detail: string }
const active = new WeakMap<Window, Promise<boolean>>()
const esc = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!))
const message = (error: unknown) => error instanceof Error ? error.message : 'Check failed. Retry after checking the station.'

async function storageCheck() {
  const probe = `tunaeye-check-${createId()}`
  localStorage.setItem(probe, probe)
  try { if (localStorage.getItem(probe) !== probe) throw Error('Browser settings could not be saved.') } finally { localStorage.removeItem(probe) }
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(probe)
    request.onupgradeneeded = () => request.result.createObjectStore('probe')
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const database = request.result, tx = database.transaction('probe', 'readwrite'), store = tx.objectStore('probe')
      store.put('ready', 'probe')
      const read = store.get('probe')
      read.onsuccess = () => { if (read.result !== 'ready') tx.abort() }
      tx.oncomplete = () => { database.close(); indexedDB.deleteDatabase(probe); resolve() }
      tx.onabort = tx.onerror = () => { database.close(); indexedDB.deleteDatabase(probe); reject(tx.error ?? Error('Evidence storage is unavailable.')) }
    }
  })
  try {
    const response = await fetch('/local-api/health', { cache: 'no-store', signal: AbortSignal.timeout(8000) })
    const contentType = response.headers.get('content-type') ?? ''
    if (response.status === 404 || contentType.includes('text/html')) {
      return 'Browser storage and IndexedDB are ready (no station SQLite sidecar on this host).'
    }
    if (!response.ok) throw Error('Station SQLite service is unavailable or not writable.')
    const health = await response.json()
    if (health?.sqlite !== 'ready' || health?.writable !== true) throw Error('SQLite did not confirm durable write readiness.')
    return 'Browser evidence storage and station SQLite service are available.'
  } catch (error) {
    if (error instanceof Error && /SQLite/i.test(error.message)) throw error
    return 'Browser storage and IndexedDB are ready (station SQLite sidecar not running).'
  }
}

export function showLiveReadiness(w: Window): Promise<boolean> {
  const existing = active.get(w)
  if (existing) return existing
  const promise = new Promise<boolean>(resolve => {
    const d = w.document, previousFocus = d.activeElement as HTMLElement | null, overlay = d.createElement('div')
    overlay.className = 'ovl'; overlay.id = 'live-readiness'
    overlay.innerHTML = `<style>#live-readiness .sheet{width:min(580px,94%);max-height:92%;overflow:auto;padding:28px;border-radius:24px;background:#fff;color:#182842;font-family:Inter,system-ui,sans-serif}#live-readiness h2{font-size:27px;margin:0 0 8px}#live-readiness p{font-size:14px;color:#71809a;margin:0 0 18px}#live-readiness ul{list-style:none;padding:0;margin:0}#live-readiness li{padding:12px 0;border-top:1px solid #e9eef7;display:grid;grid-template-columns:28px 1fr;gap:8px;font-size:14px}#live-readiness small{display:block;font-size:12px;font-weight:400;color:#71809a;margin-top:4px;overflow-wrap:anywhere}#live-readiness .lr-dot{width:23px;height:23px;border-radius:50%;display:grid;place-items:center;background:#edf3ff;color:#245fee}#live-readiness .lr-error .lr-dot{background:#fff0eb;color:#a33d29}#live-readiness .lr-ready .lr-dot{background:#eaf8f0;color:#17804c}#live-readiness .lr-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:22px;flex-wrap:wrap}#live-readiness button{min-height:44px;padding:10px 20px;border-radius:999px;font:600 14px Inter,system-ui,sans-serif;background:#edf3ff;color:#245fee;border:1px solid #dce6f6}#live-readiness button.lr-primary{background:#245fee;color:#fff;border-color:#245fee}#live-readiness button:disabled{opacity:.45;cursor:default}#live-readiness button:focus-visible{outline:3px solid #86adff;outline-offset:3px}</style><section class="sheet" role="dialog" aria-modal="true" aria-labelledby="lr-title"><h2 id="lr-title">Ready for live grading?</h2><p>Check the local Pi, camera, models and saved evidence before starting. Internet access is not required.</p><ul aria-live="polite"></ul><div class="lr-actions"><button type="button" data-lr="cancel">Cancel</button><button type="button" data-lr="retry">Retry checks</button><button type="button" class="lr-primary" data-lr="start" disabled>Start live grading</button></div></section>`
    const rows: Row[] = [['network', 'Pi network'], ['server', 'Flask inference server'], ['camera', 'Camera snapshot'], ['sashibocore', 'Sashibo Core model'], ['tailcut', 'Tail-Cut model'], ['storage', 'Local storage & SQLite']].map(([key, label]) => ({ key, label, state: 'checking', detail: 'Checking…' }))
    const list = overlay.querySelector('ul')!, start = overlay.querySelector<HTMLButtonElement>('[data-lr=start]')!, retry = overlay.querySelector<HTMLButtonElement>('[data-lr=retry]')!
    let closed = false, running = false
    const render = () => {
      if (closed) return
      list.innerHTML = rows.map(row => `<li class="lr-${row.state}" data-live-check="${row.key}"><span class="lr-dot" aria-hidden="true">${row.state === 'ready' ? '✓' : row.state === 'error' ? '!' : '…'}</span><div><b>${row.label}</b><small>${esc(row.detail)}</small></div></li>`).join('')
      start.disabled = running || !rows.every(row => row.state === 'ready'); retry.disabled = running
    }
    const set = (key: string, state: Row['state'], detail: string) => { Object.assign(rows.find(row => row.key === key)!, { state, detail }); render() }
    const close = (ready: boolean) => { if (closed) return; closed = true; overlay.remove(); d.removeEventListener('keydown', keys, true); previousFocus?.focus(); resolve(ready) }
    const keys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(false) }
      if (event.key === 'Tab') {
        const buttons = [...overlay.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')], first = buttons[0], last = buttons.at(-1)
        if (event.shiftKey && d.activeElement === first) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && d.activeElement === last) { event.preventDefault(); first?.focus() }
      }
    }
    const run = async () => {
      if (running || closed) return
      running = true; rows.forEach(row => { row.state = 'checking'; row.detail = 'Checking…' }); render()
      await Promise.allSettled([
        (async () => {
          try {
            const settings = getPiSettings()
            if (!settings.configured) throw Error('Open the Pi-hosted kiosk or configure its HTTPS gateway.')
            const status = await checkPiHealth()
            set('network', 'ready', 'The configured Pi endpoint is reachable on this network.')
            set('server', 'ready', `${status.service || 'Inference service'} answered /status.`)
            for (const key of ['sashibocore', 'tailcut'] as const) set(key, status.models?.[key] === true ? 'ready' : 'error', status.models?.[key] === true ? 'Backend reports model loaded.' : status.models?.[key] === false ? 'Backend reports model not loaded. Check the Flask model paths.' : 'Backend did not report model readiness. Add explicit model flags to /status.')
          } catch (error) { for (const key of ['network', 'server', 'sashibocore', 'tailcut']) set(key, 'error', message(error)) }
        })(),
        (async () => { try { const blob = await capturePiImage(); const bitmap = await createImageBitmap(blob); const dimensions = `${bitmap.width} × ${bitmap.height}`; bitmap.close(); set('camera', 'ready', `Received a decodable camera image (${dimensions}).`) } catch (error) { set('camera', 'error', message(error)) } })(),
        (async () => { try { const detail = await storageCheck(); set('storage', 'ready', detail) } catch (error) { set('storage', 'error', message(error)) } })(),
      ])
      running = false; render()
    }
    overlay.querySelector<HTMLButtonElement>('[data-lr=cancel]')!.onclick = () => close(false)
    start.onclick = () => { if (!start.disabled) close(true) }; retry.onclick = () => void run()
    overlay.onclick = event => { if (event.target === overlay) close(false) }
    ;(d.getElementById('stage') || d.body).append(overlay); d.addEventListener('keydown', keys, true); overlay.querySelector<HTMLButtonElement>('button')!.focus()
    void run()
  }).finally(() => active.delete(w))
  active.set(w, promise)
  return promise
}
