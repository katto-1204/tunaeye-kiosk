import source from '../new ui/index (4).html?raw'
import { capturePiImage, gradePiImage, getPiSettings, checkPiHealth, PiIntegrationError } from './piClient'
import { initialSession, reducer, decisionFor, combineGrades, ACCEPT_CONFIDENCE, type Session, type SampleType, type Grade } from './kioskState'
import { saveCapturedEvidence, promoteCapturedEvidence, deleteCapturedEvidence } from './evidenceStorage'
import { experimentalPolicy, policyDescription } from './gradingPolicy'
import { sqliteSaveStatus } from './sqliteStore'
import { loadRecords, saveRecords, type GradingRecord } from './gradingRecords'
import { loadPriceSchedule, priceSnapshot } from './pricing'
import { syncPendingRecords, syncPriceSchedule, syncGradersToCloud, SYNC_STATUS_EVENT, type SyncPhase } from './cloudSync'
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
let activeCameraSource = typeof localStorage !== 'undefined' ? (localStorage.getItem('tunaeye-camera-source') || 'pi') : 'pi'
let droidcamUrl = typeof localStorage !== 'undefined' ? (localStorage.getItem('tunaeye-droidcam-url') || 'http://192.168.1.2:4747') : 'http://192.168.1.2:4747'
const normalizeDroidcamUrl = (raw: string) => {
  const trimmed = raw.trim().replace(/\/+$/, '')
  if (!trimmed) return 'http://192.168.1.2:4747'
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`
  return /:\d+$/.test(withProto) ? withProto : `${withProto}:4747`
}
const preliminaryGrade = (): Grade => {
  const decided = decisionFor(session).grade
  if (decided) return decided
  const s = session.results['Sashibo core'], t = session.results['Tail cut']
  if (s?.originalGrade && t?.originalGrade) return s.originalGrade === t.originalGrade ? s.originalGrade : combineGrades(s, t).grade
  return s?.originalGrade ?? t?.originalGrade ?? 'A'
}
let localStream: MediaStream | null = null
const stopLocalStream = () => { if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null } }
const api = (w: Kiosk) => w.eval('({S,SC,go,R,toast,modal,api,RATE})')
function history(graderName?: string) {
  const target = graderName?.trim().toLowerCase()
  const groups = new Map<string, GradingRecord[]>()
  for (const row of loadRecords()) {
    if (target && row.grader.trim().toLowerCase() !== target) continue
    groups.set(row.sessionId, [...(groups.get(row.sessionId) ?? []), row])
  }
  return [...groups.values()].map((rows, i) => {
    const core = rows.find(r => r.sample === 'Sashibo core') ?? rows[0], tail = rows.find(r => r.sample === 'Tail cut')
    return { id: core.id, ts: core.timestamp, w: parseFloat(core.weight), g: core.grade, loc: rows.every(r => r.transaction?.syncState === 'synced') ? 0 : 1, c: core.result?.originalConfidence, tl: tail?.result?.originalConfidence ?? null, n: core.grader, o: groups.size - i, amount: core.transaction?.amount, rate: core.transaction?.unitRatePerKg }
  })
}
function registerGrader(name: string) {
  const clean = name.trim()
  if (!clean) return
  try {
    const existing = JSON.parse(localStorage.getItem('tunaeye-graders') ?? '[]')
    const list = Array.isArray(existing) ? existing.filter((x): x is string => typeof x === 'string' && x.trim().length > 0) : []
    if (!list.some(item => item.toLocaleLowerCase() === clean.toLocaleLowerCase())) {
      localStorage.setItem('tunaeye-graders', JSON.stringify([clean, ...list]))
    }
    if (navigator.onLine && isSupabaseConfigured()) void syncGradersToCloud([clean])
  } catch {
    localStorage.setItem('tunaeye-graders', JSON.stringify([clean]))
    if (navigator.onLine && isSupabaseConfigured()) void syncGradersToCloud([clean])
  }
}
function persist(w: Kiosk) {
  const { S } = api(w), decision = decisionFor(session)
  registerGrader(S.name)
  const rows: GradingRecord[] = Object.values(session.results).map(result => {
    const grade = decision.next === 'print' ? decision.grade! : result!.originalGrade ?? 'Invalid'
    const isDemo = result!.modelSource === 'demo'
    return { id: `${sessionId}-${result!.sample === 'Tail cut' ? 2 : 1}`, sessionId, timestamp: S.captureTime ?? Date.now(), time: new Date().toLocaleTimeString(), grader: S.name, sample: result!.sample, fish: result!.fishId, weight: `${result!.weight} kg`, grade, status: result!.overrideGrade ? 'Override' : result!.status === 'valid' ? 'Complete' : result!.status, capturedImageId: isDemo ? undefined : `${sessionId}-${result!.sample === 'Tail cut' ? 2 : 1}`, result: { ...result! }, transaction: { currency: 'PHP', ...priceSnapshot(grade, result!.weight), syncState: 'pending' } }
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
  grade: () => preliminaryGrade(),
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
    const current = doc.getElementById('vid')
    if (!current) return
    if (activeCameraSource === 'droidcam') {
      stopLocalStream()
      const base = normalizeDroidcamUrl(droidcamUrl)
      const image = doc.createElement('img'); image.id = 'vid'; image.alt = 'Live DroidCam stream'; image.style.cssText = 'width:100%;height:100%;object-fit:contain'
      image.crossOrigin = 'anonymous'
      image.onerror = () => toast(`DroidCam unreachable at ${base}. Check phone IP & port (:4747) on this Wi-Fi.`, 1)
      current.replaceWith(image)
      image.src = `${base}/video`
      const b = doc.getElementById('sh') as HTMLButtonElement | null; if (b) b.disabled = false
      const label = doc.getElementById('vres'); if (label) label.textContent = `DroidCam (${base.replace(/^https?:\/\//, '')})`
      return
    }
    if (activeCameraSource !== 'pi') {
      stopLocalStream()
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Browser webcam blocked on HTTP. Use DroidCam URL (:4747), Upload image, or allow http://10.42.0.1:5000 in chrome://flags/#unsafely-treat-insecure-origin-as-secure.')
        const videoConstraint: MediaTrackConstraints = activeCameraSource === 'device'
          ? { width: { ideal: 1280 }, height: { ideal: 720 } }
          : { deviceId: { exact: activeCameraSource }, width: { ideal: 1280 }, height: { ideal: 720 } }
        localStream = await navigator.mediaDevices.getUserMedia({ video: videoConstraint, audio: false })
        const video = doc.createElement('video'); video.id = 'vid'; video.autoplay = true; video.playsInline = true; video.muted = true
        video.style.cssText = 'width:100%;height:100%;object-fit:cover'
        current.replaceWith(video)
        video.srcObject = localStream
        await video.play().catch(() => { })
        const track = localStream.getVideoTracks()[0], trSettings = track?.getSettings?.() ?? {}
        const label = doc.getElementById('vres')
        if (label) label.textContent = trSettings.width && trSettings.height ? `${trSettings.width}×${trSettings.height}` : (track?.label || 'Device camera')
        const b = doc.getElementById('sh') as HTMLButtonElement | null; if (b) b.disabled = false
        return
      } catch (error) {
        stopLocalStream()
        toast(error instanceof Error ? error.message : 'Could not open selected camera.', 1)
        const label = doc.getElementById('vres'); if (label) label.textContent = 'Camera blocked on HTTP'
        return
      }
    }
    stopLocalStream()
    const image = doc.createElement('img'); image.id = 'vid'; image.alt = 'Live Raspberry Pi camera'; image.style.cssText = 'width:100%;height:100%;object-fit:contain'
    if (settings.mode === 'hosted-gateway') image.crossOrigin = 'use-credentials'
    image.onerror = () => toast('Pi camera unavailable. Check station Wi-Fi or switch camera on the side.', 1)
    current.replaceWith(image)
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
      let blob: Blob
      if (file) {
        blob = file
      } else if (activeCameraSource === 'droidcam') {
        const base = normalizeDroidcamUrl(droidcamUrl)
        try {
          const res = await fetch(`${base}/shot.jpg`, { cache: 'no-store', signal: AbortSignal.timeout(4000) })
          if (!res.ok) throw new Error(`DroidCam returned HTTP ${res.status}`)
          const fetched = await res.blob()
          if (!fetched.size) throw new Error('DroidCam returned empty snapshot.')
          blob = fetched
        } catch {
          const imgEl = w.document.getElementById('vid') as HTMLImageElement | null
          if (imgEl && imgEl.tagName === 'IMG' && imgEl.naturalWidth > 0) {
            const canvas = w.document.createElement('canvas')
            canvas.width = imgEl.naturalWidth; canvas.height = imgEl.naturalHeight
            canvas.getContext('2d')!.drawImage(imgEl, 0, 0)
            const captured = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92))
            if (!captured || captured.size === 0) throw new Error(`Could not capture frame from DroidCam (${base}).`)
            blob = captured
          } else {
            throw new Error(`DroidCam snapshot failed at ${base}/shot.jpg. Check DroidCam Wi-Fi IP or use Upload image.`)
          }
        }
      } else {
        const videoEl = w.document.getElementById('vid')
        if (activeCameraSource !== 'pi' && videoEl?.tagName === 'VIDEO' && (videoEl as HTMLVideoElement).videoWidth > 0) {
          const vid = videoEl as HTMLVideoElement
          const canvas = w.document.createElement('canvas')
          canvas.width = vid.videoWidth; canvas.height = vid.videoHeight
          canvas.getContext('2d')!.drawImage(vid, 0, 0)
          const captured = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92))
          if (!captured || captured.size === 0) throw new Error('Could not capture frame from selected camera.')
          blob = captured
        } else {
          blob = await capturePiImage(sample)
        }
      }
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
      if (key === 'core') {
        const d = w.document
        d.getElementById('tail-avail-modal')?.remove()
        const overlay = d.createElement('div'); overlay.className = 'ovl'; overlay.id = 'tail-avail-modal'
        const below = result.confidence !== null && result.confidence < ACCEPT_CONFIDENCE
        const chipBg = below ? '#fff4db' : '#eaf8f0', chipFg = below ? '#925800' : '#17804c'
        overlay.innerHTML = `<section class="sheet" role="dialog" aria-modal="true" aria-labelledby="ta-title" style="width:min(480px,94%);padding:28px;border-radius:26px;background:#fff;color:#182842;font-family:Inter,system-ui,sans-serif;box-shadow:0 24px 60px -16px rgba(11,26,58,.28)">
          <div style="display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:999px;background:${chipBg};color:${chipFg};font-size:12px;font-weight:700;margin-bottom:14px">Sashibo Core · Grade ${result.grade ?? '—'} · ${result.confidence ?? '—'}%${below ? ` (Below ${ACCEPT_CONFIDENCE}%)` : ''}</div>
          <h2 id="ta-title" style="margin:0 0 8px;font-size:24px;letter-spacing:-.025em;line-height:1.2">Is a Tail-Cut sample available?</h2>
          <p style="margin:0 0 22px;font-size:14px;line-height:1.5;color:#5b6b84">Scan a Tail-Cut sample if available. If not, this assessment will be marked <b>PROVISIONAL</b> and require authorized grader confirmation.</p>
          <div style="display:grid;gap:10px">
            <button type="button" id="ta-yes" style="width:100%;height:50px;border-radius:999px;border:0;background:linear-gradient(135deg,#3b8bff,#1d5ef0);color:#fff;font:600 15px Inter,system-ui,sans-serif;cursor:pointer;box-shadow:0 10px 24px -10px rgba(33,89,232,.65)">Yes — Scan Tail-Cut</button>
            <button type="button" id="ta-no" style="width:100%;height:48px;border-radius:999px;border:1px solid #d7e2f4;background:#f5f8ff;color:#182842;font:600 14px Inter,system-ui,sans-serif;cursor:pointer">No — Continue without Tail-Cut</button>
          </div>
        </section>`
          ; (d.getElementById('stage') ?? d.body).append(overlay)
        overlay.querySelector<HTMLButtonElement>('#ta-yes')!.onclick = () => {
          overlay.remove()
          session = reducer(session, { type: 'setTailAvailability', value: 'available' })
          go('tail')
        }
        overlay.querySelector<HTMLButtonElement>('#ta-no')!.onclick = () => {
          overlay.remove()
          session = reducer(session, { type: 'setTailAvailability', value: 'not_available' })
          if (!isDemoMode()) persist(w)
          go('final')
        }
        if (saveMessage) toast(saveMessage)
        return
      }
      go('final')
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
      S.hist = history(S.name); R()
      const msg = result.failed || result.waiting
        ? `${result.synced ? `${result.synced} synced · ` : ''}${result.firstError ?? 'Some records remain pending.'}`
        : (result.synced > 0 ? `Synced: ${result.synced} record${result.synced === 1 ? '' : 's'} verified in cloud` : 'Synced: all records up to date')
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
    const sashibo = session.results['Sashibo core'], tail = session.results['Tail cut']
    const isProvisional = session.tailAvailability === 'not_available' && !tail
    const defaultGrade: Grade = sashibo?.originalGrade ?? 'A'
    const overlay = d.createElement('div'); overlay.className = 'ovl'
    overlay.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="Manual override" style="width:min(500px,94%);padding:28px;border-radius:26px;display:grid;gap:14px">
      <div><h2 style="margin:0 0 4px;font-size:24px;letter-spacing:-.025em">${isProvisional ? 'Confirm provisional grade' : 'Expert override'}</h2><p style="margin:0;font-size:13px;color:#5b6b84">Sashibo Core: <b>Grade ${sashibo?.originalGrade ?? '—'}</b> (${sashibo?.originalConfidence ?? '—'}%)${tail ? ` · Tail-Cut: <b>Grade ${tail.originalGrade ?? '—'}</b> (${tail.originalConfidence ?? '—'}%)` : ' · Tail-Cut: <b>NOT AVAILABLE</b>'}</p></div>
      <label style="display:grid;gap:6px;font-size:13px;font-weight:600;color:#475569">Station PIN<input class="fi" id="expert-pin" type="password" inputmode="numeric" maxlength="4" placeholder="4-digit PIN"></label>
      <div><div style="font-size:13px;font-weight:600;color:#475569;margin-bottom:6px">Final grade</div><div class="g3" style="margin:0">${(['A', 'B', 'C'] as Grade[]).map(g => `<button type="button" class="gopt${g === defaultGrade ? ' on' : ''}" data-grade="${g}">${g}</button>`).join('')}</div></div>
      <label style="display:grid;gap:6px;font-size:13px;font-weight:600;color:#475569">Reason<input class="fi" id="expert-reason" placeholder="Reason for confirmation or override (required)"></label>
      <div class="mf" style="margin-top:6px;display:flex;gap:10px;justify-content:flex-end"><button type="button" class="xbn bo" id="expert-cancel" style="border-radius:999px;padding:0 20px">Cancel</button><button type="button" class="xpr" id="expert-save" style="border-radius:999px;padding:0 22px">${isProvisional ? 'Confirm final grade' : 'Save override'}</button></div>
    </div>`
    d.getElementById('stage')!.append(overlay); let selected: Grade = defaultGrade
    overlay.querySelectorAll<HTMLButtonElement>('[data-grade]').forEach(b => b.onclick = () => { selected = b.dataset.grade as Grade; overlay.querySelectorAll('[data-grade]').forEach(x => x.classList.toggle('on', x === b)) })
    overlay.querySelector<HTMLButtonElement>('#expert-cancel')!.onclick = () => overlay.remove()
    overlay.querySelector<HTMLButtonElement>('#expert-save')!.onclick = async () => {
      const reasonInput = overlay.querySelector('#expert-reason') as HTMLInputElement
      const reason = reasonInput.value.trim()
      if (!reason) { toast('Enter a reason before confirming or overriding the grade.', 1); reasonInput.focus(); return }
      if (!await runtime.pin((overlay.querySelector('#expert-pin') as HTMLInputElement).value)) { toast('Incorrect PIN or hosted admin authorization required.', 1); return }
      const sample = session.results['Tail cut'] ? 'Tail cut' : 'Sashibo core'
      session = reducer(session, { type: 'setOverride', sample, grade: selected, reason, actor: S.name, timestamp: new Date().toISOString() })
      const updated = session.results[sample]
      if (updated) session = { ...session, results: { ...session.results, [sample]: { ...updated, reviewStatus: 'confirmed', provisional: isProvisional, tailAvailability: isProvisional ? 'not_available' : 'available' } } }
      if (!isDemoMode()) persist(w)
      overlay.remove(); go('receipt')
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
      return printThermalReceipt(w, { station: S.cfg.name, order: `TE_${String(receiptOrder).padStart(4, '0')}`, grader: anchor.grader, timestamp: anchor.timestamp, weight: parseFloat(anchor.weight), grade: decision.grade!, unitRatePerKg: prices.unitRatePerKg, total: prices.amount, core: sample('Sashibo core'), tail: sample('Tail cut'), provisional: Boolean(decision.provisional), tailAvailable: Boolean(results['Tail cut']), demo: false })
    }
    const currentDecision = decisionFor(session)
    if (currentDecision.next !== 'print') throw new Error('An expert must confirm the final grade.')
    const grade = currentDecision.grade!, saved = loadRecords().find(record => record.sessionId === sessionId)
    const prices = saved?.transaction ?? priceSnapshot(grade, S.w)
    const sample = (key: SampleType) => { const result = session.results[key]; return result ? { grade: result.originalGrade ?? 'Invalid', confidence: result.originalConfidence } : undefined }
    return printThermalReceipt(w, { station: S.cfg.name, order: `TE_${String(S.order).padStart(4, '0')}`, grader: S.name, timestamp: S.captureTime ?? Date.now(), weight: S.w, grade, unitRatePerKg: prices.unitRatePerKg ?? null, total: prices.amount, core: sample('Sashibo core'), tail: sample('Tail cut'), provisional: Boolean(currentDecision.provisional), tailAvailable: session.tailAvailability !== 'not_available', demo: isDemoMode() })
  },
  finish(w: Kiosk) { const { S, go } = api(w); S.hist = history(S.name); go('done') },
  attach(w: Kiosk) {
    const { S, SC, RATE } = api(w)
    setKioskDemoMode(localStorage.getItem('tunaeye-explicit-demo') === 'true')
    S.cfg.demo = isDemoMode(); S.cfg.name = localStorage.getItem('tunaeye-station') ?? S.cfg.name
    S.cfg.url = getPiSettings().apiUrl; S.cfg.ep = '/grade'; S.hist = history(S.name); Object.assign(RATE, loadPriceSchedule())
    const original = w.eval('R')
      ; (w as any).R = () => {
        S.cfg.demo = isDemoMode()
        if (S.scr === 'dash') S.hist = history(S.name)
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
        if (S.scr !== 'core' && S.scr !== 'tail') stopLocalStream()
        if ((S.scr === 'core' || S.scr === 'tail') && !isDemoMode()) {
          const side = d.querySelector<HTMLElement>('.ltside'), shBtn = d.getElementById('sh')
          if (side && shBtn && !d.getElementById('cam-chooser')) {
            const box = d.createElement('div'); box.id = 'cam-chooser'
            box.style.cssText = 'display:grid;gap:6px;margin:10px 0 6px;padding:10px 12px;border-radius:16px;background:#f4f8ff;border:1px solid #dbe6fa'
            box.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;gap:6px;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.06em"><span>Camera source</span><div style="display:flex;gap:5px"><button type="button" id="cam-refresh" title="Ask permission & refresh cameras" style="padding:3px 9px;border-radius:999px;border:1px solid #cbd9ef;background:#fff;color:#475569;font:700 11px Inter,system-ui,sans-serif;cursor:pointer">Refresh ↻</button><button type="button" id="cam-trigger" title="Start selected camera" style="padding:3px 10px;border-radius:999px;border:0;background:#2159e8;color:#fff;font:700 11px Inter,system-ui,sans-serif;cursor:pointer">Trigger</button></div></div><select id="cam-select" aria-label="Available cameras" style="width:100%;height:34px;border-radius:10px;border:1px solid #cbd9ef;background:#fff;padding:0 10px;font:600 12.5px Inter,system-ui,sans-serif;color:#182842"></select><input id="cam-droid-url" type="url" placeholder="http://192.168.1.2:4747" value="${droidcamUrl}" aria-label="DroidCam URL" style="display:none;width:100%;height:32px;border-radius:10px;border:1px solid #cbd9ef;background:#fff;padding:0 10px;font:600 12px Inter,system-ui,sans-serif;color:#182842;box-sizing:border-box"><small id="cam-hint" style="display:none;font-size:11px;line-height:1.35;color:#64748b"></small>`
            shBtn.before(box)
            const sel = box.querySelector<HTMLSelectElement>('#cam-select')!
            const refBtn = box.querySelector<HTMLButtonElement>('#cam-refresh')!
            const trig = box.querySelector<HTMLButtonElement>('#cam-trigger')!
            const dInput = box.querySelector<HTMLInputElement>('#cam-droid-url')!
            const hint = box.querySelector<HTMLElement>('#cam-hint')!
            const syncExtra = () => {
              dInput.style.display = sel.value === 'droidcam' ? 'block' : 'none'
              if (sel.value !== 'pi' && sel.value !== 'droidcam' && !navigator.mediaDevices?.getUserMedia) {
                hint.style.display = 'block'
                hint.textContent = 'Browser webcam blocked on HTTP. Use DroidCam URL (:4747) or allow this origin in chrome://flags/#unsafely-treat-insecure-origin-as-secure.'
              } else {
                hint.style.display = 'none'
              }
            }
            const populate = async () => {
              const opts: Array<[string, string]> = [['pi', 'Pi camera (:8080)'], ['droidcam', 'DroidCam URL (:4747)']]
              if (navigator.mediaDevices?.enumerateDevices) {
                try {
                  const devs = (await navigator.mediaDevices.enumerateDevices()).filter(dev => dev.kind === 'videoinput')
                  if (devs.length) devs.forEach((dev, idx) => opts.push([dev.deviceId || 'device', dev.label || `Camera ${idx + 1} (Browser)`]))
                  else opts.push(['device', 'Browser / DroidCam Webcam'])
                } catch { opts.push(['device', 'Browser / DroidCam Webcam']) }
              } else {
                opts.push(['device', 'Browser / DroidCam Webcam'])
              }
              sel.innerHTML = opts.map(([val, lbl]) => `<option value="${val}">${lbl}</option>`).join('')
              sel.value = opts.some(([val]) => val === activeCameraSource) ? activeCameraSource : 'pi'
              syncExtra()
            }
            const requestCamPermission = async () => {
              if (!navigator.mediaDevices?.getUserMedia) {
                const msg = 'Browser camera permission requires HTTPS or chrome://flags/#unsafely-treat-insecure-origin-as-secure.'
                hint.style.display = 'block'; hint.textContent = msg; api(w).toast(msg, 1)
                return false
              }
              try {
                const probe = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
                probe.getTracks().forEach(t => t.stop())
                await populate()
                return true
              } catch (err) {
                const msg = err instanceof Error ? err.message : 'Camera permission denied.'
                hint.style.display = 'block'; hint.textContent = msg; api(w).toast(msg, 1)
                return false
              }
            }
            void populate()
            navigator.mediaDevices?.addEventListener?.('devicechange', () => { if (box.isConnected) void populate() })
            dInput.onchange = () => {
              droidcamUrl = normalizeDroidcamUrl(dInput.value)
              dInput.value = droidcamUrl
              localStorage.setItem('tunaeye-droidcam-url', droidcamUrl)
              if (sel.value === 'droidcam') void runtime.camera(w)
            }
              sel.onchange = async () => {
                activeCameraSource = sel.value
                localStorage.setItem('tunaeye-camera-source', activeCameraSource)
                syncExtra()
                if (activeCameraSource !== 'pi' && activeCameraSource !== 'droidcam') await requestCamPermission()
                void runtime.camera(w)
              }
              refBtn.onclick = async () => {
                refBtn.disabled = true
                try {
                  if (navigator.mediaDevices) {
                    const ok = await requestCamPermission()
                    if (ok) api(w).toast('Cameras refreshed')
                  } else {
                    await populate()
                    syncExtra()
                    api(w).toast('Refreshed list (browser webcam blocked on HTTP)', 1)
                  }
                } finally { if (refBtn.isConnected) refBtn.disabled = false }
              }
              trig.onclick = async () => {
                if (sel.value === 'droidcam') {
                  droidcamUrl = normalizeDroidcamUrl(dInput.value)
                  dInput.value = droidcamUrl
                  localStorage.setItem('tunaeye-droidcam-url', droidcamUrl)
                } else if (sel.value !== 'pi') {
                  const ok = await requestCamPermission()
                  if (!ok) return
                }
                activeCameraSource = sel.value
                localStorage.setItem('tunaeye-camera-source', activeCameraSource)
                syncExtra()
                void runtime.camera(w)
              }
            }
          }
          if (S.scr === 'final') {
            const button = d.getElementById('go')!
            const chip = d.querySelector('.v5h1 .v5c')
            const coreRes = session.results['Sashibo core'], tailRes = session.results['Tail cut']
            const gradeColor = (g?: Grade | null) => g === 'A' ? '#12a56a' : g === 'B' ? '#d97706' : '#d9473a'
            const updateSampleBadge = (zoomKey: string, res?: typeof coreRes) => {
              if (!res?.originalGrade) return
              const badge = d.querySelector<HTMLElement>(`.ph5[data-zoom="${zoomKey}"] .v5sc`)
              if (badge) {
                badge.textContent = `Grade ${res.originalGrade}${res.originalConfidence != null ? ` · ${res.originalConfidence.toFixed(1)}%` : ''}`
                badge.style.background = gradeColor(res.originalGrade)
              }
            }
            updateSampleBadge('core', coreRes)
            updateSampleBadge('tail', tailRes)
            const bars = d.querySelectorAll<HTMLElement>('.bs5 .b5')
            if (bars[0] && coreRes?.originalGrade) { const lbl = bars[0].querySelector('.b5h span'); if (lbl) lbl.textContent = `Core · Grade ${coreRes.originalGrade}` }
            if (bars[1] && tailRes?.originalGrade) { const lbl = bars[1].querySelector('.b5h span'); if (lbl) lbl.textContent = `Tail · Grade ${tailRes.originalGrade}` }
            const mixLabel = d.querySelector('.sp5 span'); if (mixLabel) mixLabel.textContent = tailRes ? 'Avg confidence' : 'Model confidence'
            if (decision.provisional && chip) { chip.className = 'v5c c-am'; chip.innerHTML = '<i></i>PROVISIONAL' }
            if (decision.next === 'override') {
              const prelim = preliminaryGrade()
              d.querySelector('.v5h h1')!.textContent = decision.provisional ? 'Provisional — Confirmation required' : 'Manual review required'
              button.textContent = decision.provisional ? 'Confirm / Set final grade' : 'Confirm / Set final grade'
              button.onclick = () => runtime.override(w)
              const gt = d.querySelector('.gt5'); if (gt) gt.textContent = `Grade ${prelim} (Review)`
              const gs = d.querySelector('.gs5'); if (gs) gs.textContent = 'Confirm or override below'
            } else button.onclick = () => { if (decision.next === 'print') api(w).go('receipt') }
            d.querySelectorAll('.lg5').forEach(e => e.textContent = decision.detail)
            if (session.tailAvailability === 'not_available') {
              d.querySelectorAll('.ph5-f span').forEach(el => { if (el.textContent?.includes('Tail')) el.textContent = 'Tail-Cut: NOT AVAILABLE' })
            }
          }
          if (S.scr === 'receipt' && decision.provisional) {
            const rHead = d.querySelector('.rc-h, .rh1')
            if (rHead && !d.getElementById('provisional-receipt-tag')) {
              const tag = d.createElement('div'); tag.id = 'provisional-receipt-tag'; tag.style.cssText = 'margin:6px 0;padding:4px 10px;border-radius:999px;background:#fff4db;color:#925800;font-size:11px;font-weight:800;display:inline-block'; tag.textContent = 'PROVISIONAL · TAIL-CUT NOT AVAILABLE'; rHead.after(tag)
            }
          }
          const override = d.getElementById('ov'); if (override) override.onclick = () => runtime.override(w)
          d.querySelectorAll<HTMLElement>('#dmsw,[data-t="demo"]').forEach(e => { e.onclick = () => runtime.mode(w, !isDemoMode()); e.setAttribute('aria-checked', String(isDemoMode())) })
          if (S.scr === 'name') {
            const start = d.getElementById('go') as HTMLButtonElement, proceed = start.onclick
            start.onclick = async event => {
              if (start.disabled) return
              start.disabled = true
              try {
                if (isDemoMode() || await showLiveReadiness(w)) {
                  registerGrader(S.name)
                  proceed?.call(start, event)
                }
              }
              finally { if (start.isConnected) start.disabled = !S.name.trim() }
            }
            if (isDemoMode()) {
              const choices = d.createElement('select'); choices.setAttribute('aria-label', 'Demo scenario'); choices.className = 'inp'; choices.style.cssText = 'position:absolute;left:14px;bottom:14px;z-index:5;width:auto;max-width:190px;height:26px;padding:0 22px 0 10px;border-radius:999px;font-size:11px;font-weight:700;box-shadow:0 2px 8px rgba(18,59,112,.12)'
              choices.innerHTML = demoScenarios().map(item => `<option value="${item.id}" title="${item.detail}">${item.label}</option>`).join(''); choices.value = getDemoScenario()
              choices.onchange = () => setDemoScenario(choices.value as DemoScenario); (start.parentElement!.parentElement ?? start.parentElement!).append(choices)
            }
          }
          if (isDemoMode() && S.scr === 'final') d.querySelectorAll('.lg5').forEach(e => e.textContent = 'Simulated prediction · Demo only · Not saved as an operational grade')
          const install = d.getElementById('ia'); if (install) install.onclick = async () => {
            const msg = await requestPwaInstall()
            if (msg.includes('chrome://flags')) api(w).modal({ title: 'Install TunaEye on Tablet', body: msg.replace(/\n/g, '<br>'), ok: 'Got it', onOk: () => { } })
            else api(w).toast(msg)
          }
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
          const pill = w.document.createElement('button')
          pill.type = 'button'
          pill.id = 'te-net-pill'
          pill.setAttribute('aria-live', 'polite')
          pill.setAttribute('aria-label', 'View network and connection details')
          pill.style.cssText = 'position:fixed;right:12px;bottom:10px;z-index:25;pointer-events:auto;cursor:pointer;display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:999px;font:700 11px/1.2 Inter,system-ui,sans-serif;background:rgba(255,255,255,.94);color:#182842;border:1px solid rgba(18,59,112,.16);box-shadow:0 2px 10px rgba(18,59,112,.12);backdrop-filter:blur(6px)'
          w.document.body.append(pill)
          const barsSvg = (bars: number, color: string) => `<svg width="14" height="12" viewBox="0 0 14 12" aria-hidden="true">${[0, 1, 2].map(i => `<rect x="${i * 5}" y="${8 - i * 3}" width="3" height="${4 + i * 3}" rx="1" fill="${i < bars ? color : '#cbd5e1'}"/>`).join('')}</svg>`
          let latest = { piOk: false, piMs: 0, camOk: false, sashiboOk: false, tailOk: false, cloudOk: false, bars: 0, color: '#dc2626', label: 'Checking…', rtt: 0 }
          const renderModal = () => {
            const modal = w.document.getElementById('te-net-modal')
            if (!modal) return
            const settings = getPiSettings()
            const pendingCount = loadRecords().filter(r => r.transaction?.syncState !== 'synced').length
            const conn = (navigator as unknown as { connection?: { effectiveType?: string; downlink?: number; rtt?: number } }).connection
            const netDetail = [navigator.onLine ? 'Online' : 'Offline', conn?.effectiveType?.toUpperCase(), conn?.downlink ? `${conn.downlink} Mbps` : '', latest.rtt ? `${latest.rtt} ms` : ''].filter(Boolean).join(' · ')
            const badge = (ok: boolean, yes: string, no: string, warn = false) => `<span style="padding:3px 9px;border-radius:999px;font-size:11px;font-weight:700;white-space:nowrap;background:${ok ? '#eaf8f0' : warn ? '#fff4db' : '#f3f6fb'};color:${ok ? '#17804c' : warn ? '#925800' : '#5b6b84'}">${ok ? yes : no}</span>`
            const row = (title: string, sub: string, right: string) => `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 14px;border-radius:14px;background:#f7faff;border:1px solid #e6edf8"><div><div style="font-size:13px;font-weight:700;color:#182842">${title}</div><div style="font-size:12px;color:#5b6b84;margin-top:2px;overflow-wrap:anywhere">${sub}</div></div>${right}</div>`
            modal.innerHTML = `<section class="sheet" role="dialog" aria-modal="true" aria-labelledby="net-modal-title" style="width:min(500px,94%);padding:26px;border-radius:26px;background:#fff;color:#182842;font-family:Inter,system-ui,sans-serif;box-shadow:0 24px 60px -16px rgba(11,26,58,.28);display:grid;gap:14px">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
            <div style="display:flex;align-items:center;gap:10px">${barsSvg(latest.bars, latest.color)}<h2 id="net-modal-title" style="margin:0;font-size:20px;letter-spacing:-.02em">Connection details</h2></div>
            <button type="button" id="net-close" style="height:34px;padding:0 14px;border-radius:999px;border:1px solid #d7e2f4;background:#f5f8ff;color:#182842;font:600 13px Inter,system-ui,sans-serif;cursor:pointer">Close</button>
          </div>
          <div style="display:grid;gap:8px">
            ${row('Raspberry Pi Station', settings.apiUrl || (settings.configured ? 'Same-origin station API' : 'Not configured for HTTPS'), badge(latest.piOk, `Connected · ${latest.piMs} ms`, 'Not reachable'))}
            ${row('AI Models (V2)', latest.piOk ? `Sashibo Core: ${latest.sashiboOk ? 'Loaded' : 'Missing'} · Tail-Cut: ${latest.tailOk ? 'Loaded' : 'Missing'}` : 'Connect to TunaRpi to verify models', badge(latest.sashiboOk && latest.tailOk, 'Both loaded', latest.piOk ? 'Incomplete' : 'Unavailable', latest.piOk && !(latest.sashiboOk && latest.tailOk)))}
            ${row('Pi Camera', settings.snapshotUrl || 'Same-origin /snapshot', badge(latest.camOk, 'Snapshot ready', latest.piOk ? 'No camera feed' : 'Standby', latest.piOk && !latest.camOk))}
            ${row('Cloud Sync (Supabase)', `${pendingCount} record${pendingCount === 1 ? '' : 's'} pending sync`, badge(latest.cloudOk, 'Cloud ready', navigator.onLine ? 'Unreachable' : 'Offline'))}
            ${row('Device Network', netDetail, badge(navigator.onLine, 'Wi-Fi / Net', 'Offline'))}
          </div>
          <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:2px">
            <button type="button" id="net-refresh" style="height:42px;padding:0 18px;border-radius:999px;border:1px solid #d7e2f4;background:#f5f8ff;color:#182842;font:600 14px Inter,system-ui,sans-serif;cursor:pointer">Refresh</button>
            ${pendingCount > 0 && latest.cloudOk ? '<button type="button" id="net-sync" style="height:42px;padding:0 20px;border-radius:999px;border:0;background:linear-gradient(135deg,#3b8bff,#1d5ef0);color:#fff;font:600 14px Inter,system-ui,sans-serif;cursor:pointer">Sync now</button>' : ''}
          </div>
        </section>`
            modal.querySelector<HTMLButtonElement>('#net-close')!.onclick = () => modal.remove()
            modal.querySelector<HTMLButtonElement>('#net-refresh')!.onclick = () => { void refreshNetPill() }
            const syncBtn = modal.querySelector<HTMLButtonElement>('#net-sync')
            if (syncBtn) syncBtn.onclick = async () => { syncBtn.disabled = true; syncBtn.textContent = 'Syncing…'; await runtime.sync(w); await refreshNetPill() }
          }
          pill.onclick = () => {
            w.document.getElementById('te-net-modal')?.remove()
            const modal = w.document.createElement('div')
            modal.className = 'ovl'; modal.id = 'te-net-modal'
            modal.onclick = event => { if (event.target === modal) modal.remove() }
              ; (w.document.getElementById('stage') ?? w.document.body).append(modal)
            renderModal()
            void refreshNetPill()
          }
          const refreshNetPill = async () => {
            if (!pill.isConnected) return
            const settings = getPiSettings()
            let piOk = false, piMs = 999, sashiboOk = false, tailOk = false, camOk = false
            if (settings.configured) {
              const started = performance.now()
              try {
                const res = await fetch(`${settings.apiUrl}/status`, { cache: 'no-store', credentials: settings.mode === 'hosted-gateway' ? 'include' : 'omit', signal: AbortSignal.timeout(2500) })
                piOk = res.ok
                piMs = Math.round(performance.now() - started)
                if (res.ok) {
                  const data = await res.json().catch(() => null) as { models?: { sashibocore?: boolean; tailcut?: boolean } } | null
                  sashiboOk = data?.models?.sashibocore === true
                  tailOk = data?.models?.tailcut === true
                }
              } catch { piOk = false }
              if (settings.snapshotUrl) {
                try {
                  const camRes = await fetch(settings.snapshotUrl, { cache: 'no-store', credentials: settings.mode === 'hosted-gateway' ? 'include' : 'omit', signal: AbortSignal.timeout(2500) })
                  camOk = camRes.ok && (camRes.headers.get('content-type') ?? '').startsWith('image/')
                } catch { camOk = false }
              }
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
            latest = { piOk, piMs, camOk, sashiboOk, tailOk, cloudOk, bars, color, label, rtt }
            latest = { piOk, piMs, camOk, sashiboOk, tailOk, cloudOk, bars, color, label, rtt }
            pill.innerHTML = `${barsSvg(bars, color)}<span>${label}</span>`
            renderModal()
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
const showKioskFallback = (child: Kiosk, message: string) => {
  const doc = child.document
  if (!doc?.body || doc.getElementById('te-kiosk-fallback')) return
  const card = doc.createElement('div')
  card.id = 'te-kiosk-fallback'
  card.style.cssText = 'position:fixed;inset:0;display:grid;place-items:center;padding:24px;background:#f4f7ff;font-family:Inter,system-ui,sans-serif;color:#182842'
  card.innerHTML = `<section style="width:min(460px,94%);padding:28px;border-radius:24px;background:#fff;border:1px solid #dce6f6;box-shadow:0 20px 50px -18px rgba(18,59,112,.22);text-align:center"><h2 style="margin:0 0 8px;font-size:22px">Kiosk could not start</h2><p style="margin:0 0 18px;font-size:14px;color:#5b6b84;overflow-wrap:anywhere"></p><div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><button type="button" id="te-fb-back" style="height:44px;padding:0 18px;border-radius:999px;border:1px solid #d7e2f4;background:#f5f8ff;color:#182842;font:600 14px Inter,system-ui,sans-serif;cursor:pointer">Back to landing</button><button type="button" id="te-fb-reload" style="height:44px;padding:0 20px;border-radius:999px;border:0;background:#2563ff;color:#fff;font:600 14px Inter,system-ui,sans-serif;cursor:pointer">Reload kiosk</button></div></section>`
  card.querySelector('p')!.textContent = message
  card.querySelector<HTMLButtonElement>('#te-fb-reload')!.onclick = () => window.location.reload()
  card.querySelector<HTMLButtonElement>('#te-fb-back')!.onclick = () => { try { (frame.contentWindow as any)?.closeKiosk?.() } catch { window.location.reload() } }
  doc.body.replaceChildren(card)
}
const timer = setInterval(() => {
  prepareLanding()
  const child = frame.contentDocument?.querySelector<HTMLIFrameElement>('#kiosk-wrap iframe')?.contentWindow as Kiosk | null
  if (child && !(child as any).__tunaeyeAttached) {
    if (child.document.readyState !== 'complete') return
    try { child.eval('S'); runtime.attach(child); (child as any).__tunaeyeAttached = true }
    catch (error) {
      (child as any).__tunaeyeAttached = true
      console.error('Kiosk initialization failed', error)
      showKioskFallback(child, error instanceof Error ? error.message : 'Kiosk initialization failed.')
    }
  }
}, 100)
let lastAutoSyncAt = 0
const autoSyncIfReachable = async () => {
  if (!isSupabaseConfigured() || !navigator.onLine) return
  if (Date.now() - lastAutoSyncAt < 60_000) return
  if (!loadRecords().some(record => record.transaction?.syncState !== 'synced')) return
  lastAutoSyncAt = Date.now()
  if (!await checkCloudConnection()) return
  const savedGraders = (() => { try { return JSON.parse(localStorage.getItem('tunaeye-graders') ?? '[]') as string[] } catch { return [] } })()
  if (savedGraders.length) void syncGradersToCloud(savedGraders)
  const result = await syncPendingRecords({ limit: 10 }).catch(() => null)
  if (result && result.synced > 0) {
    localStorage.setItem('tunaeye-last-sync', new Date().toISOString())
    const child = frame.contentDocument?.querySelector<HTMLIFrameElement>('#kiosk-wrap iframe')?.contentWindow as Kiosk | null
    if (child && (child as any).__tunaeyeAttached) {
      try { const { S, R } = api(child); S.hist = history(S.name); R() } catch { }
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
