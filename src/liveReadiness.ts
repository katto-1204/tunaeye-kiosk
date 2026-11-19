import { checkPiHealth, capturePiImage, getPiSettings } from './piClient'
import { createId } from './id'

type Row = { key: string; label: string; sub: string; state: 'checking' | 'ready' | 'warn' | 'error'; detail: string }
const active = new WeakMap<Window, Promise<boolean>>()
const esc = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!))
const message = (error: unknown) => error instanceof Error ? error.message : 'Check failed. Retry after checking the station.'

const ROW_SVGS: Record<string, string> = {
  network: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1.3" fill="currentColor"/></svg>`,
  server: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="7" rx="2"/><rect x="2" y="14" width="20" height="7" rx="2"/><circle cx="6" cy="6.5" r="1" fill="currentColor"/><circle cx="6" cy="17.5" r="1" fill="currentColor"/><path d="M11 6.5h7M11 17.5h7"/></svg>`,
  camera: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3.5"/></svg>`,
  sashibocore: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="8" rx="4"/><path d="M7 12h10" stroke-width="2.4"/></svg>`,
  tailcut: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="12" rx="9" ry="7"/><ellipse cx="12" cy="12" rx="4.5" ry="3.2" stroke-dasharray="2.5 2"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/></svg>`,
  storage: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5"/><path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3"/></svg>`
}

const STATE_BADGE_SVG: Record<Row['state'], string> = {
  checking: `<svg class="lr-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`,
  ready: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  warn: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
  error: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
}

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
    const response = await fetch('/local-api/health', { cache: 'no-store', signal: AbortSignal.timeout(2000) })
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
    overlay.innerHTML = `<style>
      @keyframes lrSpin{to{transform:rotate(360deg)}}
      #live-readiness .sheet{width:min(680px,95%);max-height:92%;overflow:auto;padding:22px 24px 20px;border-radius:26px;background:linear-gradient(180deg,#ffffff 0%,#f7faff 100%);color:#0f172a;font-family:Inter,system-ui,sans-serif;box-shadow:0 28px 70px -18px rgba(10,25,60,.38),0 0 0 1px rgba(219,231,249,.9)}
      #live-readiness .lr-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:14px}
      #live-readiness .lr-brand{display:flex;align-items:center;gap:13px}
      #live-readiness .lr-hero-ic{width:46px;height:46px;border-radius:14px;background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);color:#fff;display:grid;place-items:center;box-shadow:0 10px 22px -8px rgba(37,99,235,.55);flex-shrink:0}
      #live-readiness h2{font-size:22px;font-weight:800;letter-spacing:-.025em;margin:0 0 3px;color:#0f172a}
      #live-readiness .lr-sub{font-size:12.5px;color:#64748b;margin:0;line-height:1.4}
      #live-readiness .lr-pill{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;font-size:11.5px;font-weight:700;letter-spacing:.02em;white-space:nowrap;border:1px solid #dbe7f9;background:#eff6ff;color:#1d4ed8}
      #live-readiness .lr-pill.ok{background:#ecfdf5;border-color:#a7f3d0;color:#047857}
      #live-readiness .lr-pill.err{background:#fef2f2;border-color:#fecaca;color:#b91c1c}
      #live-readiness ul{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      @media (max-width:560px){#live-readiness ul{grid-template-columns:1fr}}
      #live-readiness li{padding:11px 13px;border-radius:16px;border:1.5px solid #e2e8f0;background:#fff;display:grid;grid-template-columns:38px 1fr auto;align-items:center;gap:11px;transition:border-color .18s,background .18s,box-shadow .18s}
      #live-readiness li.lr-ready{border-color:#bbf7d0;background:linear-gradient(135deg,#ffffff 0%,#f0fdf4 100%)}
      #live-readiness li.lr-warn{border-color:#fde68a;background:linear-gradient(135deg,#ffffff 0%,#fffbeb 100%)}
      #live-readiness li.lr-error{border-color:#fecaca;background:linear-gradient(135deg,#ffffff 0%,#fef2f2 100%)}
      #live-readiness .lr-ic{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;background:#eff6ff;color:#2563eb}
      #live-readiness .lr-ready .lr-ic{background:#dcfce7;color:#15803d}
      #live-readiness .lr-warn .lr-ic{background:#fef3c7;color:#b45309}
      #live-readiness .lr-error .lr-ic{background:#fee2e2;color:#dc2626}
      #live-readiness .lr-body{min-width:0}
      #live-readiness .lr-title-row{display:flex;align-items:center;gap:6px}
      #live-readiness .lr-body b{font-size:13.5px;font-weight:700;color:#0f172a;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #live-readiness .lr-tag{font-size:10px;font-weight:700;color:#64748b;background:#f1f5f9;padding:1.5px 6px;border-radius:999px;text-transform:uppercase;letter-spacing:.04em}
      #live-readiness small{display:block;font-size:11.5px;font-weight:500;color:#64748b;margin-top:2px;line-height:1.35;overflow-wrap:anywhere}
      #live-readiness .lr-ready small{color:#166534}
      #live-readiness .lr-warn small{color:#92400e}
      #live-readiness .lr-error small{color:#b91c1c}
      #live-readiness .lr-dot{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:#eff6ff;color:#2563eb;flex-shrink:0}
      #live-readiness .lr-ready .lr-dot{background:#16a34a;color:#fff}
      #live-readiness .lr-warn .lr-dot{background:#f59e0b;color:#fff}
      #live-readiness .lr-error .lr-dot{background:#dc2626;color:#fff}
      #live-readiness .lr-spin{animation:lrSpin .85s linear infinite}
      #live-readiness .lr-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:16px;padding-top:14px;border-top:1px solid #e5edf8;flex-wrap:wrap}
      #live-readiness .lr-note{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:600;color:#64748b}
      #live-readiness .lr-actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-left:auto}
      #live-readiness button{min-height:42px;padding:0 18px;border-radius:999px;font:600 13.5px Inter,system-ui,sans-serif;background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;cursor:pointer;display:inline-flex;align-items:center;gap:7px;transition:transform .12s,background .15s}
      #live-readiness button[data-lr=retry]{background:#eff6ff;color:#1d4ed8;border-color:#bfdbfe}
      #live-readiness button.lr-primary{background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);color:#fff;border-color:#1d4ed8;box-shadow:0 10px 22px -8px rgba(37,99,235,.65);padding:0 22px;font-weight:700}
      #live-readiness button:disabled{opacity:.45;cursor:default;box-shadow:none}
      #live-readiness button:focus-visible{outline:3px solid #86adff;outline-offset:2px}
    </style>
    <section class="sheet" role="dialog" aria-modal="true" aria-labelledby="lr-title">
      <header class="lr-head">
        <div class="lr-brand">
          <div class="lr-hero-ic" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
          </div>
          <div>
            <h2 id="lr-title">Ready for live grading?</h2>
            <p class="lr-sub">Station hardware, V2 ONNX models &amp; offline evidence storage pre-flight check.</p>
          </div>
        </div>
        <span class="lr-pill" id="lr-summary-pill">Checking station…</span>
      </header>
      <ul aria-live="polite"></ul>
      <footer class="lr-foot">
        <span class="lr-note">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          100% Offline-first · Internet not required
        </span>
        <div class="lr-actions">
          <button type="button" data-lr="cancel">Cancel</button>
          <button type="button" data-lr="retry">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
            Retry checks
          </button>
          <button type="button" class="lr-primary" data-lr="start" disabled>
            Start live grading
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </button>
        </div>
      </footer>
    </section>`
    const rows: Row[] = [
      ['network', 'Pi network', 'Hotspot'],
      ['server', 'Flask inference server', ':8080'],
      ['camera', 'Camera snapshot', 'Optical'],
      ['sashibocore', 'Sashibo Core model', 'V2 ONNX'],
      ['tailcut', 'Tail-Cut model', 'V2 ONNX'],
      ['storage', 'Local storage & SQLite', 'Offline DB'],
    ].map(([key, label, sub]) => ({ key, label, sub, state: 'checking', detail: 'Checking…' }))
    const list = overlay.querySelector('ul')!, start = overlay.querySelector<HTMLButtonElement>('[data-lr=start]')!, retry = overlay.querySelector<HTMLButtonElement>('[data-lr=retry]')!, summaryPill = overlay.querySelector<HTMLElement>('#lr-summary-pill')!
    let closed = false, running = false
    const render = () => {
      if (closed) return
      list.innerHTML = rows.map(row => `<li class="lr-${row.state}" data-live-check="${row.key}">
        <div class="lr-ic" aria-hidden="true">${ROW_SVGS[row.key] || ''}</div>
        <div class="lr-body">
          <div class="lr-title-row"><b>${row.label}</b><span class="lr-tag">${row.sub}</span></div>
          <small>${esc(row.detail)}</small>
        </div>
        <span class="lr-dot" aria-hidden="true">${STATE_BADGE_SVG[row.state]}</span>
      </li>`).join('')
      const requiredReady = rows.filter(row => row.key !== 'camera').every(row => row.state === 'ready')
      const readyCount = rows.filter(row => row.state === 'ready').length
      if (running) {
        summaryPill.className = 'lr-pill'
        summaryPill.textContent = `Checking (${readyCount}/${rows.length})…`
      } else if (requiredReady) {
        summaryPill.className = 'lr-pill ok'
        summaryPill.textContent = readyCount === rows.length ? `All ${rows.length}/${rows.length} systems ready` : `${readyCount}/${rows.length} ready · Camera fallback active`
      } else {
        summaryPill.className = 'lr-pill err'
        summaryPill.textContent = `${readyCount}/${rows.length} ready · Check station`
      }
      start.disabled = running || !requiredReady; retry.disabled = running
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
          let piReachable = false
          try {
            const settings = getPiSettings()
            if (!settings.configured) throw Error('Open the Pi-hosted kiosk or configure its HTTPS gateway.')
            const status = await checkPiHealth()
            piReachable = true
            set('network', 'ready', 'The configured Pi endpoint is reachable on this network.')
            set('server', 'ready', `${status.service || 'Inference service'} answered /status.`)
            for (const key of ['sashibocore', 'tailcut'] as const) set(key, status.models?.[key] === true ? 'ready' : 'error', status.models?.[key] === true ? 'Backend reports model loaded.' : status.models?.[key] === false ? 'Backend reports model not loaded. Check the Flask model paths.' : 'Backend did not report model readiness. Add explicit model flags to /status.')
          } catch (error) { for (const key of ['network', 'server', 'sashibocore', 'tailcut']) set(key, 'error', message(error)) }
          if (!piReachable) {
            set('camera', 'error', 'Pi unreachable — connect to TunaRPi Wi-Fi to grade, or use DroidCam / Upload once connected.')
            return
          }
          try {
            const blob = await capturePiImage()
            const bitmap = await createImageBitmap(blob)
            const dimensions = `${bitmap.width} × ${bitmap.height}`
            bitmap.close()
            set('camera', 'ready', `Received a decodable camera image (${dimensions}).`)
          } catch {
            set('camera', 'warn', `No Pi USB camera signal — DroidCam (:4747), browser camera & Upload ready.`)
          }
        })(),
        (async () => { try { const detail = await storageCheck(); set('storage', 'ready', detail) } catch (error) { set('storage', 'error', message(error)) } })(),
      ])
      running = false; render()
    }
    overlay.querySelector<HTMLButtonElement>('[data-lr=cancel]')!.onclick = () => close(false)
    start.onclick = () => { if (!start.disabled) close(true) }; retry.onclick = () => void run()
    overlay.onclick = event => { if (event.target === overlay) close(false) }
      ; (d.getElementById('stage') || d.body).append(overlay); d.addEventListener('keydown', keys, true); overlay.querySelector<HTMLButtonElement>('button')!.focus()
    void run()
  }).finally(() => active.delete(w))
  active.set(w, promise)
  return promise
}
