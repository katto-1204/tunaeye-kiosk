import source from '../new ui/index (4).html?raw'
import { capturePiImage, gradePiImage, getPiSettings, checkPiHealth, PiIntegrationError } from './piClient'
import { initialSession, reducer, decisionFor, type Session, type SampleType, type Grade } from './kioskState'
import { saveCapturedEvidence, promoteCapturedEvidence, deleteCapturedEvidence } from './evidenceStorage'
import { experimentalPolicy, policyDescription } from './gradingPolicy'
import { sqliteSaveStatus } from './sqliteStore'
import { loadRecords, saveRecords, type GradingRecord } from './gradingRecords'
import { loadPriceSchedule, priceSnapshot } from './pricing'
import { syncPendingRecords, syncPriceSchedule, SYNC_STATUS_EVENT, type SyncPhase } from './cloudSync'
import { checkCloudConnection, hasAdminProfile, isSupabaseConfigured, sendAdminMagicLink } from './supabase'
import { createId } from './id'
import { showLoadingDial } from './exact-loading'
import { isDemoMode, setKioskDemoMode, demoScenarios, getDemoScenario, setDemoScenario, type DemoScenario } from './demoMode'
import { enhanceAdmin } from './exact-admin'
import { showLiveReadiness } from './liveReadiness'
import { verifyAdminPin, mountPinSettings } from './adminPin'
import { registerPwa, requestPwaInstall } from './pwa'
import { printThermalReceipt } from './thermalReceipt'

