import source from '../new ui/index (4).html?raw'
import { capturePiImage, gradePiImage, getPiSettings, checkPiHealth, PiIntegrationError } from './piClient'
import { initialSession, reducer, decisionFor, type Session, type SampleType, type Grade } from './kioskState'
import { saveCapturedEvidence, promoteCapturedEvidence, deleteCapturedEvidence } from './evidenceStorage'
import { experimentalPolicy, policyDescription } from './gradingPolicy'
import { sqliteSaveStatus } from './sqliteStore'
import { loadRecords, saveRecords, type GradingRecord } from './gradingRecords'
import { loadPriceSchedule, priceSnapshot } from './pricing'
import { syncPendingRecords, syncPriceSchedule } from './cloudSync'
import { hasAdminProfile, isSupabaseConfigured, sendAdminMagicLink } from './supabase'
import { createId } from './id'
import { showLoadingDial } from './exact-loading'
import { isDemoMode, setKioskDemoMode } from './demoMode'
import { enhanceAdmin } from './exact-admin'

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
  mode(w: Kiosk, demo: boolean) {
    const { S } = api(w)
    if (capturing || (S.core != null && ['core', 'tail', 'tailneed', 'final', 'receipt'].includes(S.scr))) { api(w).toast('Finish this grading session before switching modes.', 1); return }
    if (S.core != null) { S.core = S.tail = null; S.img = {}; S.captureTime = undefined; session = { ...initialSession, results: {} }; order = null }
    setKioskDemoMode(demo); localStorage.setItem('tunaeye-explicit-demo', String(demo)); api(w).S.cfg.demo = demo; api(w).R()
  },
  grade: () => decisionFor(session).grade ?? 'C',
  sampleGrade: (confidence: number) => Object.values(session.results).find(r => r?.originalConfidence === confidence)?.originalGrade ?? '—',
  async pin(pin: string, w?: Kiosk) {
    if (pin !== '1234') return false
    if (!isSupabaseConfigured() || ['localhost', '127.0.0.1'].includes(location.hostname)) return true
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
      if (!isDemoMode()) { persist(w); toast(await sqliteSaveStatus()) }
      const decision = decisionFor(session)
      if (decision.next === 'retake') { toast(decision.detail, 1); return }
      go(decision.next === 'tail' ? 'tailneed' : 'final')
    } catch (error) {
      if (error instanceof PiIntegrationError && error.status === 422) {
        if (temporaryId) await deleteCapturedEvidence(temporaryId).catch(() => {})
        toast(error.message, 1)
      } else toast(`${error instanceof Error ? error.message : 'Inference failed.'}${temporaryId ? ' Unvalidated capture remains saved locally; previous accepted evidence is unchanged.' : ''}`, 1)
    }
    finally { capturing = false; if (button?.isConnected) { button.disabled = false; button.textContent = 'Scan sample' } }
  },
  async sync(w: Kiosk) {
    const { S, R, toast } = api(w)
    try { const result = await syncPendingRecords(); if (result.synced > 0) localStorage.setItem('tunaeye-last-sync', new Date().toISOString()); S.hist = history(); R(); toast(result.firstError ?? `${result.synced} records verified in cloud`, result.failed || result.waiting ? 1 : 0) }
    catch (error) { toast(error instanceof Error ? error.message : 'Cloud sync unavailable.', 1) }
  },
  override(w: Kiosk) {
    const { S, go, toast } = api(w), d = w.document
    const overlay = d.createElement('div'); overlay.className = 'ovl'
    overlay.innerHTML = '<div class="sheet" role="dialog" aria-modal="true" aria-label="Manual override"><h2>Expert override</h2><label>Station PIN<input class="fi" id="expert-pin" type="password" inputmode="numeric" maxlength="4"></label><div class="g3">'+['A','B','C'].map(g=>`<button class="gopt" data-grade="${g}">${g}</button>`).join('')+'</div><input class="fi" id="expert-reason" placeholder="Reason for override"><div class="mf"><button class="xbn bo" id="expert-cancel">Cancel</button><button class="xpr" id="expert-save">Save override</button></div></div>'
    d.getElementById('stage')!.append(overlay); let selected: Grade = 'A'
    overlay.querySelectorAll<HTMLButtonElement>('[data-grade]').forEach(b => b.onclick = () => { selected = b.dataset.grade as Grade; overlay.querySelectorAll('[data-grade]').forEach(x => x.classList.toggle('on', x === b)) })
    overlay.querySelector<HTMLButtonElement>('#expert-cancel')!.onclick = () => overlay.remove()
    overlay.querySelector<HTMLButtonElement>('#expert-save')!.onclick = async () => {
      if (!await runtime.pin((overlay.querySelector('#expert-pin') as HTMLInputElement).value)) { toast('Incorrect PIN or hosted admin authorization required.', 1); return }
      const sample = session.results['Tail cut'] ? 'Tail cut' : 'Sashibo core'
      session = reducer(session, { type: 'setOverride', sample, grade: selected, reason: (overlay.querySelector('#expert-reason') as HTMLInputElement).value, actor: S.name, timestamp: new Date().toISOString() }); if (!isDemoMode()) persist(w); overlay.remove(); go('receipt')
    }
  },
  print(w: Kiosk) {
    if (decisionFor(session).next !== 'print') throw new Error('An expert must confirm the final grade.')
    if (!w.document.getElementById('thermal-print-rules')) {
      const style = w.document.createElement('style'); style.id = 'thermal-print-rules'
      style.textContent = '@media print{@page{size:58mm auto;margin:0}html,body{position:static!important;width:58mm!important;height:auto!important;overflow:visible!important;padding:0!important}body *{visibility:hidden!important}#stage{zoom:1!important;transform:none!important;border:0!important;overflow:visible!important}.rcl,.rcl *{visibility:visible!important}.rcl{position:absolute!important;left:0!important;top:0!important;width:58mm!important;transform:none!important}.rcl .pr{width:58mm!important}.rcl .ph{display:none!important}.rcl .pb{animation:none!important;transform:none!important;filter:none!important}}'
      w.document.head.append(style)
    }
    w.print(); return true
  },
  finish(w: Kiosk) { const { S, go } = api(w); S.hist = history(); go('done') },
  attach(w: Kiosk) {
    const { S, SC, RATE } = api(w)
    setKioskDemoMode(localStorage.getItem('tunaeye-explicit-demo') === 'true')
    S.cfg.demo = isDemoMode(); S.cfg.name = localStorage.getItem('tunaeye-station') ?? S.cfg.name
    S.cfg.url = getPiSettings().apiUrl; S.cfg.ep = '/grade'; S.hist = history(); Object.assign(RATE, loadPriceSchedule())
    const original = w.eval('R')
    ;(w as any).R = () => {
      S.cfg.demo = isDemoMode()
      original()
      const d = w.document, decision = decisionFor(session), sync = d.getElementById('sy')
      if (sync) sync.onclick = () => void runtime.sync(w)
      if (S.scr === 'final') {
        const button = d.getElementById('go')!
        if (decision.next === 'override') { d.querySelector('.v5h h1')!.textContent = 'Expert grade required'; button.textContent = 'Set final grade'; button.onclick = () => runtime.override(w); d.querySelectorAll('.med5-l,.gt5,.gs5').forEach(e => e.textContent = '—') }
        else button.onclick = () => { if (decision.next === 'print') api(w).go('receipt') }
        d.querySelectorAll('.lg5').forEach(e => e.textContent = `Model predictions · ${policyDescription}`)
      }
      const override = d.getElementById('ov'); if (override) override.onclick = () => runtime.override(w)
      d.querySelectorAll<HTMLElement>('#dmsw,[data-t="demo"]').forEach(e => { e.onclick = () => runtime.mode(w, !isDemoMode()); e.setAttribute('aria-checked', String(isDemoMode())) })
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
        d.querySelectorAll('.as > div').forEach(el => { if (el.textContent?.includes('System online')) el.textContent = navigator.onLine ? 'Network available · Pi not checked' : 'Network offline · records retained' })
      }
    }
    const done = SC.done; SC.done = () => { const screen = done(); screen.after = () => { const e = w.document.querySelector('.cdw'); if (e) { e.innerHTML = '<button class="pill">Grade another</button>'; e.querySelector('button')!.onclick = () => w.eval('fresh()') } }; return screen }
    api(w).R()
    if (tabletEntry) w.document.addEventListener('pointerdown', () => {
      if (!document.fullscreenElement) void document.documentElement.requestFullscreen?.().catch(() => {})
    }, { once: true, capture: true })
  },
}

