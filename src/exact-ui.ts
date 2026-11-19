import source from '../new ui/index (4).html?raw'
import { capturePiImage, gradePiImage, getPiSettings, checkPiHealth, PiIntegrationError } from './piClient'
import { initialSession, reducer, decisionFor, combineGrades, ACCEPT_CONFIDENCE, type Session, type SampleType, type Grade } from './kioskState'
import { saveCapturedEvidence, promoteCapturedEvidence, deleteCapturedEvidence, getCapturedEvidence } from './evidenceStorage'
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
import { printThermalReceipt, pairBluetoothPrinter, getConnectedBtPrinterName } from './thermalReceipt'

type Kiosk = Window & { eval: (text: string) => any }
let session: Session = { ...initialSession }
let sessionId = createId(), order: number | null = null, capturing = false
let tabletEntry = false
let receiptSkipped = false
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
    return {
      id: core.id, ts: core.timestamp, w: parseFloat(core.weight), g: core.grade,
      loc: rows.every(r => r.transaction?.syncState === 'synced') ? 0 : 1,
      c: core.result?.originalConfidence, tl: tail?.result?.originalConfidence ?? null,
      n: core.grader, o: groups.size - i, amount: core.transaction?.amount, rate: core.transaction?.unitRatePerKg,
      coreImgId: core.capturedImageId ?? null, tailImgId: tail?.capturedImageId ?? null,
      coreGrade: core.result?.originalGrade ?? null, tailGrade: tail?.result?.originalGrade ?? null,
      isDemo: core.result?.modelSource === 'demo'
    }
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
    doc.getElementById('te-captured-preview')?.remove()
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
    if (Boolean(S.cfg?.demo) !== isDemoMode()) setKioskDemoMode(Boolean(S.cfg?.demo))
    initialize(w); capturing = true
    const button = w.document.getElementById('sh') as HTMLButtonElement | null
    if (button) { button.disabled = true; button.textContent = file ? 'Loading…' : 'Capturing…' }
    const showCapturedPreview = (url: string, badgeText: string) => {
      const vf = w.document.getElementById('vf')
      if (!vf) return
      let wrap = w.document.getElementById('te-captured-preview') as HTMLDivElement | null
      if (!wrap) {
        wrap = w.document.createElement('div')
        wrap.id = 'te-captured-preview'
        wrap.style.cssText = 'position:absolute;inset:0;z-index:4;background:#0b1220;display:flex;align-items:center;justify-content:center'
        wrap.innerHTML = '<img alt="Captured sample preview" style="width:100%;height:100%;object-fit:contain"><span id="te-captured-badge" style="position:absolute;top:12px;left:12px;padding:6px 12px;border-radius:999px;background:rgba(15,23,42,.84);color:#fff;font:600 12px Inter,system-ui,sans-serif"></span>'
        vf.append(wrap)
      }
      const img = wrap.querySelector('img')!
      img.src = url
      const badge = wrap.querySelector('#te-captured-badge')
      if (badge) badge.textContent = badgeText
    }
    let temporaryId: string | undefined
    console.info('[TunaEye] capture start', { key, sample, activeCameraSource, hasFile: Boolean(file) })
    try {
      if (file && (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !file.size || file.size > 10 * 1024 * 1024)) throw new Error('Choose a JPEG, PNG or WebP image up to 10 MB.')
      let blob: Blob
      if (file) {
        blob = file
      } else if (isDemoMode()) {
        const inlineDataUrl = (() => { try { return w.eval(key === 'tail' ? 'IMG_TAIL' : 'IMG_CORE') as string } catch { return '' } })()
        if (inlineDataUrl?.startsWith('data:image/')) {
          const comma = inlineDataUrl.indexOf(',')
          const mime = inlineDataUrl.slice(5, comma).split(';')[0] || 'image/jpeg'
          const bin = atob(inlineDataUrl.slice(comma + 1))
          const bytes = new Uint8Array(bin.length)
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
          blob = new Blob([bytes], { type: mime })
        } else {
          blob = await capturePiImage(sample)
        }
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
      try {
        const bitmap = await createImageBitmap(blob)
        console.info('[TunaEye] image decoded', { width: bitmap.width, height: bitmap.height, size: blob.size, type: blob.type })
        bitmap.close()
      } catch (decodeError) {
        throw new PiIntegrationError('snapshot', 'Snapshot failed: captured image could not be decoded.', undefined, { cause: decodeError })
      }
      if (previews[key]) URL.revokeObjectURL(previews[key])
      previews[key] = URL.createObjectURL(blob)
      showCapturedPreview(previews[key], 'Captured · Grading…')
      if (button) button.textContent = 'Grading…'
      const id = `${sessionId}-${key === 'tail' ? 2 : 1}`
      S.captureTime ??= Date.now()
      if (!isDemoMode()) {
        temporaryId = `${id}-pending-${createId()}`
        await saveCapturedEvidence({ id: temporaryId, sessionId, sample, fishId: 'Fish 1', capturedAt: S.captureTime, blob })
        console.info('[TunaEye] evidence saved locally', { temporaryId, sample })
      }
      const resetCameraAfterInvalid = () => {
        const d = w.document
        d.getElementById('te-captured-preview')?.remove()
        if (previews[key]) { URL.revokeObjectURL(previews[key]); delete previews[key] }
        const fi = d.getElementById('fi') as HTMLInputElement | null
        if (fi) fi.value = ''
        if (!isDemoMode()) void runtime.camera(w)
      }
      const showInvalidSampleModal = (msg: string) => {
        const d = w.document
        resetCameraAfterInvalid()
        d.getElementById('te-invalid-sample-modal')?.remove()
        const ov = d.createElement('div'); ov.className = 'ovl'; ov.id = 'te-invalid-sample-modal'
        ov.innerHTML = `<section class="sheet" role="alertdialog" aria-modal="true" aria-label="Invalid sample image" style="width:min(420px,92%);padding:24px;border-radius:24px;background:#fff;color:#182842;font-family:Inter,system-ui,sans-serif;text-align:center;box-shadow:0 24px 60px -16px rgba(11,26,58,.32)">
          <div style="width:52px;height:52px;margin:0 auto 12px;border-radius:50%;background:#fef2f2;border:1px solid #fecaca;color:#dc2626;display:grid;place-items:center">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <h2 style="margin:0 0 6px;font-size:20px;letter-spacing:-.02em">Not a valid ${sample}</h2>
          <p style="margin:0;font-size:13.5px;line-height:1.5;color:#5b6b84">${msg}</p>
        </section>`
        ov.onclick = () => ov.remove()
        ;(d.getElementById('stage') ?? d.body).append(ov)
        w.setTimeout(() => { if (ov.isConnected) ov.remove() }, 2000)
      }
      const result = await gradePiImage(blob, sample)
      if (result.outcome === 'invalid') {
        if (temporaryId) await deleteCapturedEvidence(temporaryId)
        showInvalidSampleModal(`This image is not recognized as a valid ${sample}. Camera reset — please scan again.`); return
      }
      if (temporaryId) { await promoteCapturedEvidence(temporaryId, id); temporaryId = undefined }
      session = { ...session, fishWeights: { 'Fish 1': S.w }, selectedSamples: key === 'tail' ? ['Sashibo core', 'Tail cut'] : ['Sashibo core'], currentSampleIndex: key === 'tail' ? 1 : 0 }
      session = reducer(session, { type: 'finishAnalysis', outcome: result.outcome, grade: result.grade, confidence: result.confidence, rawConfidence: result.rawConfidence, inferenceId: result.id, captureId: result.captureId, scores: result.scores, imageType: result.imageType, modelSource: result.modelSource })
      S.img = { ...(S.img ?? {}), [key]: previews[key] }; S[key] = result.confidence
      if (key === 'core') S.tail = null
      let saveMessage: string | undefined
      if (!isDemoMode()) { persist(w); saveMessage = await sqliteSaveStatus() }
      const decision = decisionFor(session)
      if (decision.next === 'retake') { showInvalidSampleModal(decision.detail); return }
      const highConfidence = result.confidence !== null && result.confidence >= ACCEPT_CONFIDENCE && Boolean(result.grade)
      if (key === 'core' && !highConfidence) {
        const d = w.document
        d.getElementById('tail-avail-modal')?.remove()
        const overlay = d.createElement('div'); overlay.className = 'ovl'; overlay.id = 'tail-avail-modal'
        const reasonBadge = `Confidence below ${ACCEPT_CONFIDENCE}% (${result.confidence ?? '—'}%)`
        const chipBg = '#fff4db', chipFg = '#925800'
        const sashiboSvg = `<svg width="64" height="44" viewBox="0 0 64 44" fill="none" aria-hidden="true"><rect x="2" y="10" width="60" height="24" rx="8" fill="#fff1f0" stroke="#f5c2c0" stroke-width="1.5"/><path d="M10 22C20 18 44 26 54 21" stroke="#dc2626" stroke-width="5" stroke-linecap="round"/><circle cx="14" cy="22" r="2.5" fill="#991b1b"/></svg>`
        const tailSvg = `<svg width="64" height="44" viewBox="0 0 64 44" fill="none" aria-hidden="true"><rect x="2" y="4" width="60" height="36" rx="10" fill="#eef5ff" stroke="#bfd6ff" stroke-width="1.5"/><ellipse cx="32" cy="22" rx="18" ry="12" fill="#ef4444" stroke="#fca5a5" stroke-width="2"/><ellipse cx="32" cy="22" rx="10" ry="6" fill="#dc2626" stroke="#fecaca" stroke-width="1.2" stroke-dasharray="3 2"/><circle cx="32" cy="22" r="2.5" fill="#fff"/></svg>`
        overlay.innerHTML = `<section class="sheet" role="dialog" aria-modal="true" aria-labelledby="ta-title" style="width:min(520px,95%);padding:24px;border-radius:26px;background:#fff;color:#182842;font-family:Inter,system-ui,sans-serif;box-shadow:0 24px 60px -16px rgba(11,26,58,.28)">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:10px">
            <span style="display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:999px;background:${chipBg};color:${chipFg};font-size:12px;font-weight:700">Sashibo Core · Grade ${result.grade ?? '—'} · ${result.confidence ?? '—'}%</span>
            <span style="font-size:11.5px;font-weight:700;color:#b45309">${reasonBadge}</span>
          </div>
          <h2 id="ta-title" style="margin:0 0 14px;font-size:22px;letter-spacing:-.025em;line-height:1.2">Is a Tail-Cut sample available?</h2>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
            <div style="padding:12px;border-radius:16px;background:#fff9f5;border:1px solid #fde2c8;display:flex;align-items:center;gap:10px">
              ${sashiboSvg}
              <div><div style="font-size:11px;font-weight:700;color:#9a3412;text-transform:uppercase">1. Sashibo Core</div><div style="font-size:13px;font-weight:800;color:#182842">Grade ${result.grade ?? '—'} (${result.confidence ?? '—'}%)</div><div style="font-size:11px;color:#64748b">Under ${ACCEPT_CONFIDENCE}%</div></div>
            </div>
            <div style="padding:12px;border-radius:16px;background:#f4f8ff;border:1px solid #d5e4ff;display:flex;align-items:center;gap:10px">
              ${tailSvg}
              <div><div style="font-size:11px;font-weight:700;color:#1d4ed8;text-transform:uppercase">2. Tail-Cut Face</div><div style="font-size:13px;font-weight:800;color:#182842">2nd Check</div><div style="font-size:11px;color:#64748b">Combines both</div></div>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <button type="button" id="ta-yes" style="width:100%;height:48px;border-radius:999px;border:0;background:linear-gradient(135deg,#3b8bff,#1d5ef0);color:#fff;font:600 14.5px Inter,system-ui,sans-serif;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;text-align:center;box-shadow:0 10px 24px -10px rgba(33,89,232,.65)">Scan Tail-Cut</button>
            <button type="button" id="ta-no" style="width:100%;height:48px;border-radius:999px;border:1px solid #d7e2f4;background:#f5f8ff;color:#182842;font:600 14.5px Inter,system-ui,sans-serif;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;text-align:center">No Tail-Cut</button>
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
      console.error('[TunaEye] capture/grade error', {
        stage: error instanceof PiIntegrationError ? error.stage : 'unknown',
        status: error instanceof PiIntegrationError ? error.status : undefined,
        message: error instanceof Error ? error.message : String(error),
      })
      const badge = w.document.getElementById('te-captured-badge')
      if (badge) badge.textContent = error instanceof PiIntegrationError && error.stage === 'snapshot' ? 'Capture failed' : 'Captured · Grading error'
      if (error instanceof PiIntegrationError && error.status === 422) {
        if (temporaryId) await deleteCapturedEvidence(temporaryId).catch(() => { })
        const d = w.document
        d.getElementById('te-captured-preview')?.remove()
        if (previews[key]) { URL.revokeObjectURL(previews[key]); delete previews[key] }
        const fi = d.getElementById('fi') as HTMLInputElement | null; if (fi) fi.value = ''
        if (!isDemoMode()) void runtime.camera(w)
        d.getElementById('te-invalid-sample-modal')?.remove()
        const ov = d.createElement('div'); ov.className = 'ovl'; ov.id = 'te-invalid-sample-modal'
        ov.innerHTML = `<section class="sheet" role="alertdialog" aria-modal="true" aria-label="Invalid sample image" style="width:min(420px,92%);padding:24px;border-radius:24px;background:#fff;color:#182842;font-family:Inter,system-ui,sans-serif;text-align:center;box-shadow:0 24px 60px -16px rgba(11,26,58,.32)"><div style="width:52px;height:52px;margin:0 auto 12px;border-radius:50%;background:#fef2f2;border:1px solid #fecaca;color:#dc2626;display:grid;place-items:center"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div><h2 style="margin:0 0 6px;font-size:20px;letter-spacing:-.02em">Not a valid ${sample}</h2><p style="margin:0;font-size:13.5px;line-height:1.5;color:#5b6b84">${error.message}</p></section>`
        ov.onclick = () => ov.remove()
        ;(d.getElementById('stage') ?? d.body).append(ov)
        w.setTimeout(() => { if (ov.isConnected) ov.remove() }, 2000)
      } else if (error instanceof PiIntegrationError && error.stage === 'snapshot') {
        toast(error.message, 1)
      } else {
        toast(`${error instanceof Error ? error.message : 'Inference failed.'}${temporaryId ? ' Captured image remains visible and saved locally; previous accepted evidence is unchanged.' : ''}`, 1)
      }
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
    const presets = ['Visual inspection', 'Confirmed AI grade', 'Color / texture check', ...(isProvisional ? ['Tail-cut unavailable'] : [])]
    const overlay = d.createElement('div'); overlay.className = 'ovl'
    overlay.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="Manual override" style="width:min(740px,95%);padding:24px;border-radius:26px;display:grid;grid-template-columns:1fr 270px;gap:20px;align-items:start">
      <div style="display:grid;gap:14px">
        <div><h2 style="margin:0 0 4px;font-size:22px;letter-spacing:-.025em">${isProvisional ? 'Confirm provisional grade' : 'Expert override'}</h2><p style="margin:0;font-size:13px;color:#5b6b84">Sashibo Core: <b>Grade ${sashibo?.originalGrade ?? '—'}</b> (${sashibo?.originalConfidence ?? '—'}%)${tail ? ` · Tail-Cut: <b>Grade ${tail.originalGrade ?? '—'}</b> (${tail.originalConfidence ?? '—'}%)` : ' · Tail-Cut: <b>NOT AVAILABLE</b>'}</p></div>
        <div><div style="font-size:12px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Final grade</div><div class="g3" style="margin:0">${(['A', 'B', 'C'] as Grade[]).map(g => `<button type="button" class="gopt${g === defaultGrade ? ' on' : ''}" data-grade="${g}" style="height:72px;font-size:32px;display:inline-flex;align-items:center;justify-content:center;text-align:center">${g}</button>`).join('')}</div></div>
        <div style="display:grid;gap:8px">
          <div style="font-size:12px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.05em">Reason (tap or type)</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">${presets.map((p, i) => `<button type="button" class="xbn bo" data-reason="${p}" style="height:34px;padding:0 12px;border-radius:999px;font-size:12px;display:inline-flex;align-items:center;justify-content:center;text-align:center;${i === 0 ? 'background:#edf3ff;border-color:#2159e8;color:#2159e8' : ''}">${p}</button>`).join('')}</div>
          <input class="fi" id="expert-reason" value="${presets[0]}" placeholder="Reason for confirmation or override (required)" style="height:44px;font-size:14px">
        </div>
      </div>
      <div style="display:grid;gap:12px;padding:16px;border-radius:20px;background:#f7faff;border:1px solid #e3ebf8">
        <div style="text-align:center">
          <div style="font-size:12px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.05em">Station PIN</div>
          <div id="ov-pin-dots" style="display:flex;justify-content:center;gap:10px;margin:10px 0 4px">${[0, 1, 2, 3].map(() => `<span style="width:14px;height:14px;border-radius:50%;border:2px solid #cbd9ef;background:#fff;display:inline-block"></span>`).join('')}</div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '⌫'].map(k => `<button type="button" data-ovk="${k}" style="height:48px;border-radius:12px;border:1px solid #d5e1f5;background:#fff;color:#182842;font:700 ${k === 'C' ? '14px' : '20px'} Inter,system-ui,sans-serif;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;text-align:center">${k}</button>`).join('')}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1.3fr;gap:8px;margin-top:4px">
          <button type="button" class="xbn bo" id="expert-cancel" style="width:100%;height:44px;border-radius:999px;padding:0 12px;display:inline-flex;align-items:center;justify-content:center;text-align:center">Cancel</button>
          <button type="button" class="xpr" id="expert-save" style="width:100%;height:44px;border-radius:999px;padding:0 14px;display:inline-flex;align-items:center;justify-content:center;text-align:center">${isProvisional ? 'Confirm' : 'Save'}</button>
        </div>
      </div>
    </div>`
    d.getElementById('stage')!.append(overlay); let selected: Grade = defaultGrade, pinVal = ''
    const syncDots = () => {
      overlay.querySelectorAll<HTMLElement>('#ov-pin-dots span').forEach((dot, idx) => {
        const filled = idx < pinVal.length
        dot.style.background = filled ? '#2159e8' : '#fff'
        dot.style.borderColor = filled ? '#2159e8' : '#cbd9ef'
      })
    }
    overlay.querySelectorAll<HTMLButtonElement>('[data-grade]').forEach(b => b.onclick = () => { selected = b.dataset.grade as Grade; overlay.querySelectorAll('[data-grade]').forEach(x => x.classList.toggle('on', x === b)) })
    const reasonInput = overlay.querySelector('#expert-reason') as HTMLInputElement
    overlay.querySelectorAll<HTMLButtonElement>('[data-reason]').forEach(b => b.onclick = () => {
      reasonInput.value = b.dataset.reason || ''
      overlay.querySelectorAll<HTMLButtonElement>('[data-reason]').forEach(x => {
        const active = x === b
        x.style.background = active ? '#edf3ff' : ''
        x.style.borderColor = active ? '#2159e8' : ''
        x.style.color = active ? '#2159e8' : ''
      })
    })
    overlay.querySelectorAll<HTMLButtonElement>('[data-ovk]').forEach(b => b.onclick = () => {
      const k = b.dataset.ovk!
      if (k === 'C') pinVal = ''
      else if (k === '⌫') pinVal = pinVal.slice(0, -1)
      else if (pinVal.length < 4) pinVal += k
      syncDots()
    })
    overlay.querySelector<HTMLButtonElement>('#expert-cancel')!.onclick = () => overlay.remove()
    overlay.querySelector<HTMLButtonElement>('#expert-save')!.onclick = async () => {
      const reason = reasonInput.value.trim()
      if (!reason) { toast('Select or enter a reason before confirming.', 1); return }
      if (pinVal.length < 4 || !await runtime.pin(pinVal)) { pinVal = ''; syncDots(); toast('Incorrect PIN or hosted admin authorization required.', 1); return }
      const sample = session.results['Tail cut'] ? 'Tail cut' : 'Sashibo core'
      session = reducer(session, { type: 'setOverride', sample, grade: selected, reason, actor: S.name, timestamp: new Date().toISOString() })
      const updated = session.results[sample]
      if (updated) session = { ...session, results: { ...session.results, [sample]: { ...updated, reviewStatus: 'confirmed', provisional: isProvisional, tailAvailability: isProvisional ? 'not_available' : 'available' } } }
      if (!isDemoMode()) persist(w)
      overlay.remove(); go('receipt')
    }
  },
  async print(w: Kiosk) {
    receiptSkipped = false
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
        const styleGradeCard = (g: Grade | null | undefined, needsOverride: boolean) => {
          const med = d.querySelector<HTMLElement>('.med5')
          if (!med) return
          const bg = needsOverride
            ? 'linear-gradient(155deg,#090d16 0%,#1e293b 55%,#05070c 100%)'
            : g === 'A'
              ? 'linear-gradient(155deg,#0d9458 0%,#12a56a 54%,#065f46 100%)'
              : g === 'B'
                ? 'linear-gradient(155deg,#d97706 0%,#eab308 54%,#b45309 100%)'
                : 'linear-gradient(155deg,#dc2626 0%,#ef4444 54%,#991b1b 100%)'
          const border = needsOverride ? '#334155' : g === 'A' ? '#34d399' : g === 'B' ? '#fde047' : '#fca5a5'
          med.style.setProperty('background', bg, 'important')
          med.style.setProperty('border-color', border, 'important')
          med.style.setProperty('color', '#fff', 'important')
          med.querySelectorAll<HTMLElement>('.med5-l,.gt5,.gs5,.b5h span,.b5h b,.lg5').forEach(el => {
            el.style.setProperty('color', '#fff', 'important')
          })
          const ringTrack = med.querySelector<SVGElement>('.med5-r circle:first-of-type')
          const ringArc = med.querySelector<SVGElement>('.med5-a')
          if (ringTrack) ringTrack.setAttribute('stroke', 'rgba(255,255,255,.24)')
          if (ringArc) ringArc.setAttribute('stroke', '#ffffff')
          const sp5 = med.querySelector<HTMLElement>('.sp5')
          if (sp5) {
            sp5.style.setProperty('background', 'rgba(0,0,0,.22)', 'important')
            sp5.style.setProperty('border-color', 'rgba(255,255,255,.28)', 'important')
            sp5.style.setProperty('color', '#fff', 'important')
            const spSpan = sp5.querySelector<HTMLElement>('span')
            if (spSpan) spSpan.style.setProperty('color', 'rgba(255,255,255,.92)', 'important')
          }
          d.querySelectorAll<HTMLElement>('.bs5 .b5t').forEach(track => {
            track.style.setProperty('background', 'rgba(255,255,255,.24)', 'important')
          })
          d.querySelectorAll<HTMLElement>('.bs5 .xf').forEach(fill => {
            fill.style.setProperty('background', '#ffffff', 'important')
          })
          const activeRateBox = d.querySelector<HTMLElement>('.t5g > div.on')
          if (activeRateBox) {
            activeRateBox.style.setProperty('background', bg, 'important')
            activeRateBox.style.setProperty('border-color', border, 'important')
            activeRateBox.querySelectorAll<HTMLElement>('b,span').forEach(el => el.style.setProperty('color', '#fff', 'important'))
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
          const needsOverride = decision.next === 'override'
          const prelim = preliminaryGrade()
          styleGradeCard(prelim, needsOverride)
          if (decision.provisional && chip) { chip.className = 'v5c c-am'; chip.innerHTML = '<i></i>PROVISIONAL' }
          if (needsOverride) {
            if (chip) { chip.className = 'v5c c-am'; chip.innerHTML = '<i></i>OVERRIDE REQUIRED' }
            const h1 = d.querySelector('.v5h h1'); if (h1) h1.textContent = 'Manual override required'
            const gt = d.querySelector('.gt5'); if (gt) gt.textContent = `Grade ${prelim} · Needs Override`
            const gs = d.querySelector('.gs5'); if (gs) gs.textContent = 'Tap below to confirm or override'
            button.textContent = 'Manual override'
            button.onclick = () => runtime.override(w)
          } else {
            button.onclick = () => { if (decision.next === 'print' || decision.grade) api(w).go('receipt') }
          }
          d.querySelectorAll('.lg5').forEach(e => e.textContent = decision.detail)
          if (session.tailAvailability === 'not_available') {
            d.querySelectorAll('.ph5-f span').forEach(el => { if (el.textContent?.includes('Tail')) el.textContent = 'Tail-Cut: NOT AVAILABLE' })
          }
          const finalBack = d.getElementById('bk')
          if (finalBack) finalBack.onclick = () => api(w).modal({
            title: 'Do you want to leave the session?',
            body: 'Your current grading result will be discarded and you will return to the weight input.',
            ok: 'Yes, leave session',
            danger: 1,
            onOk: () => {
              S.core = S.tail = null; S.img = {}; S.w = ''; S.captureTime = undefined
              session = { ...initialSession, graderName: S.name, results: {} }
              order = S.order
              api(w).go('weight')
            }
          })
        }
        if (S.scr === 'weight') {
          const weightBack = d.getElementById('bk')
          if (weightBack) weightBack.onclick = () => api(w).modal({
            title: `Exit as ${S.name?.trim() || 'Grader'} ?`,
            body: 'You will return to the grader selection screen.',
            ok: 'Yes, exit',
            danger: 1,
            onOk: () => {
              S.w = ''; S.core = S.tail = null; S.img = {}; S.captureTime = undefined
              session = { ...initialSession, graderName: S.name, results: {} }
              api(w).go('name')
            }
          })
        }
        if (S.scr === 'welcome' && !d.getElementById('te-ver-chip')) {
          const verChip = d.createElement('button')
          verChip.type = 'button'
          verChip.id = 'te-ver-chip'
          verChip.style.cssText = 'position:absolute;right:18px;top:82px;z-index:20;padding:3px 9px;border-radius:999px;border:1px solid rgba(255,255,255,.35);background:rgba(8,28,76,.55);color:rgba(255,255,255,.92);font:700 10px/1.2 Inter,system-ui,sans-serif;letter-spacing:.04em;cursor:pointer;display:inline-flex;align-items:center;gap:5px'
          verChip.innerHTML = `<span style="width:6px;height:6px;border-radius:50%;background:#38bdf8;display:inline-block"></span><span>v2.6 · Git Log</span>`
          verChip.onclick = () => {
            d.getElementById('te-ver-modal')?.remove()
            const m = d.createElement('div'); m.className = 'ovl'; m.id = 'te-ver-modal'
            const commits: Array<{ hash: string; type: 'merge' | 'branch' | 'main'; branch: string; title: string; v2Base: string; improved: string }> = [
              {
                hash: 'e84c91a',
                type: 'merge',
                branch: 'merge: feat/done-ux-v2.6 → main',
                title: 'Completion Screen ("Results printed." vs "Results recorded.") & 3s Auto-Next',
                v2Base: 'In v2.0: Static "Results printed." heading with a bottom-pinned button and no skip differentiation.',
                improved: 'Improved in v2.6: Dynamically shows "Results recorded." when receipt printing is skipped (or "Results printed." when printed), moves "Grade another" to the middle-center, and runs a live 3-second countdown ring.'
              },
              {
                hash: 'c72b40f',
                type: 'branch',
                branch: 'feat/grade-card-themes',
                title: 'Color-Coded Grade Cards (A/B/C) & Black Override Gradient',
                v2Base: 'In v2.0: White/neutral card with confidence averaged as "Mixed score" and fallback to Grade C.',
                improved: 'Improved in v2.6: Full card gradient colored by grade (A = Green, B = Yellow, C = Red) with white grade letter, or Black gradient when Manual Override is required.'
              },
              {
                hash: 'a19d83e',
                type: 'merge',
                branch: 'merge: feat/tailcut-75-svg → main',
                title: '75% Tail-Cut Confidence Rule, SVG Visual Guide & Auto Camera Reset',
                v2Base: 'In v2.0: Text-only prompt on every core scan and toast-only invalid image error.',
                improved: 'Improved in v2.6: Tail-Cut only requested when Sashibo Core confidence is <75%, with SVG illustrations and side-by-side "Scan Tail-Cut" / "No Tail-Cut" buttons. Invalid scans show a 2s modal and auto-reopen the live camera.'
              },
              {
                hash: '9f04e2b',
                type: 'branch',
                branch: 'feat/override-keypad-2col',
                title: '2-Column Expert Override with On-Screen PIN Number Pad',
                v2Base: 'In v2.0: Single-column form requiring tablet on-screen keyboard for PIN and reason.',
                improved: 'Improved in v2.6: 2-column layout with 12-button touch PIN keypad, quick-tap reason chips, and centered action buttons.'
              },
              {
                hash: '6d51a9c',
                type: 'merge',
                branch: 'merge: feat/camera-droidcam-records → main',
                title: 'Multi-Camera Selector (DroidCam :4747 + USB) & Real Evidence in Records',
                v2Base: 'In v2.0: Fixed Pi :8080 stream only, and Recent Records fell back to demo sample images.',
                improved: 'Improved in v2.6: Added Camera Refresh, Trigger, permission prompt, DroidCam URL (:4747), and real IndexedDB evidence images in Recent Records.'
              },
              {
                hash: '3b10f74',
                type: 'main',
                branch: 'main · v2.0-base',
                title: 'TunaEye V2 Dual-Model Core Architecture & Cloud Sync',
                v2Base: 'Base v2.0: Separate Sashibo Core & Tail-Cut V2 models on Pi 5, offline IndexedDB/SQLite storage, 58mm thermal receipts, and Supabase cloud sync.',
                improved: 'Active foundation: All v2.6 merges build directly on this V2 station pipeline.'
              }
            ]
            const graphNodeSvg = (type: 'merge' | 'branch' | 'main', isLast: boolean) => {
              if (type === 'merge') {
                return `<svg width="36" height="100%" viewBox="0 0 36 110" preserveAspectRatio="none" style="display:block;min-height:96px"><line x1="12" y1="0" x2="12" y2="110" stroke="#388bfd" stroke-width="2.5"/><path d="M12 22 C24 22, 26 36, 26 52 L26 82 C26 96, 22 104, 12 106" fill="none" stroke="#f59e0b" stroke-width="2.2"/><circle cx="12" cy="22" r="6.5" fill="#0d1117" stroke="#388bfd" stroke-width="2.5"/><circle cx="12" cy="22" r="2.8" fill="#388bfd"/></svg>`
              }
              if (type === 'branch') {
                return `<svg width="36" height="100%" viewBox="0 0 36 110" preserveAspectRatio="none" style="display:block;min-height:96px"><line x1="12" y1="0" x2="12" y2="110" stroke="#388bfd" stroke-width="2.5"/><line x1="26" y1="0" x2="26" y2="110" stroke="#f59e0b" stroke-width="2.2"/><circle cx="26" cy="24" r="5.5" fill="#f59e0b" stroke="#0d1117" stroke-width="2"/></svg>`
              }
              return `<svg width="36" height="100%" viewBox="0 0 36 110" preserveAspectRatio="none" style="display:block;min-height:96px"><line x1="12" y1="0" x2="12" y2="${isLast ? '28' : '110'}" stroke="#388bfd" stroke-width="2.5"/><circle cx="12" cy="22" r="5.5" fill="#388bfd" stroke="#0d1117" stroke-width="2"/></svg>`
            }
            m.innerHTML = `<section class="sheet" role="dialog" aria-modal="true" aria-label="Version updates" style="width:min(650px,96%);max-height:88%;overflow:auto;padding:22px;border-radius:24px;background:#0d1117;color:#e6edf3;border:1px solid #30363d;font-family:Inter,system-ui,sans-serif;display:grid;gap:14px;box-shadow:0 28px 70px rgba(0,0,0,.55)">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding-bottom:12px;border-bottom:1px solid #21262d">
                <div>
                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                    <h2 style="margin:0;font-size:18px;color:#fff;letter-spacing:-.02em">TunaEye Git Graph & Version Control</h2>
                    <span style="padding:2px 8px;border-radius:999px;background:rgba(56,139,253,.18);border:1px solid rgba(56,139,253,.4);color:#58a6ff;font:700 10.5px ui-monospace,monospace">HEAD → main (v2.6)</span>
                  </div>
                  <div id="te-ver-live" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:7px;font-size:11px;color:#8b949e">Checking live station & cloud connection…</div>
                </div>
                <button type="button" id="te-ver-close" style="height:32px;padding:0 14px;border-radius:999px;border:1px solid #30363d;background:#161b22;color:#e6edf3;font:600 12px Inter,system-ui,sans-serif;cursor:pointer">Close</button>
              </div>
              <div style="display:grid;gap:0">
                ${commits.map((c, idx) => `<div style="display:grid;grid-template-columns:36px 1fr;gap:8px;align-items:stretch">
                  ${graphNodeSvg(c.type, idx === commits.length - 1)}
                  <div style="margin-bottom:10px;padding:11px 13px;border-radius:14px;background:#161b22;border:1px solid ${c.type === 'merge' ? '#1f6feb' : c.type === 'branch' ? 'rgba(245,158,11,.45)' : '#30363d'}">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:4px">
                      <span style="font:700 12.5px Inter,system-ui,sans-serif;color:#fff">${c.title}</span>
                      <div style="display:flex;align-items:center;gap:5px">
                        <span style="padding:2px 7px;border-radius:999px;background:${c.type === 'merge' ? 'rgba(56,139,253,.16)' : c.type === 'branch' ? 'rgba(245,158,11,.16)' : 'rgba(139,148,158,.16)'};color:${c.type === 'merge' ? '#58a6ff' : c.type === 'branch' ? '#fbbf24' : '#8b949e'};font:700 10px ui-monospace,monospace">${c.branch}</span>
                        <code style="padding:2px 6px;border-radius:6px;background:#0d1117;border:1px solid #30363d;color:#8b949e;font-size:10px">${c.hash}</code>
                      </div>
                    </div>
                    <div style="display:grid;gap:4px;font-size:11.5px;line-height:1.45;margin-top:6px">
                      <div style="padding:5px 8px;border-radius:8px;background:rgba(139,148,158,.1);color:#9ca3af"><b style="color:#cbd5e1">v2.0 Base:</b> ${c.v2Base.replace(/^In v2\.0:\s*|^Base v2\.0:\s*/i, '')}</div>
                      <div style="padding:5px 8px;border-radius:8px;background:rgba(46,160,67,.14);border:1px solid rgba(46,160,67,.3);color:#aff5b4"><b style="color:#56d364">+ Merged Improvement:</b> ${c.improved.replace(/^Improved in v2\.6:\s*|^Active foundation:\s*/i, '')}</div>
                    </div>
                  </div>
                </div>`).join('')}
              </div>
            </section>`
            m.onclick = ev => { if (ev.target === m) m.remove() }
            ;(d.getElementById('stage') ?? d.body).append(m)
            m.querySelector<HTMLButtonElement>('#te-ver-close')!.onclick = () => m.remove()
            void (async () => {
              const liveEl = m.querySelector<HTMLElement>('#te-ver-live')
              if (!liveEl) return
              const settings = getPiSettings()
              let piOk = false, modelsOk = false
              if (settings.configured) {
                try {
                  const st = await checkPiHealth()
                  piOk = true
                  modelsOk = Boolean(st.models?.sashibocore && st.models?.tailcut)
                } catch { piOk = false }
              }
              const cloudOk = navigator.onLine && isSupabaseConfigured() ? await checkCloudConnection().catch(() => false) : false
              if (!liveEl.isConnected) return
              const pillTag = (ok: boolean, text: string) => `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:999px;background:${ok ? 'rgba(46,160,67,.18)' : 'rgba(248,81,73,.16)'};color:${ok ? '#56d364' : '#ff7b72'};border:1px solid ${ok ? 'rgba(46,160,67,.4)' : 'rgba(248,81,73,.35)'};font-weight:700"><i style="width:6px;height:6px;border-radius:50%;background:${ok ? '#3fb950' : '#f85149'};display:inline-block"></i>${text}</span>`
              liveEl.innerHTML = [
                pillTag(piOk, piOk ? 'Pi :5000 Connected' : 'Pi :5000 Offline'),
                pillTag(modelsOk, modelsOk ? 'V2 Models Merged & Active' : 'V2 Models Standby'),
                pillTag(cloudOk, cloudOk ? 'Supabase Cloud Synced' : (navigator.onLine ? 'Cloud Standby' : 'Local Offline Mode')),
                `<span style="padding:2px 8px;border-radius:999px;background:#21262d;color:#c9d1d9;font-weight:600">Threshold: ≥${ACCEPT_CONFIDENCE}%</span>`
              ].join('')
            })()
          }
          ;(d.querySelector('.scr') ?? d.body).append(verChip)
        }
        if (S.scr === 'detail' && S.detail) {
          const det = S.detail as { coreImgId?: string | null; tailImgId?: string | null; coreGrade?: Grade | null; tailGrade?: Grade | null; c?: number | null; tl?: number | null; isDemo?: boolean }
          const gradeColor = (g?: Grade | null) => g === 'A' ? '#12a56a' : g === 'B' ? '#d97706' : '#d9473a'
          const updateDetailBadge = (zoomKey: string, g?: Grade | null, conf?: number | null) => {
            if (!g) return
            const badge = d.querySelector<HTMLElement>(`.ph5[data-zoom="${zoomKey}"] .v5sc`)
            if (badge) {
              badge.textContent = `Grade ${g}${conf != null ? ` · ${Number(conf).toFixed(1)}%` : ''}`
              badge.style.background = gradeColor(g)
            }
          }
          updateDetailBadge('core', det.coreGrade, det.c)
          updateDetailBadge('tail', det.tailGrade, det.tl)
          const bars = d.querySelectorAll<HTMLElement>('.bs5 .b5')
          if (bars[0] && det.coreGrade) { const lbl = bars[0].querySelector('.b5h span'); if (lbl) lbl.textContent = `Core · Grade ${det.coreGrade}` }
          if (bars[1] && det.tailGrade) { const lbl = bars[1].querySelector('.b5h span'); if (lbl) lbl.textContent = `Tail · Grade ${det.tailGrade}` }
          const mixLabel = d.querySelector('.sp5 span'); if (mixLabel) mixLabel.textContent = det.tl != null ? 'Avg confidence' : 'Model confidence'
          styleGradeCard((S.detail as { g?: Grade }).g ?? det.coreGrade, false)
          const loadDetailImg = async (zoomKey: 'core' | 'tail', imgId?: string | null) => {
            const box = d.querySelector<HTMLElement>(`.ph5[data-zoom="${zoomKey}"]`)
            const img = box?.querySelector<HTMLImageElement>('img.v5ph')
            if (!box || !img || det.isDemo) return
            img.classList.remove('dm')
            img.removeAttribute('src')
            img.alt = 'Loading captured image…'
            try {
              const ev = imgId ? await getCapturedEvidence(imgId) : null
              if (!box.isConnected) return
              if (ev?.blob) {
                const url = URL.createObjectURL(ev.blob)
                img.src = url
                img.alt = `${zoomKey === 'core' ? 'Sashibo core' : 'Tail cut'} captured sample`
                try { const zv = w.eval('ZV') as Record<string, string>; if (zv) zv[zoomKey] = url } catch { }
              } else {
                img.alt = 'Captured image unavailable on this device'
              }
            } catch {
              if (box.isConnected) img.alt = 'Captured image unavailable'
            }
          }
          void loadDetailImg('core', det.coreImgId)
          if (det.tl != null || det.tailImgId) void loadDetailImg('tail', det.tailImgId)
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
        if (S.scr === 'receipt') {
          const skip = d.getElementById('sk')
          if (skip) skip.onclick = () => api(w).modal({
            title: 'Skip printing?',
            body: 'The record remains saved locally.',
            ok: 'Skip receipt',
            onOk: () => { receiptSkipped = true; runtime.finish(w) }
          })
          const rsum = d.querySelector<HTMLElement>('.rsum')
          const rtile = d.querySelector<HTMLElement>('.rtile')
          const g = ((rtile?.textContent?.trim() || preliminaryGrade()) as Grade)
          if (rsum) {
            const bg = g === 'A'
              ? 'linear-gradient(155deg,#0d9458 0%,#12a56a 54%,#065f46 100%)'
              : g === 'B'
                ? 'linear-gradient(155deg,#d97706 0%,#eab308 54%,#b45309 100%)'
                : 'linear-gradient(155deg,#dc2626 0%,#ef4444 54%,#991b1b 100%)'
            const border = g === 'A' ? '#34d399' : g === 'B' ? '#fde047' : '#fca5a5'
            rsum.style.setProperty('background', bg, 'important')
            rsum.style.setProperty('border-color', border, 'important')
            rsum.style.setProperty('color', '#fff', 'important')
            if (rtile) {
              rtile.style.setProperty('background', 'rgba(255,255,255,.22)', 'important')
              rtile.style.setProperty('border', '1.5px solid rgba(255,255,255,.45)', 'important')
              rtile.style.setProperty('color', '#fff', 'important')
            }
            rsum.querySelectorAll<HTMLElement>('.ramt, small, b').forEach(el => {
              el.style.setProperty('color', '#fff', 'important')
            })
            rsum.querySelectorAll<HTMLElement>('.rsum-r > div').forEach(cell => {
              cell.style.setProperty('background', 'rgba(0,0,0,.2)', 'important')
              cell.style.setProperty('border-color', 'rgba(255,255,255,.24)', 'important')
            })
            if (!d.getElementById('te-bt-print-btn')) {
              const btWrap = d.createElement('div')
              btWrap.id = 'te-bt-print-btn'
              btWrap.style.cssText = 'margin-top:12px;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 14px;border-radius:14px;background:#f4f8ff;border:1px solid #dbe6fa'
              const renderBt = () => {
                const name = getConnectedBtPrinterName()
                btWrap.innerHTML = `<div style="font-size:12px;color:#334155"><b>Bluetooth 58mm Printer:</b> ${name ? `<span style="color:#15803d;font-weight:700">${name} · Auto-Print ON</span>` : '<span style="color:#64748b">System dialog / Tap to pair direct BT</span>'}</div><button type="button" id="te-bt-pair" style="height:30px;padding:0 12px;border-radius:999px;border:1px solid #c7d8fa;background:#fff;color:#2159e8;font:700 11.5px Inter,system-ui,sans-serif;cursor:pointer">${name ? 'Reconnect BT' : 'Pair BT Printer'}</button>`
                btWrap.querySelector<HTMLButtonElement>('#te-bt-pair')!.onclick = async () => {
                  try {
                    const paired = await pairBluetoothPrinter()
                    renderBt()
                    api(w).toast(`Paired ${paired} — receipts will auto-print directly via Bluetooth`)
                  } catch (err) {
                    api(w).toast(err instanceof Error ? err.message : 'Bluetooth printer pairing cancelled.', 1)
                  }
                }
              }
              renderBt()
              rsum.after(btWrap)
            }
          }
        }
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
    const done = SC.done
    SC.done = () => {
      const screen = done()
      screen.after = () => {
        const d = w.document
        const heading = Array.from(d.querySelectorAll<HTMLElement>('.scr div')).find(el => el.textContent?.trim() === 'Results printed.')
        if (heading) {
          heading.textContent = receiptSkipped ? 'Results recorded.' : 'Results printed.'
          heading.style.margin = '14px 0 16px'
        }
        const sumc = d.querySelector<HTMLElement>('.sumc')
        if (sumc) {
          const tile = sumc.firstElementChild as HTMLElement | null
          const g = (tile?.textContent?.trim() || 'A') as Grade
          const cardBg = g === 'A'
            ? 'linear-gradient(155deg,#0d9458 0%,#12a56a 54%,#065f46 100%)'
            : g === 'B'
              ? 'linear-gradient(155deg,#d97706 0%,#eab308 54%,#b45309 100%)'
              : 'linear-gradient(155deg,#dc2626 0%,#ef4444 54%,#991b1b 100%)'
          const cardBorder = g === 'A' ? '#34d399' : g === 'B' ? '#fde047' : '#fca5a5'
          sumc.style.setProperty('background', cardBg, 'important')
          sumc.style.setProperty('border-color', cardBorder, 'important')
          sumc.style.setProperty('color', '#fff', 'important')
          if (tile) {
            tile.style.setProperty('background', 'rgba(255,255,255,.22)', 'important')
            tile.style.setProperty('border', '1.5px solid rgba(255,255,255,.45)', 'important')
            tile.style.setProperty('color', '#fff', 'important')
          }
          sumc.querySelectorAll<HTMLElement>('div').forEach(el => {
            el.style.setProperty('color', '#fff', 'important')
          })
          const sub = sumc.querySelectorAll<HTMLElement>('div')[3]
          if (sub && sub.textContent) sub.textContent = sub.textContent.replace('Mixed ', 'Confidence ')
        }
        const cdw = d.querySelector<HTMLElement>('.cdw')
        if (cdw) {
          cdw.style.cssText = 'position:static;margin:24px auto 0;display:flex;flex-direction:column;align-items:center;gap:12px'
          cdw.innerHTML = `<button type="button" class="pill" id="te-grade-another" style="min-width:250px;height:58px;padding:0 28px;border-radius:999px;font-size:19px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;gap:12px;box-shadow:0 16px 36px -12px rgba(37,99,255,.55)"><span>Grade another</span><span id="te-cdn-badge" style="width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,.22);display:inline-grid;place-items:center;font-size:15px;font-weight:900">3</span></button><div style="font-size:13px;font-weight:700;color:#64748b">Starting next fish automatically in <b id="te-cdn-txt" style="color:#1e293b">3s</b>…</div>`
          sumc?.parentElement?.append(cdw)
          let remaining = 3
          let cancelled = false
          const triggerNext = () => {
            if (cancelled) return
            cancelled = true
            w.eval('fresh()')
          }
          cdw.querySelector<HTMLButtonElement>('#te-grade-another')!.onclick = triggerNext
          const tick = () => {
            if (cancelled || api(w).S.scr !== 'done' || !cdw.isConnected) return
            remaining -= 1
            if (remaining <= 0) {
              triggerNext()
              return
            }
            const b = cdw.querySelector('#te-cdn-badge')
            const t = cdw.querySelector('#te-cdn-txt')
            if (b) b.textContent = String(remaining)
            if (t) t.textContent = `${remaining}s`
            w.setTimeout(tick, 1000)
          }
          w.setTimeout(tick, 1000)
        }
      }
      return screen
    }
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
      pill.style.cssText = 'position:fixed;left:12px;top:12px;z-index:25;pointer-events:auto;cursor:pointer;width:34px;height:34px;padding:0;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.94);color:#182842;border:1px solid rgba(18,59,112,.18);box-shadow:0 2px 10px rgba(18,59,112,.14)'
      w.document.body.append(pill)
      const barsSvg = (bars: number, color: string) => `<svg width="15" height="13" viewBox="0 0 14 12" aria-hidden="true">${[0, 1, 2].map(i => `<rect x="${i * 5}" y="${8 - i * 3}" width="3" height="${4 + i * 3}" rx="1" fill="${i < bars ? color : '#cbd5e1'}"/>`).join('')}</svg>`
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
            const probeSnap = async (url: string) => {
              const camRes = await fetch(url, { cache: 'no-store', credentials: settings.mode === 'hosted-gateway' ? 'include' : 'omit', signal: AbortSignal.timeout(2500) })
              const ct = camRes.headers.get('content-type') ?? ''
              return camRes.ok && (!ct || ct.startsWith('image/') || ct === 'application/octet-stream')
            }
            try {
              camOk = await probeSnap(settings.snapshotUrl)
            } catch {
              try {
                camOk = settings.apiUrl ? await probeSnap(`${settings.apiUrl}/snapshot`) : false
              } catch { camOk = false }
            }
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
        pill.title = label
        pill.innerHTML = barsSvg(bars, color)
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
  html = html.replaceAll('</head>', '<style>@media(pointer:coarse){.scr>*,.v5row>*,.ltvf,.ltside,.v5h,.med5-l,.dhero,.dsc,.dsr,.drow,.rcr,tr.r,.st,.vs,.sp5,.wl-pill i,.wl-cta i:after,.orb:after,.dhero:before,.fx{animation:none!important}.wl-nav,.wl-pill,.wl-band span,.ovl,.toast,.glass{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}.wl-nav,.wl-band span{background:rgba(8,30,84,.72)!important}}</style></head>')
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
    const standalone = matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches
    const tablet = standalone || (navigator.maxTouchPoints > 0 && matchMedia('(pointer: coarse)').matches && (/Android|iPad|Tablet|Silk|PlayBook/i.test(navigator.userAgent) || navigator.platform === 'MacIntel' || Math.max(window.innerWidth, window.innerHeight) >= 600))
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
      if (child.document.readyState !== 'complete' || !child.document.getElementById('stage')) return
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