type Kiosk = Window & { eval: (text: string) => any }
let session: Session = { ...initialSession }
let sessionId = createId(), order: number | null = null, capturing = false
let tabletEntry = false
const previews: Record<string, string> = {}
const api = (w: Kiosk) => w.eval('({S,SC,go,R,toast,modal,api,RATE})')
function history() {
  const groups = new Map<string, GradingRecord[]>()
  for (const row of loadRecords()) groups.set(row.sessionId, [...(groups.get(row.sessionId) ?? []), row])
  return [...groups.values()].map((rows, i) => {
    const core = rows.find(r => r.sample === 'Sashibo core') ?? rows[0], tail = rows.find(r => r.sample === 'Tail cut')
    return { id: core.id, ts: core.timestamp, w: parseFloat(core.weight), g: core.grade, loc: rows.every(r => r.transaction?.syncState === 'synced') ? 0 : 1, c: core.result?.originalConfidence, tl: tail?.result?.originalConfidence ?? null, n: core.grader, o: groups.size - i, amount: core.transaction?.amount, rate: core.transaction?.unitRatePerKg }
  })
}
function persist(w: Kiosk) {
  const { S } = api(w), decision = decisionFor(session)
  const rows: GradingRecord[] = Object.values(session.results).map(result => {
    const grade = decision.next === 'print' ? decision.grade! : result!.originalGrade ?? 'Invalid'
    return { id: `${sessionId}-${result!.sample === 'Tail cut' ? 2 : 1}`, sessionId, timestamp: S.captureTime ?? Date.now(), time: new Date().toLocaleTimeString(), grader: S.name, sample: result!.sample, fish: result!.fishId, weight: `${result!.weight} kg`, grade, status: result!.overrideGrade ? 'Override' : result!.status === 'valid' ? 'Complete' : result!.status, capturedImageId: `${sessionId}-${result!.sample === 'Tail cut' ? 2 : 1}`, result: { ...result! }, transaction: { currency: 'PHP', ...priceSnapshot(grade, result!.weight), syncState: 'pending' } }
  })
  saveRecords([...rows, ...loadRecords().filter(row => row.sessionId !== sessionId)])
}
function initialize(w: Kiosk) {
  const { S } = api(w)
  if (order !== S.order || (S.core == null && Object.keys(session.results).length > 0)) {
    session = { ...initialSession, graderName: S.name, fishWeights: { 'Fish 1': S.w }, results: {} }
    sessionId = createId(); order = S.order; S.captureTime = undefined
  }
}
const runtime = {
  async mode(w: Kiosk, demo: boolean) {
    const { S } = api(w)
    if (capturing || (S.core != null && ['core', 'tail', 'tailneed', 'final', 'receipt'].includes(S.scr))) { api(w).toast('Finish this grading session before switching modes.', 1); return }
    if (!demo && !await showLiveReadiness(w)) return
    if (S.core != null) { S.core = S.tail = null; S.img = {}; S.captureTime = undefined; session = { ...initialSession, results: {} }; order = null }
    setKioskDemoMode(demo); localStorage.setItem('tunaeye-explicit-demo', String(demo)); api(w).S.cfg.demo = demo; api(w).R()
  },
  grade: () => decisionFor(session).grade ?? 'C',
  sampleGrade: (confidence: number) => Object.values(session.results).find(r => r?.originalConfidence === confidence)?.originalGrade ?? '—',
  async pin(pin: string, w?: Kiosk) {
    if (w) api(w).S.pinError = ''
    try { if (!await verifyAdminPin(pin)) return false } catch (error) { if (w) api(w).S.pinError = error instanceof Error ? error.message : 'PIN unavailable'; return false }
    if (getPiSettings().mode !== 'hosted-gateway' || !isSupabaseConfigured()) return true
    if (await hasAdminProfile()) return true
    if (w) runtime.signIn(w)
    return false
  },
  signIn(w: Kiosk) {
    const d = w.document
    if (d.getElementById('hosted-admin-auth')) return
    const overlay = d.createElement('div'); overlay.className = 'ovl'; overlay.id = 'hosted-admin-auth'
    overlay.innerHTML = '<section class="sheet" role="dialog" aria-modal="true" aria-label="Hosted admin sign-in"><h2>Confirm admin access</h2><p>Use your registered Supabase administrator email.</p><input class="fi" type="email" aria-label="Administrator email"><p role="status"></p><div class="mf"><button class="xbn bo">Close</button><button class="xpr">Email sign-in link</button></div></section>'
    d.getElementById('stage')!.append(overlay)
    const buttons = overlay.querySelectorAll('button'); buttons[0].onclick = () => overlay.remove()
    buttons[1].onclick = async () => { buttons[1].disabled = true; try { await sendAdminMagicLink(overlay.querySelector('input')!.value); overlay.querySelector('[role="status"]')!.textContent = 'Open the sign-in link on this tablet, then enter the station PIN again.' } catch (e) { overlay.querySelector('[role="status"]')!.textContent = e instanceof Error ? e.message : 'Sign-in unavailable' } finally { buttons[1].disabled = false } }
  },
  async camera(w: Kiosk) {
    const { toast } = api(w), settings = getPiSettings(), doc = w.document
    const video = doc.getElementById('vid')
    if (!video) return
    const image = doc.createElement('img'); image.id = 'vid'; image.alt = 'Live Raspberry Pi camera'; image.style.cssText = 'width:100%;height:100%;object-fit:contain'
    if (settings.mode === 'hosted-gateway') image.crossOrigin = 'use-credentials'
    image.onerror = () => toast('Pi camera unavailable. Check station Wi-Fi and connection settings.', 1)
    video.replaceWith(image)
    if (settings.configured) { image.src = settings.streamUrl; const b = doc.getElementById('sh') as HTMLButtonElement; if (b) b.disabled = false }
    else toast('Configure the authenticated HTTPS gateway or open the Pi-hosted kiosk.', 1)
    const label = doc.getElementById('vres'); if (label) label.textContent = settings.mode === 'pi-local' ? 'Pi camera' : 'Pi stream'
  },
  async capture(w: Kiosk, key: string, file?: File) {
    if (capturing) return
    const { S, go, toast } = api(w), sample: SampleType = key === 'tail' ? 'Tail cut' : 'Sashibo core'
    initialize(w); capturing = true
    const button = w.document.getElementById('sh') as HTMLButtonElement | null
    if (button) { button.disabled = true; button.textContent = 'Grading…' }
    let temporaryId: string | undefined
    try {
      if (file && (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !file.size || file.size > 10 * 1024 * 1024)) throw new Error('Choose a JPEG, PNG or WebP image up to 10 MB.')
      const blob = file ?? await capturePiImage(sample)
      const bitmap = await createImageBitmap(blob); bitmap.close()
      const id = `${sessionId}-${key === 'tail' ? 2 : 1}`
      S.captureTime ??= Date.now()
      if (!isDemoMode()) {
        temporaryId = `${id}-pending-${createId()}`
        await saveCapturedEvidence({ id: temporaryId, sessionId, sample, fishId: 'Fish 1', capturedAt: S.captureTime, blob })
      }
      const result = await gradePiImage(blob, sample)
      if (result.outcome === 'invalid') {
        if (temporaryId) await deleteCapturedEvidence(temporaryId)
        toast('This image cannot be graded. Retake or upload another image.', 1); return
      }
      if (temporaryId) { await promoteCapturedEvidence(temporaryId, id); temporaryId = undefined }
      if (previews[key]) URL.revokeObjectURL(previews[key])
      previews[key] = URL.createObjectURL(blob)
      session = { ...session, fishWeights: { 'Fish 1': S.w }, selectedSamples: key === 'tail' ? ['Sashibo core', 'Tail cut'] : ['Sashibo core'], currentSampleIndex: key === 'tail' ? 1 : 0 }
      session = reducer(session, { type: 'finishAnalysis', outcome: result.outcome, grade: result.grade, confidence: result.confidence, rawConfidence: result.rawConfidence, inferenceId: result.id, captureId: result.captureId, scores: result.scores, imageType: result.imageType, modelSource: result.modelSource })
      S.img = { ...(S.img ?? {}), [key]: previews[key] }; S[key] = result.confidence
      if (key === 'core') S.tail = null
      let saveMessage: string | undefined
      if (!isDemoMode()) { persist(w); saveMessage = await sqliteSaveStatus() }
      const decision = decisionFor(session)
      if (decision.next === 'retake') { toast(decision.detail, 1); return }
      go(decision.next === 'tail' ? 'tailneed' : 'final')
      if (saveMessage) toast(saveMessage)
    } catch (error) {
      if (error instanceof PiIntegrationError && error.status === 422) {
        if (temporaryId) await deleteCapturedEvidence(temporaryId).catch(() => { })
        toast(error.message, 1)
      } else toast(`${error instanceof Error ? error.message : 'Inference failed.'}${temporaryId ? ' Unvalidated capture remains saved locally; previous accepted evidence is unchanged.' : ''}`, 1)
    }
    finally { capturing = false; if (button?.isConnected) { button.disabled = false; button.textContent = 'Scan sample' } }
  },
  async sync(w: Kiosk) {
    const { S, R, toast } = api(w)
    const button = w.document.getElementById('sy') as HTMLButtonElement | null
    const originalText = button?.textContent ?? 'Sync'
    const labelFor: Record<SyncPhase, string> = { offline: 'Offline', connecting: 'Connecting…', syncing: 'Syncing…', synced: 'Synced', failed: 'Failed' }
    const onStatus = (event: Event) => {
      const phase = (event as CustomEvent<{ phase: SyncPhase }>).detail?.phase
      if (button?.isConnected && phase) button.textContent = labelFor[phase]
    }
    window.addEventListener(SYNC_STATUS_EVENT, onStatus)
    if (button) { button.disabled = true; button.textContent = 'Connecting…' }
    try {
      const result = await syncPendingRecords()
      if (result.synced > 0) localStorage.setItem('tunaeye-last-sync', new Date().toISOString())
      S.hist = history(); R()
      const msg = result.firstError ?? (result.synced > 0 ? `Synced: ${result.synced} record${result.synced === 1 ? '' : 's'} verified in cloud` : 'Synced: all records up to date')
      toast(msg, result.failed || result.waiting ? 1 : 0)
    }
    catch (error) { toast(error instanceof Error ? error.message : 'Cloud sync unavailable.', 1) }
    finally {
      window.removeEventListener(SYNC_STATUS_EVENT, onStatus)
      if (button?.isConnected) { button.disabled = false; button.textContent = originalText }
    }
  },
  override(w: Kiosk) {
    const { S, go, toast } = api(w), d = w.document
    const overlay = d.createElement('div'); overlay.className = 'ovl'
    overlay.innerHTML = '<div class="sheet" role="dialog" aria-modal="true" aria-label="Manual override"><h2>Expert override</h2><label>Station PIN<input class="fi" id="expert-pin" type="password" inputmode="numeric" maxlength="4"></label><div class="g3">' + ['A', 'B', 'C'].map(g => `<button class="gopt" data-grade="${g}">${g}</button>`).join('') + '</div><input class="fi" id="expert-reason" placeholder="Reason for override"><div class="mf"><button class="xbn bo" id="expert-cancel">Cancel</button><button class="xpr" id="expert-save">Save override</button></div></div>'
    d.getElementById('stage')!.append(overlay); let selected: Grade = 'A'
    overlay.querySelectorAll<HTMLButtonElement>('[data-grade]').forEach(b => b.onclick = () => { selected = b.dataset.grade as Grade; overlay.querySelectorAll('[data-grade]').forEach(x => x.classList.toggle('on', x === b)) })
    overlay.querySelector<HTMLButtonElement>('#expert-cancel')!.onclick = () => overlay.remove()
    overlay.querySelector<HTMLButtonElement>('#expert-save')!.onclick = async () => {
      if (!await runtime.pin((overlay.querySelector('#expert-pin') as HTMLInputElement).value)) { toast('Incorrect PIN or hosted admin authorization required.', 1); return }
      const sample = session.results['Tail cut'] ? 'Tail cut' : 'Sashibo core'
      session = reducer(session, { type: 'setOverride', sample, grade: selected, reason: (overlay.querySelector('#expert-reason') as HTMLInputElement).value, actor: S.name, timestamp: new Date().toISOString() }); if (!isDemoMode()) persist(w); overlay.remove(); go('receipt')
    }
  },
  async print(w: Kiosk) {
    const { S } = api(w)
    if (S.scr === 'detail') {
      const records = loadRecords(), anchor = records.find(record => record.id === S.detail?.id)
      if (!anchor) throw new Error('The saved grading record is unavailable. Reopen it from Records.')
      const results: Session['results'] = {}
      for (const row of records.filter(record => record.sessionId === anchor.sessionId)) {
        if (!row.result || !['Sashibo core', 'Tail cut'].includes(row.sample) || !['valid', 'uncertain', 'invalid'].includes(row.result.status)) continue
        const sample = row.sample as SampleType
        const asGrade = (value: string | null | undefined): Grade | null => value === 'A' || value === 'B' || value === 'C' ? value : null
        results[sample] = { ...row.result, sample, fishId: row.fish, status: row.result.status as 'valid' | 'uncertain' | 'invalid', originalGrade: asGrade(row.result.originalGrade), overrideGrade: asGrade(row.result.overrideGrade), overrideReason: row.result.overrideReason ?? '', captured: true, weight: String(parseFloat(row.weight)) }
      }
      const decision = decisionFor({ ...initialSession, results }), prices = anchor.transaction
      if (decision.next !== 'print' || decision.grade !== anchor.grade) throw new Error('This saved session does not have a confirmed final grade.')
      if (!prices || typeof prices.unitRatePerKg !== 'number' || !Number.isFinite(prices.unitRatePerKg) || prices.unitRatePerKg < 0 || typeof prices.amount !== 'number' || !Number.isFinite(prices.amount) || prices.amount < 0) throw new Error('The original receipt price snapshot is unavailable. Current rates will not be substituted.')
      const receiptOrder = Number(S.detail.o)
      if (!Number.isSafeInteger(receiptOrder) || receiptOrder < 1) throw new Error('The saved receipt order is unavailable.')
      const sample = (key: SampleType) => { const result = results[key]; return result ? { grade: result.originalGrade ?? 'Invalid', confidence: result.originalConfidence } : undefined }
      return printThermalReceipt(w, { station: S.cfg.name, order: `TE_${String(receiptOrder).padStart(4, '0')}`, grader: anchor.grader, timestamp: anchor.timestamp, weight: parseFloat(anchor.weight), grade: decision.grade!, unitRatePerKg: prices.unitRatePerKg, total: prices.amount, core: sample('Sashibo core'), tail: sample('Tail cut'), demo: false })
    }
    if (decisionFor(session).next !== 'print') throw new Error('An expert must confirm the final grade.')
    const grade = decisionFor(session).grade!, saved = loadRecords().find(record => record.sessionId === sessionId)
    const prices = saved?.transaction ?? priceSnapshot(grade, S.w)
    const sample = (key: SampleType) => { const result = session.results[key]; return result ? { grade: result.originalGrade ?? 'Invalid', confidence: result.originalConfidence } : undefined }
    return printThermalReceipt(w, { station: S.cfg.name, order: `TE_${String(S.order).padStart(4, '0')}`, grader: S.name, timestamp: S.captureTime ?? Date.now(), weight: S.w, grade, unitRatePerKg: prices.unitRatePerKg ?? null, total: prices.amount, core: sample('Sashibo core'), tail: sample('Tail cut'), demo: isDemoMode() })
  },
  finish(w: Kiosk) { const { S, go } = api(w); S.hist = history(); go('done') },
  attach(w: Kiosk) {
    const { S, SC, RATE } = api(w)
    setKioskDemoMode(localStorage.getItem('tunaeye-explicit-demo') === 'true')
    S.cfg.demo = isDemoMode(); S.cfg.name = localStorage.getItem('tunaeye-station') ?? S.cfg.name
    S.cfg.url = getPiSettings().apiUrl; S.cfg.ep = '/grade'; S.hist = history(); Object.assign(RATE, loadPriceSchedule())
    const original = w.eval('R')
      ; (w as any).R = () => {
        S.cfg.demo = isDemoMode()
        original()
        const d = w.document, decision = decisionFor(session), sync = d.getElementById('sy')
        if (S.scr === 'pin') {
          let busy = false
          const update = () => { d.querySelectorAll('.pb4 i').forEach((dot, index) => dot.classList.toggle('f', index < S.pin.length)); const button = d.getElementById('go') as HTMLButtonElement; if (button) button.disabled = busy || S.pin.length < 4 }
          const verify = async () => {
            if (busy || S.pin.length !== 4) return
            busy = true; update()
            const accepted = await runtime.pin(S.pin, w); S.pin = ''; busy = false
            if (S.scr !== 'pin') return
            if (accepted) { S.tab = 'overview'; api(w).go('admin'); api(w).toast('Signed in as Admin') }
            else { update(); if (!d.getElementById('hosted-admin-auth')) api(w).toast(S.pinError || 'Incorrect PIN. Try again.', 1) }
          }
          d.querySelectorAll<HTMLButtonElement>('.kp button[data-k]').forEach(button => {
            button.onclick = () => {
              if (busy) return
              S.pin = button.dataset.k === 'd' ? S.pin.slice(0, -1) : S.pin.length < 4 ? S.pin + button.dataset.k : S.pin
              update()
              if (S.pin.length === 4) void verify()
            }
          })
          const button = d.getElementById('go'); if (button) button.onclick = () => void verify()
        }
        if (sync) sync.onclick = () => void runtime.sync(w)
        if (S.scr === 'final') {
          const button = d.getElementById('go')!
          if (decision.next === 'override') { d.querySelector('.v5h h1')!.textContent = 'Expert grade required'; button.textContent = 'Set final grade'; button.onclick = () => runtime.override(w); d.querySelectorAll('.med5-l,.gt5,.gs5').forEach(e => e.textContent = '—') }
          else button.onclick = () => { if (decision.next === 'print') api(w).go('receipt') }
          d.querySelectorAll('.lg5').forEach(e => e.textContent = `Model predictions · ${policyDescription}`)
        }
        const override = d.getElementById('ov'); if (override) override.onclick = () => runtime.override(w)
        d.querySelectorAll<HTMLElement>('#dmsw,[data-t="demo"]').forEach(e => { e.onclick = () => runtime.mode(w, !isDemoMode()); e.setAttribute('aria-checked', String(isDemoMode())) })
        if (S.scr === 'name') {
          const start = d.getElementById('go') as HTMLButtonElement, proceed = start.onclick
          start.onclick = async event => {
            if (start.disabled) return
            start.disabled = true
            try { if (isDemoMode() || await showLiveReadiness(w)) proceed?.call(start, event) }
            finally { if (start.isConnected) start.disabled = !S.name.trim() }
          }
          if (isDemoMode()) {
            const choices = d.createElement('select'); choices.setAttribute('aria-label', 'Demo scenario'); choices.className = 'inp'; choices.style.cssText = 'position:absolute;left:14px;bottom:14px;z-index:5;width:auto;max-width:190px;height:26px;padding:0 22px 0 10px;border-radius:999px;font-size:11px;font-weight:700;box-shadow:0 2px 8px rgba(18,59,112,.12)'
            choices.innerHTML = demoScenarios().map(item => `<option value="${item.id}" title="${item.detail}">${item.label}</option>`).join(''); choices.value = getDemoScenario()
            choices.onchange = () => setDemoScenario(choices.value as DemoScenario); (start.parentElement!.parentElement ?? start.parentElement!).append(choices)
          }
        }
        if (isDemoMode() && S.scr === 'final') d.querySelectorAll('.lg5').forEach(e => e.textContent = 'Simulated prediction · Demo only · Not saved as an operational grade')
        const install = d.getElementById('ia'); if (install) install.onclick = async () => api(w).toast(await requestPwaInstall())
        if (S.scr === 'receipt') { const skip = d.getElementById('sk'); if (skip) skip.onclick = () => api(w).modal({ title: 'Skip printing?', body: 'The record remains saved locally.', ok: 'Skip receipt', onOk: () => runtime.finish(w) }) }
        if (S.scr === 'admin' && S.tab === 'devices') {
          d.querySelectorAll('.bd.ok').forEach(e => e.textContent = 'Not verified')
          const b = d.createElement('button'); b.className = 'xpr'; b.textContent = 'Check Raspberry Pi'; b.onclick = async () => { try { await checkPiHealth(); api(w).toast('Pi status endpoint reachable') } catch (e) { api(w).toast(e instanceof Error ? e.message : 'Pi unavailable', 1) } }; d.querySelector('.ab2')?.append(b)
        }
        const save = d.getElementById('sv')
        if (save) save.onclick = async () => {
          if (S.tab === 'prices') {
            const prices = { ...loadPriceSchedule() }; for (const input of d.querySelectorAll<HTMLInputElement>('.pi')) { const value = Number(input.value); if (!Number.isFinite(value) || value < 0) { api(w).toast('Enter non-negative prices.', 1); return }; prices[input.dataset.g as Grade] = value }
            localStorage.setItem('tunaeye-prices', JSON.stringify(prices)); Object.assign(RATE, prices)
            try { await syncPriceSchedule(prices); api(w).toast('Price schedule saved and verified') } catch { api(w).toast('Prices saved locally. Cloud sync unavailable.', 1) }
          } else { localStorage.setItem('tunaeye-station', S.cfg.name); localStorage.setItem('tunaeye-rpi-url', S.cfg.url); localStorage.setItem('tunaeye-model-name', S.cfg.model); api(w).toast('Station settings saved') }
        }
        if (S.scr === 'admin') {
          enhanceAdmin(w, { refresh: () => api(w).R(), notice: (text, error) => api(w).toast(text, error ? 1 : 0), setDemo: value => runtime.mode(w, value) })
          if (S.tab === 'settings') { const host = d.querySelector<HTMLElement>('.ea'); if (host) mountPinSettings(w, host) }
          d.querySelectorAll('.as > div').forEach(el => { if (el.textContent?.includes('System online')) el.textContent = navigator.onLine ? 'Network available · Pi not checked' : 'Network offline · records retained' })
        }
      }
    const done = SC.done; SC.done = () => { const screen = done(); screen.after = () => { const e = w.document.querySelector('.cdw'); if (e) { e.innerHTML = '<button class="pill">Grade another</button>'; e.querySelector('button')!.onclick = () => w.eval('fresh()') } }; return screen }
    api(w).R()
    if (tabletEntry) w.document.addEventListener('pointerdown', () => {
      if (!document.fullscreenElement) void document.documentElement.requestFullscreen?.().catch(() => { })
    }, { once: true, capture: true })
    if (!w.document.getElementById('te-net-pill')) {
      const pill = w.document.createElement('div')
      pill.id = 'te-net-pill'
      pill.setAttribute('aria-live', 'polite')
      pill.style.cssText = 'position:fixed;right:12px;bottom:10px;z-index:25;pointer-events:none;display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;font:700 11px/1.2 Inter,system-ui,sans-serif;background:rgba(255,255,255,.92);color:#182842;border:1px solid rgba(18,59,112,.14);box-shadow:0 2px 8px rgba(18,59,112,.10);backdrop-filter:blur(6px)'
      w.document.body.append(pill)
      const barsSvg = (bars: number, color: string) => `<svg width="14" height="12" viewBox="0 0 14 12" aria-hidden="true">${[0, 1, 2].map(i => `<rect x="${i * 5}" y="${8 - i * 3}" width="3" height="${4 + i * 3}" rx="1" fill="${i < bars ? color : '#cbd5e1'}"/>`).join('')}</svg>`
      const refreshNetPill = async () => {
        if (!pill.isConnected) return
        const settings = getPiSettings()
        let piOk = false, piMs = 999
        if (settings.configured) {
          const started = performance.now()
          try {
            const res = await fetch(`${settings.apiUrl}/status`, { cache: 'no-store', credentials: settings.mode === 'hosted-gateway' ? 'include' : 'omit', signal: AbortSignal.timeout(2500) })
            piOk = res.ok
            piMs = Math.round(performance.now() - started)
          } catch { piOk = false }
        }
        const cloudOk = navigator.onLine && isSupabaseConfigured() ? await checkCloudConnection().catch(() => false) : false
        const connRtt = (navigator as unknown as { connection?: { rtt?: number } }).connection?.rtt ?? 120
        const rtt = piOk ? piMs : connRtt
        const bars = !navigator.onLine && !piOk ? 0 : rtt < 100 ? 3 : rtt < 300 ? 2 : 1
        const color = piOk ? '#16a34a' : cloudOk ? '#2563eb' : navigator.onLine ? '#d97706' : '#dc2626'
        const label = piOk
          ? (cloudOk ? 'TunaRpi · Inference ON · Cloud ready' : 'TunaRpi · Saved locally · Inference ON')
          : cloudOk
            ? 'Wi-Fi · Cloud ready'
            : (navigator.onLine ? 'Wi-Fi · Saved locally' : 'Offline · Saved locally')
        pill.innerHTML = `${barsSvg(bars, color)}<span>${label}</span>`
      }
      void refreshNetPill()
      const netTimer = w.setInterval(() => { void refreshNetPill() }, 15_000)
      const onNet = () => { void refreshNetPill() }
      window.addEventListener('online', onNet)
      window.addEventListener('offline', onNet)
      w.addEventListener('pagehide', () => { w.clearInterval(netTimer); window.removeEventListener('online', onNet); window.removeEventListener('offline', onNet) }, { once: true })
    }
  },
}

