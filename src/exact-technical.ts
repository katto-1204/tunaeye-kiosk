import { checkPiHealth, capturePiImage, getPiSettings } from './piClient'
import { checkCloudConnection, isSupabaseConfigured } from './supabase'
import { loadRecords } from './gradingRecords'
import { getCapturedEvidence } from './evidenceStorage'

type Check = { message: string; checked?: number; error?: boolean }
type TechnicalState = {
  configuration?: string
  pi: Check; camera: Check; cloud: Check; storage: Check
  busy: Set<string>; metadata?: Record<string, unknown>; latency?: number
  snapshot?: Blob; dimensions?: string; usage?: number; quota?: number
  evidence?: { present: number; missing: string[]; bytes: number }; caches?: string[]; persistent?: boolean
}
const states = new WeakMap<Window, TechnicalState>()
const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
const size = (bytes?: number) => typeof bytes !== 'number' ? 'Not reported' : bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${(bytes / 1024).toFixed(1)} KB`
function endpoint(path: string) {
  try { const u = new URL(path || '/', location.origin); u.username = ''; u.password = ''; u.search = ''; u.hash = ''; return u.href } catch { return 'Invalid endpoint configuration' }
}
const css = `.et{display:grid;gap:16px}.et-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.et-card{padding:20px;border:1px solid #dce6f6;border-radius:22px;background:#fff;min-width:0}.et h3{font:600 16px Inter,system-ui,sans-serif;margin:0 0 12px}.et dl{display:grid;grid-template-columns:minmax(90px,.65fr) minmax(0,1.35fr);gap:9px 14px;font-size:13px;margin:14px 0}.et dt{color:#64738d}.et dd{margin:0;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}.et code,.et pre{font:12px ui-monospace,Consolas,monospace}.et pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f4f7ff;padding:14px;border-radius:12px;max-height:220px;overflow:auto}.et-status{font-size:13px;line-height:1.5;border-left:3px solid #8baee8;padding-left:10px;margin:10px 0;color:#51647f}.et-status.bad{border-color:#db7359;color:#9d3324}.et-time{display:block;color:#64738d;font-size:11px;margin-top:5px}.et-actions{display:flex;gap:8px;flex-wrap:wrap}.et .et-metrics{display:flex;flex-wrap:wrap;gap:10px;margin:12px 0}.et-metrics span{padding:8px 12px;background:#edf3ff;border-radius:12px;font-size:12px}.et small{font-size:12px;color:#64738d}.et img{width:100%;max-height:210px;object-fit:contain;background:#f4f7ff;border-radius:14px}.et-failure{padding:12px 0;border-top:1px solid #e3eaf8;font-size:12px;overflow-wrap:anywhere}.et-failure code{display:block;color:#0b45e5;margin-bottom:4px}.et details summary{min-height:44px;cursor:pointer;display:flex;align-items:center;font-size:13px;font-weight:600}.et .et-missing{color:#9d3324}@media(max-width:1050px){.et-grid{grid-template-columns:1fr}.et-card{padding:16px}}`

export function mountTechnicalPanel(w: Window, host: HTMLElement): void {
  if (!w.document.getElementById('technical-admin-style')) { const style = w.document.createElement('style'); style.id = 'technical-admin-style'; style.textContent = css + '.et small{display:block;margin-top:10px}'; w.document.head.append(style) }
  let state = states.get(w)
  if (!state) { state = { pi: { message: 'Not checked' }, camera: { message: 'Not checked' }, cloud: { message: 'Not checked' }, storage: { message: 'Not inspected' }, busy: new Set() }; states.set(w, state) }
  const s = state
  let objectURL: string | undefined
  const cleanup = () => { if (objectURL) { URL.revokeObjectURL(objectURL); objectURL = undefined } }
  const observer = new MutationObserver(() => { if (!host.isConnected) { cleanup(); observer.disconnect() } })
  observer.observe(w.document.documentElement, { childList: true, subtree: true })
  const status = (key: 'pi' | 'camera' | 'cloud' | 'storage') => `<div class="et-status ${s[key].error ? 'bad' : ''}" data-diagnostic-status="${key}" role="status">${esc(s[key].message)}<span class="et-time">${s[key].checked ? `Checked ${esc(new Date(s[key].checked!).toLocaleTimeString())}` : 'No diagnostic has run'}</span></div>`
  const button = (key: string, label: string) => `<button type="button" data-diagnostic="${key}" ${s.busy.has(key) || s.busy.has('all') ? 'disabled' : ''}>${s.busy.has(key) ? 'Checking…' : label}</button>`
  const draw = () => {
    if (!host.isConnected) return
    cleanup()
    const settings = getPiSettings(), rows = loadRecords(), count = (value: string) => rows.filter(row => (row.transaction?.syncState ?? 'pending') === value).length
    const configuration = JSON.stringify([settings.mode, settings.apiUrl, settings.streamUrl, settings.snapshotUrl])
    if (s.configuration && s.configuration !== configuration) { s.pi = { message: 'Not checked for this configuration' }; s.camera = { message: 'Not checked for this configuration' }; s.metadata = undefined; s.latency = undefined; s.snapshot = undefined; s.dimensions = undefined }
    s.configuration = configuration
    const connection = [...w.document.querySelectorAll<HTMLElement>('.as > div')].find(el => el.hasAttribute('data-station-connection') || el.textContent?.includes('System online'))
    if (connection) { connection.setAttribute('data-station-connection', ''); connection.textContent = `${navigator.onLine ? 'Network available' : 'Network offline'} · Pi ${s.pi.checked ? s.pi.error ? 'unavailable at last check' : 'status reachable at last check' : 'not checked'}` }
    const failed = rows.filter(row => row.transaction?.lastSyncError)
    if (s.snapshot) objectURL = URL.createObjectURL(s.snapshot)
    const controller = 'serviceWorker' in navigator ? navigator.serviceWorker.controller?.scriptURL : undefined
    host.innerHTML = `<section class="ea-card et" aria-label="Station technical diagnostics"><div class="ea-row between"><div><h2>Station diagnostics</h2><p>Check the hardware contract, cloud access and saved evidence. Diagnostics never upload records.</p></div>${button('all', 'Run diagnostics')}</div><div class="et-grid">
      <article class="et-card"><h3>Pi API &amp; inference models</h3><dl><dt>Deployment</dt><dd>${esc(settings.mode)}</dd><dt>Status</dt><dd><code>${esc(endpoint(`${settings.apiUrl}/status`))}</code></dd><dt>Grading</dt><dd><code>POST ${esc(endpoint(`${settings.apiUrl}/grade`))}</code></dd><dt>Model input</dt><dd><code>image_type: sashibocore | tailcut</code></dd><dt>Pi latency</dt><dd>${s.latency === undefined ? 'Not measured' : `${s.latency} ms (status request)`}</dd></dl>${status('pi')}${button('pi', 'Check Pi status')}${s.metadata ? `<details><summary>Reported model and service metadata</summary><pre>${esc(JSON.stringify(s.metadata, null, 2))}</pre></details>` : '<small>Model availability and identifiers come from /status; they are not inferred from saved settings.</small>'}</article>
      <article class="et-card"><h3>Camera capture diagnostic</h3><dl><dt>Live stream</dt><dd><code>${esc(endpoint(settings.streamUrl))}</code></dd><dt>Snapshot</dt><dd><code>${esc(endpoint(settings.snapshotUrl))}</code></dd><dt>Image bytes</dt><dd>${s.snapshot ? size(s.snapshot.size) : 'Not captured'}</dd><dt>Format / size</dt><dd>${s.snapshot ? `${esc(s.snapshot.type)} · ${esc(s.dimensions ?? 'Not reported')}` : 'Not checked'}</dd></dl>${status('camera')}${button('camera', 'Test Pi snapshot')}${objectURL ? `<img src="${esc(objectURL)}" alt="Pi diagnostic snapshot">` : ''}<small>This reads the actual Pi snapshot endpoint, even when grading demo mode is enabled. It does not grade or save a record.</small></article>
      <article class="et-card"><h3>Cloud &amp; synchronization queue</h3><dl><dt>Browser network</dt><dd>${navigator.onLine ? 'Available — does not prove internet access' : 'Offline'}</dd><dt>Supabase</dt><dd>${isSupabaseConfigured() ? 'Configured in this build' : 'Not configured'}</dd><dt>Last completed sync</dt><dd>${esc(localStorage.getItem('tunaeye-last-sync') ?? 'Not recorded')}</dd></dl><div class="et-metrics"><span>${count('pending')} pending</span><span>${count('syncing')} syncing</span><span>${count('failed')} failed</span><span>${count('synced')} verified synced</span></div>${status('cloud')}${button('cloud', 'Check cloud reachability')}<small>Reachability does not verify authentication or writes. Use the station's Sync now action to upload and verify records/images.</small>${failed.length ? `<details><summary>${failed.length} stored sync error${failed.length === 1 ? '' : 's'}</summary>${failed.map(row => `<div class="et-failure"><code>${esc(row.id)}</code>${esc(row.transaction?.lastSyncError)}</div>`).join('')}</details>` : ''}</article>
      <article class="et-card"><h3>Local evidence &amp; offline readiness</h3><dl><dt>Secure origin</dt><dd>${window.isSecureContext ? 'Yes' : 'No — PWA caching requires a trusted origin'}</dd><dt>Service worker</dt><dd>${controller ? `<code>${esc(endpoint(controller))}</code>` : 'serviceWorker' in navigator ? 'Not controlling this page yet' : 'Unavailable in this browser/origin'}</dd><dt>IndexedDB</dt><dd>${'indexedDB' in window ? 'Browser supports IndexedDB' : 'Unavailable'}</dd><dt>Storage used / quota</dt><dd>${size(s.usage)} / ${size(s.quota)}</dd><dt>Persistent storage</dt><dd>${s.persistent === undefined ? 'Not checked' : s.persistent ? 'Granted' : 'Not granted — browser may evict storage'}</dd><dt>Referenced evidence</dt><dd>${s.evidence ? `${s.evidence.present} present · ${s.evidence.missing.length} missing · ${size(s.evidence.bytes)}` : 'Not inspected'}</dd><dt>Offline cache</dt><dd>${s.caches ? s.caches.map(esc).join(', ') || 'No caches found' : 'Not inspected'}</dd></dl>${status('storage')}${button('storage', 'Inspect local storage')}${s.evidence?.missing.length ? `<details class="et-missing"><summary>Missing evidence references</summary><pre>${esc(s.evidence.missing.join('\n'))}</pre></details>` : ''}<small>Inspection is read-only. It neither deletes evidence nor marks records synchronized.</small></article>
      </div></section>`
    host.querySelectorAll<HTMLButtonElement>('[data-diagnostic]').forEach(el => el.onclick = () => void run(el.dataset.diagnostic!))
  }
  async function inspect(key: 'pi' | 'camera' | 'cloud' | 'storage') {
    const checkedConfiguration = s.configuration
    s.busy.add(key); s[key] = { message: 'Checking…' }; draw()
    try {
      if (key === 'pi') {
        const start = performance.now(), response = await checkPiHealth()
        if (s.configuration !== checkedConfiguration) throw new Error('Connection settings changed. Check the Pi again.')
        s.latency = Math.round(performance.now() - start)
        const metadata: Record<string, unknown> = {}
        for (const name of ['status', 'service', 'version', 'model'] as const) if (typeof response[name] === 'string') metadata[name] = response[name]
        if (Array.isArray(response.classes)) metadata.classes = response.classes.filter(value => typeof value === 'string')
        if (response.models && typeof response.models === 'object') metadata.models = Object.fromEntries(Object.entries(response.models).filter(([key, value]) => ['sashibocore', 'tailcut'].includes(key) && ['boolean', 'string'].includes(typeof value)))
        s.metadata = metadata
        s.pi = { message: 'Pi /status responded. This confirms API reachability; run a real grading check to validate inference.', checked: Date.now() }
      } else if (key === 'camera') {
        const blob = await capturePiImage()
        if (s.configuration !== checkedConfiguration) throw new Error('Connection settings changed. Test the camera again.')
        const bitmap = await createImageBitmap(blob)
        s.dimensions = `${bitmap.width} × ${bitmap.height}`; bitmap.close(); s.snapshot = blob
        s.camera = { message: 'Pi returned a decodable snapshot. Review framing and lighting in the preview.', checked: Date.now() }
      } else if (key === 'cloud') {
        const configured = isSupabaseConfigured(), reachable = configured && await checkCloudConnection()
        s.cloud = { message: !configured ? 'Supabase is not configured. Rebuild with the station cloud environment.' : reachable ? 'Gateway reachable · authentication and writes not tested.' : 'Cloud unreachable. Keep records locally and retry Sync now when internet is available.', error: !reachable, checked: Date.now() }
      } else {
        const estimate = await navigator.storage?.estimate(); s.usage = estimate?.usage; s.quota = estimate?.quota
        s.persistent = await navigator.storage?.persisted?.()
        s.caches = 'caches' in window ? await caches.keys() : []
        const ids = [...new Set(loadRecords().flatMap(row => row.capturedImageId ? [row.capturedImageId] : []))], missing: string[] = []
        let present = 0, bytes = 0
        for (const id of ids) { const evidence = await getCapturedEvidence(id); if (evidence) { present++; bytes += evidence.blob.size } else missing.push(id) }
        s.evidence = { present, missing, bytes }
        s.storage = { message: missing.length ? 'Some records reference evidence not available locally. Review these records before syncing.' : 'Local record evidence inspection finished; no missing referenced image Blobs were found.', error: missing.length > 0, checked: Date.now() }
      }
    } catch (error) {
      s[key] = { message: error instanceof Error ? error.message : 'Diagnostic unavailable. Check the station configuration.', error: true, checked: Date.now() }
      if (key === 'pi') { s.metadata = undefined; s.latency = undefined }
      if (key === 'camera') { s.snapshot = undefined; s.dimensions = undefined }
    } finally { s.busy.delete(key); draw() }
  }
  async function run(key: string) {
    if (s.busy.size) return
    if (key === 'all') {
      s.busy.add('all'); draw()
      await Promise.all(['pi', 'camera', 'cloud', 'storage'].map(key => inspect(key as 'pi' | 'camera' | 'cloud' | 'storage')))
      s.busy.delete('all'); draw()
    } else await inspect(key as 'pi' | 'camera' | 'cloud' | 'storage')
  }
  draw()
}