export function launchExactUI() {
  ;(window as any).TunaEyeRuntime = runtime
  let html = source
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
  document.documentElement.style.cssText = 'height:100%;background:#f4f6fa'
  document.body.style.cssText = 'margin:0;height:100dvh;overflow:hidden'
  const frame = document.createElement('iframe'); frame.title = 'TunaEye'; frame.style.cssText = 'border:0;width:100%;height:100%;display:block'; frame.allow = 'fullscreen; camera; autoplay'; frame.srcdoc = html
  document.body.replaceChildren(frame)
  void showLoadingDial('Opening TunaEye')
  let landingReady = false
  const prepareLanding = () => {
    const landing = frame.contentWindow as Kiosk
    if (landingReady || !landing?.document.getElementById('kiosk-src') || typeof (landing as any).openKiosk !== 'function') return
    landingReady = true
    landing.document.addEventListener('click', event => {
      if ((event.target as Element)?.closest('[data-act="start"]')) void showLoadingDial('Opening grading kiosk')
    }, true)
    const tablet = navigator.maxTouchPoints > 0 && Math.min(screen.width, screen.height) >= 600 && (navigator.userAgent.includes('Android') || navigator.userAgent.includes('iPad') || navigator.platform === 'MacIntel')
    if (tablet) {
      tabletEntry = true
      landing.eval('window.openKiosk()')
      const fullscreen = () => { void document.documentElement.requestFullscreen?.().catch(() => {}); document.removeEventListener('pointerdown', fullscreen, true) }
      void document.documentElement.requestFullscreen?.().catch(() => document.addEventListener('pointerdown', fullscreen, true))
    }
  }
  frame.addEventListener('load', prepareLanding)
  const timer = setInterval(() => {
    prepareLanding()
    const child = frame.contentDocument?.querySelector<HTMLIFrameElement>('#kiosk-wrap iframe')?.contentWindow as Kiosk | null
    if (child && !(child as any).__tunaeyeAttached) {
      try { child.eval('S'); (child as any).__tunaeyeAttached = true; runtime.attach(child) } catch { /* Wait until the supplied kiosk has initialized. */ }
    }
  }, 100)
  window.addEventListener('pagehide', () => clearInterval(timer), { once: true })
  if ('serviceWorker' in navigator && import.meta.env.PROD) void navigator.serviceWorker.register('/sw.js')
}