export function launchExactUI(showBootDial = true) {
  registerPwa()
    ; (window as any).TunaEyeRuntime = runtime
  let html = source
  html = html.replace(/<link[^>]+fonts\.(?:googleapis|gstatic)\.com[^>]*rel=["']preconnect["'][^>]*>\s*/gi, '')
  html = html.replace(/https:\/\/fonts\.googleapis\.com\/css2\?[^"'\s<>\\)]+/g, '/fonts/exact-ui.css')
  if (experimentalPolicy) html = html.replaceAll('under 80%', 'outside acceptance policy').replaceAll('below 80%', 'outside acceptance policy').replaceAll('≥ 80%', 'accepted by policy').replaceAll('80% or above', 'accepted by policy')
  html = html.replace(/gradeOf=\(\)=>lt\(S\.tail==null\?S\.core:\(S\.core\+S\.tail\)\/2\)/, 'gradeOf=()=>window.top.TunaEyeRuntime.grade()')
  html = html.replace("lt=v=>v>=90?'A':v>=80?'B':'C'", 'lt=v=>window.top.TunaEyeRuntime.sampleGrade(v)')
  html = html.replace('n>=20&&n<=200', 'n>=15&&n<=200').replaceAll('Minimum weight is 20 kg', 'Minimum weight is 15 kg').replaceAll('20–200 kg', '15–200 kg').replaceAll('Min 20 kg', 'Min 15 kg')
  html = html.replaceAll('n<20', 'n<15').replaceAll('f&&f.size<=10485760&&shoot(k,f)', 'f&&shoot(k,f)').replace('tot=w*RATE[g]', 'tot=o.amount??w*RATE[g]')
  html = html.replace(/async function camStart\(\)[\s\S]*?\nfunction camShot/, 'async function camStart(){return window.top.TunaEyeRuntime.camera(window)}\nfunction camShot')
  html = html.replace(/async function shoot\(k,file\)[\s\S]*?\nconst rcpt=/, 'async function shoot(k,file){return window.top.TunaEyeRuntime.capture(window,k,file)}\nconst rcpt=')
  html = html.replace(/function fin\(\)[^\n]*/, 'function fin(){window.top.TunaEyeRuntime.finish(window)}')
  html = html.replace('pin:p=>p===\'1234\'', 'pin:p=>window.top.TunaEyeRuntime.pin(p,window)').replace('print:async()=>true', 'print:async()=>window.top.TunaEyeRuntime.print(window)')
  html = html.replace('S.hist=ok?L:seedHist()', 'S.hist=[]').replace("S.cfg.demo=localStorage.getItem('te-demo')!=='0'", 'S.cfg.demo=false')
  html = html.replace("setTimeout(()=>{if(S.scr==='receipt')printIt(fin)},650)", "const receiptPrintButton=$('#orb');setTimeout(()=>{if(S.scr==='receipt'&&$('#orb')===receiptPrintButton)printIt(fin)},1000)")
  html = html.replaceAll('</head>', '<style>@media(pointer:coarse){.scr>*,.v5row>*,.ltvf,.ltside,.v5h,.med5-l,.dhero,.dsc,.dsr,.drow,.rcr,tr.r,.st,.vs,.sp5{animation-name:none!important}}</style></head>')
  document.documentElement.style.cssText = 'height:100%;background:#f4f6fa'
  document.body.style.cssText = 'margin:0;height:100dvh;overflow:hidden'
  const frame = document.createElement('iframe'); frame.title = 'TunaEye'; frame.style.cssText = 'border:0;width:100%;height:100%;display:block'; frame.allow = 'fullscreen; camera; autoplay'; frame.srcdoc = html
  document.body.replaceChildren(frame)
  if (showBootDial) void showLoadingDial('Opening TunaEye')
  let landingReady = false
  const prepareLanding = () => {
    const landing = frame.contentWindow as Kiosk
    if (landingReady || !landing?.document.getElementById('kiosk-src') || typeof (landing as any).openKiosk !== 'function') return
    landingReady = true
    landing.document.addEventListener('click', event => {
      if ((event.target as Element)?.closest('[data-act="install"]')) { event.preventDefault(); event.stopImmediatePropagation(); void requestPwaInstall().then(message => landing.alert(message)); return }
      if ((event.target as Element)?.closest('[data-act="start"]')) void showLoadingDial('Opening grading kiosk')
    }, true)
    const tablet = navigator.maxTouchPoints > 0 && Math.min(screen.width, screen.height) >= 600 && (navigator.userAgent.includes('Android') || navigator.userAgent.includes('iPad') || navigator.platform === 'MacIntel')
    if (tablet) {
      tabletEntry = true
      landing.eval('window.openKiosk()')
      const fullscreen = () => { void document.documentElement.requestFullscreen?.().catch(() => { }); document.removeEventListener('pointerdown', fullscreen, true) }
      void document.documentElement.requestFullscreen?.().catch(() => document.addEventListener('pointerdown', fullscreen, true))
    }
  }
  frame.addEventListener('load', prepareLanding)
  const timer = setInterval(() => {
    prepareLanding()
    const child = frame.contentDocument?.querySelector<HTMLIFrameElement>('#kiosk-wrap iframe')?.contentWindow as Kiosk | null
    if (child && !(child as any).__tunaeyeAttached) {
      try { child.eval('S'); runtime.attach(child); (child as any).__tunaeyeAttached = true } catch (error) { console.error('Kiosk initialization failed', error) }
    }
  }, 100)
  const autoSyncIfReachable = async () => {
    if (!isSupabaseConfigured() || !navigator.onLine) return
    if (!loadRecords().some(record => record.transaction?.syncState !== 'synced')) return
    if (!await checkCloudConnection()) return
    const result = await syncPendingRecords().catch(() => null)
    if (result && result.synced > 0) {
      localStorage.setItem('tunaeye-last-sync', new Date().toISOString())
      const child = frame.contentDocument?.querySelector<HTMLIFrameElement>('#kiosk-wrap iframe')?.contentWindow as Kiosk | null
      if (child && (child as any).__tunaeyeAttached) {
        try { const { S, R } = api(child); S.hist = history(); R() } catch { }
      }
    }
  }
  const onVisible = () => { if (document.visibilityState === 'visible') void autoSyncIfReachable() }
  const onOnline = () => { void autoSyncIfReachable() }
  window.addEventListener('online', onOnline)
  document.addEventListener('visibilitychange', onVisible)
  const syncTimer = setInterval(() => { void autoSyncIfReachable() }, 30_000)
  window.addEventListener('pagehide', () => { clearInterval(timer); clearInterval(syncTimer); window.removeEventListener('online', onOnline); document.removeEventListener('visibilitychange', onVisible) }, { once: true })
}
