import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react'
import { ACCEPT_CONFIDENCE, currentSample, decisionFor, fishIdForSample, initialSession, isAccepted, reducer, sampleOrder, weightForSample, type DemoOutcome, type FinalDecision, type Grade, type Role, type SampleResult, type SampleType, type Screen } from './kioskState'
import ProductLanding, { type MarketingPage } from './MarketingLanding'
import { PaymentReceiptPrinter } from './components/ui/payment-receipt-printer'
import { getCapturedEvidence, saveCapturedEvidence } from './evidenceStorage'
import { fetchCloudRecords, syncPendingRecords, syncPriceSchedule } from './cloudSync'
import { checkCloudConnection, CLOUD_CONNECTION_EVENT, CloudUnavailableError, getSupabase, hasAdminProfile, isSupabaseConfigured, reportCloudConnection, sendAdminMagicLink } from './supabase'
import { loadRecords, saveRecords, type GradingRecord } from './gradingRecords'
import { demoCanStart, demoScenarios, getDemoPreviewUrl, getDemoScenario, initDemoMode, isDemoMode, parseDemoGradeFromFilename, setDemoGradeHint, setDemoScenario, startPresentationDemo, stopPresentationDemo, type DemoScenario } from './demoMode'
import { SwipeCommit } from './SwipeCommit'
import { capturePiImage, checkPiHealth, getPiSettings, gradePiImage, PI_CONNECTION_GUIDANCE, PiIntegrationError } from './piClient'
import { createId } from './id'
import { loadPriceSchedule, peso, priceSnapshot } from './pricing'

const ADMIN_PIN = '1234'
interface BeforeInstallPromptEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }
const capturedEvidence: Partial<Record<SampleType, string>> = {}
const clearCapturedEvidence = () => { Object.entries(capturedEvidence).forEach(([sample, source]) => { if (source?.startsWith('blob:')) URL.revokeObjectURL(source); delete capturedEvidence[sample as SampleType] }) }
const existingGraders = ['Maria Santos', 'Jose Dela Cruz', 'Ana Mae Lim']
interface AuditEntry { id: string; timestamp: number; actor: string; action: string; detail: string }
const AUDIT_KEY = 'tunaeye-audit-log'
const loadAudit = (): AuditEntry[] => {
  try {
    const saved = JSON.parse(localStorage.getItem(AUDIT_KEY) ?? '[]')
    return Array.isArray(saved) ? saved as AuditEntry[] : []
  } catch {
    return []
  }
}
const loadGraders = (): string[] => {
  try {
    const saved = JSON.parse(localStorage.getItem('tunaeye-graders') ?? 'null')
    return Array.isArray(saved) && saved.every(grader => typeof grader === 'string') ? saved : existingGraders
  } catch {
    return existingGraders
  }
}
const audit = (actor: string, action: string, detail: string) => { const entry = { id: createId(), timestamp: Date.now(), actor, action, detail }; localStorage.setItem(AUDIT_KEY, JSON.stringify([entry, ...loadAudit()].slice(0, 500))) }
const getConnectionSettings = () => ({ rpiUrl: getPiSettings().apiUrl, modelName: localStorage.getItem('tunaeye-model-name') ?? 'TFLite edge model' })
const allScreens: Screen[] = ['welcome', 'select-role', 'admin', 'admin-dashboard', 'grader', 'grader-dashboard', 'sample', 'association', 'tutorial', 'weight', 'camera', 'review', 'analysis', 'individual-result', 'overview', 'print', 'complete']
const pathForScreen = (screen: Screen) => screen === 'welcome' ? '/' : screen === 'select-role' ? '/select-role' : screen === 'admin' || screen === 'admin-dashboard' ? '/admin' : `/kiosk/${screen}`
const screenForPath = (path: string): Screen => { if (path === '/select-role') return 'select-role'; if (path === '/admin') return 'admin'; if (path === '/kiosk/' || path === '/kiosk') return 'welcome'; if (path.startsWith('/kiosk/')) { const candidate = path.replace('/kiosk/', '') as Screen; if (allScreens.includes(candidate)) return candidate } return 'welcome' }
const marketingPageForPath = (path: string): MarketingPage => { const page = path.replace(/^\//, '') as MarketingPage; return ['features', 'about', 'team', 'faq', 'terms', 'privacy'].includes(page) ? page : 'home' }
const requiresHostedAdminAuth = () => isSupabaseConfigured() && !['localhost', '127.0.0.1'].includes(window.location.hostname)
const unfinishedScreens = new Set<Screen>(['sample', 'association', 'tutorial', 'weight', 'camera', 'review', 'analysis', 'individual-result', 'overview', 'print'])
const KIOSK_ACTIVITY_KEY = 'tunaeye-last-activity'
const KIOSK_RELOAD_MARKER_KEY = 'tunaeye-reload-marker'
const KIOSK_IDLE_RESET_MS = 30 * 60 * 1000
const wasReloaded = () => {
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
  const marker = sessionStorage.getItem(KIOSK_RELOAD_MARKER_KEY) === 'true'
  if (navigation?.type === 'reload' || marker) {
    sessionStorage.removeItem(KIOSK_RELOAD_MARKER_KEY)
    return true
  }
  const referrerPath = document.referrer ? new URL(document.referrer, window.location.href).pathname : ''
  const samePageReferrer = referrerPath === window.location.pathname && referrerPath !== ''
  if (samePageReferrer) return true
  return false
}
const isAndroidChrome = () => /Android/i.test(navigator.userAgent) && /Chrome\/\d+/i.test(navigator.userAgent) && !/EdgA|OPR\//i.test(navigator.userAgent)
const nativeKiosk = () => (window as Window & { TunaEyeKiosk?: { exitLockTask?: () => void } }).TunaEyeKiosk
const isNativeAndroidKiosk = () => Boolean(nativeKiosk())

type IconName = 'arrow' | 'back' | 'camera' | 'check' | 'chevron' | 'compress' | 'expand' | 'help' | 'home' | 'lock' | 'play' | 'printer' | 'refresh' | 'scale' | 'shield' | 'spark' | 'tutorial' | 'users' | 'database' | 'settings'
type FullscreenHost = HTMLElement & {
  webkitRequestFullscreen?: (options?: FullscreenOptions) => Promise<void> | void
  webkitRequestFullScreen?: (options?: FullscreenOptions) => Promise<void> | void
}
const fullscreenElement = () => document.fullscreenElement ?? (document as Document & { webkitFullscreenElement?: Element | null }).webkitFullscreenElement ?? null
const forceBrowserFullscreen = async () => {
  const targets: FullscreenHost[] = [document.documentElement, document.body]
  const options: FullscreenOptions = { navigationUI: 'hide' }
  for (const target of targets) {
    try {
      if (target.requestFullscreen) { await target.requestFullscreen(options); break }
      if (target.webkitRequestFullscreen) { await target.webkitRequestFullscreen(options); break }
      if (target.webkitRequestFullScreen) { await target.webkitRequestFullScreen(options); break }
    } catch { /* try the next host */ }
  }
  try { await (screen.orientation as ScreenOrientation & { lock?: (orientation: string) => Promise<void> }).lock?.('landscape') } catch { /* lock is optional after fullscreen */ }
}

function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
  switch (name) {
    case 'arrow': return <svg {...common}><path d="M5 12h13" /><path d="m13 6 6 6-6 6" /></svg>
    case 'back': return <svg {...common}><path d="m14.5 5-7 7 7 7" /><path d="M8 12h11" /></svg>
    case 'camera': return <svg {...common}><path d="M4 8.5h3l1.5-2h7L17 8.5h3v10H4z" /><circle cx="12" cy="13.5" r="3.5" /></svg>
    case 'check': return <svg {...common}><path d="m5 12 4.2 4.2L19 6.5" /></svg>
    case 'chevron': return <svg {...common}><path d="m9 5 7 7-7 7" /></svg>
    case 'compress': return <svg {...common}><path d="M9 3v6H3" /><path d="M15 21v-6h6" /><path d="M21 9h-6V3" /><path d="M3 15h6v6" /></svg>
    case 'expand': return <svg {...common}><path d="M9 3H3v6" /><path d="M15 21h6v-6" /><path d="M21 9V3h-6" /><path d="M3 15v6h6" /></svg>
    case 'help': return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M9.8 9.3a2.3 2.3 0 1 1 3.3 2.1c-.9.4-1.1.9-1.1 1.8" /><path d="M12 16.5h.01" /></svg>
    case 'home': return <svg {...common}><path d="m4 10 8-6 8 6" /><path d="M6 9.5V20h12V9.5" /><path d="M10 20v-5h4v5" /></svg>
    case 'lock': return <svg {...common}><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
    case 'play': return <svg {...common}><path d="m9 6 9 6-9 6z" fill="currentColor" stroke="none" /></svg>
    case 'printer': return <svg {...common}><path d="M7 9V4h10v5" /><path d="M6 18H4v-7h16v7h-2" /><path d="M7 15h10v5H7z" /><path d="M17 12h.01" /></svg>
    case 'refresh': return <svg {...common}><path d="M20 11a8 8 0 0 0-14.7-4L4 9" /><path d="M4 4v5h5" /><path d="M4 13a8 8 0 0 0 14.7 4L20 15" /><path d="M20 20v-5h-5" /></svg>
    case 'scale': return <svg {...common}><path d="M4 6h16" /><path d="M7 6v12" /><path d="M17 6v12" /><path d="M4 18h16" /><path d="M12 8v8" /><path d="m9 11 3-3 3 3" /></svg>
    case 'shield': return <svg {...common}><path d="M12 3 19 6v5c0 4.5-2.7 8-7 10-4.3-2-7-5.5-7-10V6z" /><path d="m9 12 2 2 4-4" /></svg>
    case 'spark': return <svg {...common}><path d="m12 3 1.3 5.7L19 10l-5.7 1.3L12 17l-1.3-5.7L5 10l5.7-1.3z" /></svg>
    case 'tutorial': return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M9.7 9.2a2.5 2.5 0 1 1 3.7 2.2c-.9.5-1.4 1-1.4 2" /><path d="M12 16.5h.01" /></svg>
    case 'users': return <svg {...common}><path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20" /><circle cx="10" cy="8" r="3" /><path d="M16 11a3 3 0 1 0-1.4-5.6" /><path d="M17 15.2a3.5 3.5 0 0 1 3 3.3V20" /></svg>
    case 'database': return <svg {...common}><ellipse cx="12" cy="5" rx="7" ry="3" /><path d="M5 5v7c0 1.7 3.1 3 7 3s7-1.3 7-3V5" /><path d="M5 12v7c0 1.7 3.1 3 7 3s7-1.3 7-3v-7" /></svg>
    case 'settings': return <svg {...common}><path d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Z" /><path d="m19.4 15 .1.1a2 2 0 1 1-2.8 2.8l-.1-.1a2 2 0 0 0-3.4 1.4v.2a2 2 0 1 1-4 0v-.2a2 2 0 0 0-3.4-1.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a2 2 0 0 0-1.4-3.4h-.2a2 2 0 1 1 0-4h.2a2 2 0 0 0 1.4-3.4l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A2 2 0 0 0 9.2 1.8v-.2a2 2 0 1 1 4 0v.2a2 2 0 0 0 3.4 1.4l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A2 2 0 0 0 20.8 9h.2a2 2 0 1 1 0 4h-.2a2 2 0 0 0-1.4 2Z" /></svg>
  }
}

function RoleIcon({ role }: { role: 'admin' | 'expert' }) {
  const common = { width: 46, height: 46, viewBox: '0 0 48 48', fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
  return role === 'admin'
    ? <svg {...common}><rect x="6" y="8" width="36" height="32" rx="8"/><path d="M15 17h18M15 24h18M15 31h18"/><circle cx="20" cy="17" r="2.5" fill="currentColor" stroke="none"/><circle cx="30" cy="24" r="2.5" fill="currentColor" stroke="none"/><circle cx="23" cy="31" r="2.5" fill="currentColor" stroke="none"/></svg>
    : <svg {...common}><path d="M5 24s7-11 19-11 19 11 19 11-7 11-19 11S5 24 5 24Z"/><circle cx="24" cy="24" r="6"/><path d="M24 5v5M24 38v5M5 24h5M38 24h5"/></svg>
}

function BrandMark({ compact = false }: { compact?: boolean }) { return <div className={`brand-mark ${compact ? 'brand-mark--compact' : ''}`} aria-label="TunaEye"><span className="brand-symbol" aria-hidden="true"><span /></span><span className="brand-word">Tuna<span>Eye</span></span></div> }
function Spinner({ className = '' }: { className?: string }) { return <span className={`spinner ${className}`} role="presentation" aria-hidden="true" /> }
function Button({ children, variant = 'primary', icon, onClick, disabled = false, loading = false, className = '' }: { children: ReactNode; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; icon?: IconName; onClick?: () => void; disabled?: boolean; loading?: boolean; className?: string }) { return <button type="button" className={`btn btn--${variant} ${loading ? 'is-loading' : ''} ${className}`} onClick={onClick} disabled={disabled || loading} aria-busy={loading || undefined}>{children}{loading ? <Spinner className="spinner--on-btn" /> : icon && <Icon name={icon} size={23} />}</button> }
function StepRail({ active }: { active: number }) { const steps = ['Capture', 'Analyze', 'Result']; return <div className="step-rail" aria-label={`Workflow progress, ${steps[Math.min(Math.max(active, 0), 2)]} stage`}>{steps.map((step, index) => <div className={`step-rail__item ${index <= active ? 'is-active' : ''}`} key={step}><span className="step-rail__dot">{index < active ? <Icon name="check" size={16} /> : index + 1}</span><span>{step}</span>{index < steps.length - 1 && <i />}</div>)}</div> }
function WorkflowStrip({ step }: { step: 'weight' | 'sashibo' | 'tail' | 'print' }) { const steps = [{ id: 'weight', label: 'Weight' }, { id: 'sashibo', label: 'Sashibo' }, { id: 'tail', label: 'Tail if needed' }, { id: 'print', label: 'Print' }]; const active = steps.findIndex(item => item.id === step); return <div className="workflow-strip" aria-label="Grading steps">{steps.map((item, index) => <span key={item.id} className={index === active ? 'is-current' : index < active ? 'is-done' : ''}>{index < active ? <Icon name="check" size={14} /> : index + 1} {item.label}</span>)}</div> }
function BottomBar({ onBack, onHelp, primary, primaryLabel, primaryIcon = 'arrow', primaryDisabled = false, primaryLoading = false, secondaryLabel, secondaryDisabled = false, secondaryLoading = false, onSecondary }: { onBack?: () => void; onHelp?: () => void; primary?: () => void; primaryLabel?: string; primaryIcon?: IconName; primaryDisabled?: boolean; primaryLoading?: boolean; secondaryLabel?: string; secondaryDisabled?: boolean; secondaryLoading?: boolean; onSecondary?: () => void }) { return <footer className="bottom-bar"><div className="bottom-bar__left">{onBack && <Button variant="ghost" icon="back" onClick={onBack}>Back</Button>}{onHelp && <Button variant="ghost" icon="help" onClick={onHelp}>Help</Button>}</div><div className="bottom-bar__right">{secondaryLabel && onSecondary && <Button variant="secondary" onClick={onSecondary} disabled={secondaryDisabled} loading={secondaryLoading}>{secondaryLabel}</Button>}{primary && primaryLabel && <Button onClick={primary} icon={primaryIcon} disabled={primaryDisabled} loading={primaryLoading}>{primaryLabel}</Button>}</div></footer> }
function SampleArt({ sample, className = '' }: { sample: SampleType; className?: string }) { return <img className={`sample-art ${className}`} src={sample === 'Sashibo core' ? '/assets/sashiboCoreFull.png' : '/assets/tailCutFull.png'} alt={`${sample} reference`} /> }
function EvidenceFrame({ sample = 'Sashibo core', mode = 'camera', frozen = false }: { sample?: SampleType; mode?: 'camera' | 'sample' | 'tray'; frozen?: boolean }) { const image = mode === 'sample' ? capturedEvidence[sample] : undefined; return <div className={`evidence-frame evidence-frame--${mode} ${frozen ? 'is-frozen' : ''}`}><div className="evidence-frame__topline"><span>{mode === 'camera' ? 'Live preview' : mode === 'sample' ? 'Captured camera image' : 'Controlled chamber'}</span><span className="evidence-frame__signal"><span className="status-dot" />{mode === 'camera' ? 'Ready' : 'Saved'}</span></div>{image ? <img className="evidence-frame__capture" src={image} alt={`Captured ${sample}`} /> : <div className="chamber"><div className="chamber__rail chamber__rail--left" /><div className="chamber__rail chamber__rail--right" /><div className="tuna-silhouette"><span className="tuna-silhouette__tail" /><span className="tuna-silhouette__body" /><span className="tuna-silhouette__eye" /></div><div className="target-corners"><i /><i /><i /><i /></div>{mode === 'camera' && <div className="camera-crosshair"><span /></div>}</div>}<div className="evidence-frame__bottomline"><span>{frozen ? `${sample} image held for review` : 'Align within the blue guide'}</span><span className="evidence-frame__time">Top-down view</span></div></div> }
function StoredEvidenceImage({ evidenceId, legacySource, className, alt }: { evidenceId?: string; legacySource?: string; className?: string; alt: string }) {
  const [source, setSource] = useState(legacySource)
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>(legacySource ? 'ready' : 'loading')
  useEffect(() => {
    if (!evidenceId) { setStatus(legacySource ? 'ready' : 'unavailable'); return }
    let objectUrl = ''
    void getCapturedEvidence(evidenceId).then(evidence => {
      if (!evidence) { setStatus('unavailable'); return }
      objectUrl = URL.createObjectURL(evidence.blob)
      setSource(objectUrl)
      setStatus('ready')
    }).catch(() => setStatus('unavailable'))
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [evidenceId, legacySource])
  if (status === 'loading') return <div className={`${className ?? ''} stored-evidence--missing`} role="status">Loading image…</div>
  return source ? <img className={className} src={source} alt={alt} /> : <div className={`${className ?? ''} stored-evidence--missing`} role="status">Image unavailable</div>
}
function ImageSyncLabel({ record }: { record: GradingRecord }) {
  if (!record.capturedImageId && !record.capturedImage && !record.remoteImagePath) return null
  const state = record.transaction?.syncState ?? 'pending'
  return <span className={`image-sync-label image-sync-label--${state}`}>{state === 'synced' ? 'Synced' : state === 'syncing' ? 'Syncing…' : state === 'failed' ? 'Sync needs retry' : 'Saved locally'}</span>
}
function InternetRecoveryToast({ active }: { active: boolean }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    setVisible(false)
    if (!active || !isSupabaseConfigured()) return
    let previous: boolean | null = null
    let dismissTimer: number | undefined
    const connectionChanged = (event: Event) => {
      const available = (event as CustomEvent<boolean>).detail
      if (previous === false && available) {
        setVisible(true)
        window.clearTimeout(dismissTimer)
        dismissTimer = window.setTimeout(() => setVisible(false), 8000)
      } else if (!available) setVisible(false)
      previous = available
    }
    const check = () => { if (document.visibilityState === 'visible') void checkCloudConnection() }
    const offline = () => reportCloudConnection(false)
    window.addEventListener(CLOUD_CONNECTION_EVENT, connectionChanged)
    window.addEventListener('online', check)
    window.addEventListener('offline', offline)
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', check)
    check()
    const interval = window.setInterval(check, 15000)
    return () => {
      window.clearInterval(interval)
      window.clearTimeout(dismissTimer)
      window.removeEventListener(CLOUD_CONNECTION_EVENT, connectionChanged)
      window.removeEventListener('online', check)
      window.removeEventListener('offline', offline)
      window.removeEventListener('focus', check)
      document.removeEventListener('visibilitychange', check)
    }
  }, [active])
  return active && visible ? <div className="capture-toast internet-toast" role="status" aria-live="polite"><span className="capture-toast__ring"><Icon name="check" size={22} /></span><span><strong>Internet is back</strong><small>You can sync your saved images now.</small></span><button className="icon-button" aria-label="Dismiss internet message" onClick={() => setVisible(false)}>×</button></div> : null
}
function TutorialModal({ onClose, title = 'Guided tutorial' }: { onClose: () => void; title?: string }) { return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={title}><div className="modal-card"><div className="modal-card__header"><div><span className="eyebrow">{title}</span><h2>Three quick checks before capture</h2></div><button className="icon-button" aria-label="Close tutorial" onClick={onClose}>×</button></div><div className="tutorial-list"><div><span>01</span><div><strong>Pull the tray out</strong><p>Use the chamber handle and keep the sample surface clean.</p></div></div><div><span>02</span><div><strong>Place the tuna flat</strong><p>Keep the selected sample centered in the blue guide.</p></div></div><div><span>03</span><div><strong>Check the view</strong><p>When the image is clear, press Capture once.</p></div></div></div><Button onClick={onClose} icon="check">Got it</Button></div></div> }
function LegalModal({ kind, onClose }: { kind: 'terms' | 'privacy'; onClose: () => void }) { const privacy = kind === 'privacy'; return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={privacy ? 'Privacy policy' : 'Terms and conditions'}><div className="modal-card legal-modal"><div className="modal-card__header"><div><span className="eyebrow">TunaEye</span><h2>{privacy ? 'Privacy policy' : 'Terms and conditions'}</h2></div><button className="icon-button" aria-label="Close" onClick={onClose}>×</button></div><div className="legal-modal__body"><p>{privacy ? 'TunaEye stores grading evidence, grader identity, device events, and audit records for operational traceability. Authorized administrators control retention and cloud synchronization through the configured services.' : 'TunaEye supports trained tuna graders and does not replace required regulatory, safety, or purchasing review. Operators remain responsible for confirming the sample, fish association, and final decision.'}</p></div><div className="legal-modal__actions"><Button onClick={onClose}>Close</Button></div></div></div> }

export interface NoticeModalData {
  title: string
  message: string
  items?: string[]
  icon?: IconName
  actionLabel?: string
  cancelLabel?: string
  onAction?: () => void
}

function NoticeModal({ notice, onClose }: { notice: NoticeModalData; onClose: () => void }) {
  const actionRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    actionRef.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="notice-title" aria-describedby="notice-message" onClick={onClose}>
      <div className="modal-card modal-card--notice" onClick={e => e.stopPropagation()}>
        <div className="notice-modal__header">
          <span className="notice-modal__icon">
            <Icon name={notice.icon ?? 'spark'} size={26} />
          </span>
          <div className="notice-modal__body">
            <h2 id="notice-title">{notice.title}</h2>
            <p id="notice-message">{notice.message}</p>
          </div>
        </div>
        {notice.items && notice.items.length > 0 && (
          <ul className="notice-modal__list">
            {notice.items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        )}
        <div className="notice-modal__actions">
          {notice.cancelLabel && <button type="button" className="btn btn--secondary" onClick={onClose}>{notice.cancelLabel}</button>}
          <button ref={actionRef} type="button" className="btn btn--primary" onClick={() => { notice.onAction?.(); onClose() }}>{notice.actionLabel ?? 'Understood'}</button>
        </div>
      </div>
    </div>
  )
}
import KiloThermalDial from './KiloThermalDial'

function LoadingScreen() {
  const [percent, setPercent] = useState(1)
  useEffect(() => {
    const timer = setInterval(() => {
      setPercent(c => (c >= 100 ? 100 : c + 1))
    }, 7)
    return () => clearInterval(timer)
  }, [])
  return (
    <div className="brand-loading">
      <KiloThermalDial value={percent} min={0} max={100} size={300} theme="light" hint={false} unit="%" />
    </div>
  )
}

function DemoControlBar({ scenario, onScenario, open, onToggle }: { scenario: DemoScenario; onScenario: (scenario: DemoScenario) => void; open: boolean; onToggle: () => void }) {
  return (
    <aside className={`demo-control-bar ${open ? 'is-open' : ''}`} aria-label="Presentation controls">
      <button type="button" className="demo-control-trigger" onClick={onToggle} aria-label="Open presentation controls" aria-expanded={open} />
      {open && <div className="demo-control-bar__scenarios" role="group" aria-label="Presentation outcome">
          {demoScenarios().map(item => (
            <button key={item.id} type="button" className={scenario === item.id ? 'is-selected' : ''} aria-pressed={scenario === item.id} onClick={() => onScenario(item.id)}>
              <strong>{item.label}</strong>
              <small>{item.detail}</small>
            </button>
          ))}
        </div>}
    </aside>
  )
}

function WelcomeScreen({ onStart, onDemo, onInstall, onTutorial, onGoMain, installed }: { onStart: () => void; onDemo?: () => void; onInstall: () => void; onTutorial: () => void; onGoMain: () => void; installed: boolean }) {
  const [entered, setEntered] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(() => Boolean(fullscreenElement()))
  useEffect(() => { const t = setTimeout(() => setEntered(true), 100); return () => clearTimeout(t) }, [])
  useEffect(() => {
    const sync = () => setIsFullscreen(Boolean(fullscreenElement()))
    document.addEventListener('fullscreenchange', sync)
    document.addEventListener('webkitfullscreenchange', sync)
    return () => {
      document.removeEventListener('fullscreenchange', sync)
      document.removeEventListener('webkitfullscreenchange', sync)
    }
  }, [])
  const toggleFullscreen = () => { if (!isFullscreen) void forceBrowserFullscreen() }
  return (
    <div className={`welcome-screen welcome-screen--v2 ${entered ? 'is-entered' : ''}`}>
      <div className="welcome-screen__bg" />
      <div className="welcome-screen__content">
        <div className="welcome-brand-hero">
          <h1 className="welcome-brand-hero__title" style={{ color: '#ffffff' }}>TUNA<span style={{ color: '#3B8CFF' }}>EYE</span></h1>
          <p className="welcome-brand-hero__sub" style={{ color: '#ffffff' }}>KIOSK</p>
          <p className="welcome-brand-hero__tagline" style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '20px', marginTop: '12px' }}>AI-Powered Automated Tuna Grading System</p>
        </div>
        <div className="welcome-cta-group" style={{ marginTop: '32px' }}>
          <Button className="btn--hero welcome-cta-main" onClick={onStart} icon="arrow">Get started</Button>
          {onDemo && <Button className="welcome-cta-demo" onClick={onDemo} icon="spark">Live demo</Button>}
          <Button variant="secondary" onClick={onGoMain} icon="home">Go to main page</Button>
          {!installed && <Button variant="ghost" onClick={onInstall} icon="home" className="welcome-btn--install">Install App</Button>}
        </div>
      </div>
      <button className="welcome-fullscreen-btn" onClick={toggleFullscreen} aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} title={isFullscreen ? 'Fullscreen enabled' : 'Enter fullscreen'}><Icon name={isFullscreen ? 'compress' : 'expand'} size={18} /></button>
      <button className="tutorial-fab tutorial-fab--glass" onClick={onTutorial} aria-label="Guided Tutorial"><Icon name="tutorial" size={20} /></button>
    </div>
  )
}
function SelectRoleScreen({ onRole, onBack }: { onRole: (role: Role) => void; onBack?: () => void }) {
  return (
    <div className="screen-stack screen-stack--role screen-stack--role-v2">
      <div className="role-heading-v3"><span className="eyebrow">Choose your workspace</span><h1 className="role-title-v2">Who's grading?</h1><p>Sashibo core is graded first. A tail cut is requested only when that result is under 80%, and the receipt prints as soon as the grade is final.</p></div>
      <div className="role-actions role-actions--v2">
        <button className="role-card-v2 role-card-v2--admin" onClick={() => onRole('admin')}>
          <span className="role-card-v2__top"><span className="role-card-v2__badge">Station control</span><Icon name="arrow" size={20} /></span>
          <span className="role-card-v2__icon role-card-v2__icon--admin"><RoleIcon role="admin" /></span>
          <span className="role-card-v2__copy"><strong>Admin</strong><small></small></span>
          <span className="role-card-v2__action">Open admin console <Icon name="arrow" size={18} /></span>
        </button>
        <button className="role-card-v2 role-card-v2--primary" onClick={() => onRole('expert')}>
          <span className="role-card-v2__top"><span className="role-card-v2__badge">Expert workflow</span><Icon name="arrow" size={20} /></span>
          <span className="role-card-v2__icon role-card-v2__icon--expert"><RoleIcon role="expert" /></span>
          <span className="role-card-v2__copy"><strong>Expert Grader</strong><small></small></span>
          <span className="role-card-v2__action">Start grading <Icon name="arrow" size={18} /></span>
        </button>
      </div>
      <div className="role-bottom role-bottom--v2" aria-hidden="true" />
      <BottomBar onBack={onBack} />
    </div>
  )
}
function AdminPinScreen({ value, error, onChange, onContinue, onBack }: { value: string; error: string; onChange: (value: string) => void; onContinue: () => void; onBack: () => void }) { const cells = useRef<Array<HTMLInputElement | null>>([]); const setDigit = (index: number, digit: string) => { const next = value.padEnd(4, ' ').split(' '); next[index] = digit.slice(-1); const joined = next.join('').replace(/\s/g, '').slice(0, 4); onChange(joined); if (digit && index < 3) cells.current[index + 1]?.focus() }; return <div className="screen-stack screen-stack--narrow otp-screen"><div className="admin-icon"><Icon name="shield" size={34} /></div><h1>Enter your admin PIN</h1><div className="otp-inputs" onPaste={event => { event.preventDefault(); const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4); onChange(pasted); cells.current[Math.min(3, pasted.length)]?.focus() }}>{[0,1,2,3].map(index => <input key={index} ref={node => { cells.current[index] = node }} autoFocus={index === 0} inputMode="numeric" type="password" value={value[index] ?? ''} maxLength={1} aria-label={`PIN digit ${index + 1}`} onChange={event => setDigit(index, event.target.value.replace(/\D/g, ''))} onKeyDown={event => { if (event.key === 'Backspace' && !value[index] && index > 0) { const next = value.slice(0, index - 1) + value.slice(index); onChange(next); cells.current[index - 1]?.focus() } if (event.key === 'Enter' && value.length === 4) onContinue() }} />)}</div>{error ? <span className="error-text"><Icon name="help" size={16} />{error}</span> : <span className="form-hint"><Icon name="shield" size={16} />Protected administrator access</span>}<BottomBar onBack={onBack} primary={onContinue} primaryLabel="Verify and continue" primaryIcon="lock" primaryDisabled={value.length < 4} /></div> }

function AdminMagicLinkScreen({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const send = async () => {
    if (sending) return
    setSending(true)
    setMessage('')
    try {
      await sendAdminMagicLink(email)
      setMessage('Check that inbox and open the secure TunaEye sign-in link on this tablet.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The sign-in link could not be sent.')
    } finally { setSending(false) }
  }
  return <div className="screen-stack screen-stack--narrow otp-screen"><div className="admin-icon"><Icon name="shield" size={34} /></div><h1>Confirm hosted admin access</h1><p>Use the administrator email registered in Supabase to view synced kiosk records.</p><label className="field-label"><span>Administrator email</span><input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" placeholder="admin@example.com" /></label>{message && <span className="form-hint" role="status"><Icon name="help" size={16} />{message}</span>}<BottomBar onBack={onBack} primary={send} primaryLabel={sending ? 'Sending link…' : 'Email me a sign-in link'} primaryIcon="arrow" primaryDisabled={sending || !email.trim()} /></div>
}

function AdminTrendGraph({ data }: { data: { label: string; value: number }[] }) {
  const [active, setActive] = useState(data.length - 1)
  const width = 700, height = 220, left = 34, right = 22, top = 26, bottom = 38
  const peak = Math.max(1, ...data.map(point => point.value))
  const points = data.map((point, index) => ({ ...point, x: left + index * ((width - left - right) / Math.max(1, data.length - 1)), y: top + (peak - point.value) / peak * (height - top - bottom) }))
  const path = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ')
  return <div className="admin-trend" data-testid="admin-simple-graph"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Weekly grading volume line graph"><defs><linearGradient id="adminTrendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#176BFF" stopOpacity=".24"/><stop offset="1" stopColor="#176BFF" stopOpacity="0"/></linearGradient></defs>{[0,.25,.5,.75,1].map(level => <line key={level} x1={left} x2={width-right} y1={top + level * (height-top-bottom)} y2={top + level * (height-top-bottom)} className="admin-trend__grid"/>)}<path d={`${path} L ${points.at(-1)?.x ?? 0} ${height-bottom} L ${points[0]?.x ?? 0} ${height-bottom} Z`} className="admin-trend__fill"/><path d={path} className="admin-trend__line"/>{points.map((point,index) => <g key={point.label} role="button" tabIndex={0} aria-label={`${point.label}: ${point.value} samples`} onMouseEnter={() => setActive(index)} onFocus={() => setActive(index)}><circle cx={point.x} cy={point.y} r="16" className="admin-trend__target"/><circle cx={point.x} cy={point.y} r={active === index ? 7 : 5} className={active === index ? 'admin-trend__dot is-active' : 'admin-trend__dot'}/><text x={point.x} y={height-12} textAnchor="middle" className="admin-trend__label">{point.label}</text></g>)}</svg><div className="admin-trend__tooltip" style={{ left: `${Math.min(88, Math.max(12, points[active] ? points[active].x / width * 100 : 50))}%` }}><strong>{points[active]?.value ?? 0}</strong><span>{points[active]?.label} samples</span></div></div>
}

function AdminDashboard({ onExit, onStartGrading, onNotice }: { onExit: () => void; onStartGrading: () => void; onNotice?: (notice: NoticeModalData) => void }) {
  type Section = 'Overview' | 'Records' | 'Price schedule' | 'Expert graders' | 'Devices' | 'Audit logs' | 'Settings'
  const [section, setSection] = useState<Section>('Overview')
  const [query, setQuery] = useState('')
  const [prices, setPrices] = useState<Record<Grade, string>>(() => Object.fromEntries(Object.entries(loadPriceSchedule()).map(([grade, value]) => [grade, String(value)])) as Record<Grade, string>)
  const [savingPrices, setSavingPrices] = useState(false)
  const [graders, setGraders] = useState(loadGraders)
  const [newGrader, setNewGrader] = useState('')
  const [diagnostic, setDiagnostic] = useState('Ready to run')
  const [stationName, setStationName] = useState(() => localStorage.getItem('tunaeye-station') ?? 'TunaEye Station 01')
  const [connections, setConnections] = useState(getConnectionSettings)
  const [rpiStatus, setRpiStatus] = useState<'Not checked' | 'Checking' | 'Connected' | 'Unavailable'>('Not checked')
  const [auditEntries, setAuditEntries] = useState(loadAudit)
  const [records, setRecords] = useState<GradingRecord[]>(() => loadRecords().filter(record => record.transaction?.syncState === 'synced'))
  const [lastSync, setLastSync] = useState(() => localStorage.getItem('tunaeye-last-sync') ?? 'Not synced yet')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [cloudStatus, setCloudStatus] = useState(isSupabaseConfigured() && navigator.onLine ? 'Loading cloud records…' : navigator.onLine ? 'Cloud not configured' : 'Offline · showing saved records')

  useEffect(() => {
    const refresh = () => {
      setRecords(loadRecords().filter(record => record.transaction?.syncState === 'synced'))
      setAuditEntries(loadAudit())
    }
    refresh()
    if (isSupabaseConfigured() && navigator.onLine) void getSupabase().auth.getSession().then(async (result: { data: { session: unknown } }) => {
      if (result.data.session) setRecords(await fetchCloudRecords())
      setCloudStatus(result.data.session ? 'Cloud records loaded' : 'Sign in required · showing saved records')
    }).catch(() => setCloudStatus('Cloud unavailable · showing saved records'))
    window.addEventListener('storage', refresh)
    window.addEventListener('tunaeye-records-updated', refresh)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('tunaeye-records-updated', refresh)
    }
  }, [])
  const sessionCount = new Set(records.map(record => record.sessionId)).size
  const totalWeight = records.reduce((sum, record) => sum + (Number.parseFloat(record.weight) || 0), 0)
  const gradeARate = records.length ? Math.round(records.filter(record => record.grade === 'A').length / records.length * 100) : 0
  const visibleRecords = records.filter(record => JSON.stringify(record).toLowerCase().includes(query.trim().toLowerCase()))
  const weeklyData = useMemo(() => Array.from({ length: 7 }, (_, index) => { const day = new Date(); day.setHours(0,0,0,0); day.setDate(day.getDate() - (6 - index)); const end = day.getTime() + 86_400_000; return { label: day.toLocaleDateString([], { weekday: 'short' }), value: records.filter(record => record.timestamp >= day.getTime() && record.timestamp < end).length } }), [records])
  const nav: { label: Section; icon: IconName }[] = [{ label: 'Overview', icon: 'home' }, { label: 'Records', icon: 'database' }, { label: 'Price schedule', icon: 'scale' }, { label: 'Expert graders', icon: 'users' }, { label: 'Devices', icon: 'camera' }, { label: 'Audit logs', icon: 'shield' }, { label: 'Settings', icon: 'settings' }]
  const savePrices = async () => {
    if (savingPrices) return
    const numeric = Object.fromEntries((['A', 'B', 'C'] as Grade[]).map(item => [item, Number(prices[item])])) as Record<Grade, number>
    if (Object.values(numeric).some(value => !Number.isFinite(value) || value < 0)) { onNotice?.({ title: 'Check price schedule', message: 'Enter a valid non-negative price for every grade.', icon: 'help' }); return }
    localStorage.setItem('tunaeye-prices', JSON.stringify(numeric))
    setSavingPrices(true)
    try {
      await syncPriceSchedule(numeric)
      onNotice?.({ title: 'Price schedule synced', message: 'Grade A, B, and C prices are saved on this device and in Supabase.', icon: 'scale' })
    } catch (error) {
      onNotice?.({ title: 'Saved on this device', message: error instanceof Error ? error.message : 'Cloud price synchronization failed.', icon: 'help' })
    } finally { setSavingPrices(false) }
  }
  const saveGraders = (next: string[]) => { setGraders(next); localStorage.setItem('tunaeye-graders', JSON.stringify(next)) }
  const syncRecords = async () => {
    if (syncing) return
    setSyncing(true)
    try {
      const summary = await syncPendingRecords()
      if (!summary.waiting) setRecords(await fetchCloudRecords())
      if (summary.synced) {
        const syncedAt = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
        setLastSync(syncedAt)
        localStorage.setItem('tunaeye-last-sync', syncedAt)
      }
      audit('Admin', 'Manual sync', `${summary.synced} records synchronized; ${summary.failed} failed`)
      onNotice?.({ title: summary.waiting ? 'Waiting for internet' : summary.failed ? 'Sync completed with errors' : 'Sync complete', message: `${summary.synced} records synchronized. ${summary.waiting ? `${summary.waiting} waiting for internet. ` : ''}${summary.failed} remain available for retry.${summary.firstError ? ` ${summary.firstError}` : ''}`, icon: 'refresh' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Synchronization failed.'
      audit('Admin', 'Manual sync failed', message)
      onNotice?.({ title: error instanceof CloudUnavailableError ? 'Waiting for internet' : 'Sync unavailable', message, icon: 'help' })
    } finally { setSyncing(false) }
  }
  const testRpi = async () => { setRpiStatus('Checking'); try { const health = await checkPiHealth(connections.rpiUrl); const models = health.models ? Object.entries(health.models).filter(([, ready]) => ready).map(([name]) => name).join(' + ') : health.model; if (models) setConnections(current => ({ ...current, modelName: models })); setRpiStatus('Connected'); audit('Admin', 'RPi connection test', `Connected to ${connections.rpiUrl}`) } catch (error) { console.error('RPi status check failed', error); setRpiStatus('Unavailable'); audit('Admin', 'RPi connection test', `Unable to reach ${connections.rpiUrl}`) } }
  const runDiagnostics = async () => { setDiagnostic('Testing Pi camera…'); try { await capturePiImage(); setDiagnostic('Pi camera operational') } catch { setDiagnostic('Pi camera unavailable') } }
  const heading = section === 'Overview' ? 'Good day, Admin.' : section
  return <div className={`admin-workspace ${sidebarCollapsed ? 'admin-workspace--collapsed' : ''}`}><aside className="admin-sidebar"><button className="admin-sidebar__brand-link" onClick={() => { window.location.href = '/' }} aria-label="Go to TunaEye home"><BrandMark compact /></button><button className="admin-sidebar__toggle" onClick={() => setSidebarCollapsed(value => !value)} aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}><Icon name={sidebarCollapsed ? 'arrow' : 'back'} size={20} /></button><nav>{nav.map(item => <button key={item.label} className={section === item.label ? 'is-active' : ''} onClick={() => setSection(item.label)}><Icon name={item.icon} size={20} /><span>{item.label}</span></button>)}</nav><div className="admin-sidebar__foot"><span><i className="status-dot" />{navigator.onLine ? 'System online' : 'Offline'}</span><button onClick={() => { audit('Admin', 'Logout', 'Administrator ended the session'); onExit() }}><Icon name="back" size={18} /><span>Logout</span></button></div></aside><section className="admin-content"><header className="admin-content__header"><div><span className="eyebrow">{stationName} · Admin console</span><h1>{heading}</h1><p role="status">{section === 'Overview' ? `${cloudStatus} · Last sync: ${lastSync}` : `Manage ${section.toLowerCase()} for this station.`}</p></div><div className="admin-header-actions"><Button variant="secondary" onClick={() => void syncRecords()} icon="refresh" loading={syncing}>{syncing ? 'Syncing…' : 'Sync now'}</Button><Button onClick={onStartGrading} icon="camera">Start grading</Button><div className="admin-avatar">AD</div></div></header>
    {section === 'Overview' && <><div className="admin-metrics"><article><span><Icon name="database" size={22} /></span><small>Sessions recorded</small><strong>{sessionCount}</strong><em>Synced on this station</em></article><article><span><Icon name="scale" size={22} /></span><small>Total fish weight</small><strong>{totalWeight.toFixed(1)} kg</strong><em>Across {records.length} samples</em></article><article><span><Icon name="spark" size={22} /></span><small>Grade A rate</small><strong>{gradeARate}%</strong><em>{records.filter(record => record.grade === 'A').length} Grade A samples</em></article><article><span><Icon name="users" size={22} /></span><small>Active graders</small><strong>{graders.length}</strong><em>All profiles available</em></article></div><div className="admin-overview-grid"><article className="admin-chart"><div className="admin-section-title"><div><h2>Weekly grading volume</h2><p>Completed samples during the last seven days</p></div><b>{records.length} total</b></div><AdminTrendGraph data={weeklyData}/></article><article className="admin-breakdown"><h2>Grade breakdown</h2><div className="grade-ring"><strong>{records.length}<small>samples</small></strong></div><div className="grade-legend"><span><i className="grade-a" />Grade A <b>{gradeARate}%</b></span><span><i className="grade-b" />Grade B <b>{records.length ? Math.round(records.filter(record => record.grade === 'B').length / records.length * 100) : 0}%</b></span><span><i className="grade-c" />Grade C <b>{records.length ? Math.round(records.filter(record => record.grade === 'C').length / records.length * 100) : 0}%</b></span></div></article></div><AdminRecords records={records.slice(0, 3)} compact onViewAll={() => setSection('Records')} /></>}
    {section === 'Records' && <><div className="admin-toolbar"><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search record, grader, sample, or grade…" /><Button variant="secondary" icon="printer" onClick={() => window.print()}>Export records</Button></div><AdminRecords records={visibleRecords} /></>}
    {section === 'Price schedule' && <div className="admin-page-card"><div className="admin-section-title"><div><h2>Approved buying prices</h2><p>Set the current rate per kilogram for each tuna grade.</p></div><span className="status-label status-label--valid">Active schedule</span></div><div className="price-editor">{(['A','B','C'] as Grade[]).map(grade => <label key={grade}><span>Grade {grade}<small>{grade === 'A' ? 'Premium quality' : grade === 'B' ? 'Standard quality' : 'Processing quality'}</small></span><div><b>₱</b><input inputMode="decimal" value={prices[grade]} onChange={event => setPrices({ ...prices, [grade]: event.target.value.replace(/[^0-9.]/g, '') })} /><small>per kg</small></div></label>)}</div><div className="admin-card-actions"><span>Saved locally first, then synchronized to Supabase.</span><Button onClick={() => void savePrices()} icon="check" loading={savingPrices}>{savingPrices ? 'Syncing prices…' : 'Save price schedule'}</Button></div></div>}
    {section === 'Expert graders' && <div className="admin-page-card"><div className="admin-section-title"><div><h2>Grader profiles</h2><p>Control who can start expert grading sessions.</p></div><b>{graders.length} active</b></div><div className="grader-admin-list">{graders.map((name,index) => <div key={name}><span className="admin-avatar">{name.split(' ').map(part => part[0]).slice(0,2).join('')}</span><span><strong>{name}</strong><small>{index === 0 ? 'Last active 8 minutes ago' : 'Available at this station'}</small></span><span className="status-label status-label--valid">Active</span><button aria-label={`Remove ${name}`} onClick={() => onNotice?.({ title: 'Remove grader?', message: `${name} will no longer be available for new grading sessions on this station.`, icon: 'users', cancelLabel: 'Keep grader', actionLabel: 'Remove', onAction: () => saveGraders(graders.filter(item => item !== name)) })}>Remove</button></div>)}</div><div className="admin-add-grader"><input value={newGrader} onChange={event => setNewGrader(event.target.value)} placeholder="Enter full name" /><Button icon="users" disabled={!newGrader.trim()} onClick={() => { const name = newGrader.trim(); if (name && !graders.includes(name)) saveGraders([...graders, name]); setNewGrader('') }}>Add grader</Button></div></div>}
    {section === 'Devices' && <AdminDevices rpiUrl={connections.rpiUrl} modelName={connections.modelName} audit={audit} onNotice={onNotice} />}
    {section === 'Audit logs' && <div className="admin-page-card"><div className="admin-section-title"><div><h2>Audit logs</h2><p>Navigation, grading, overrides, connections, sync, and administrator activity.</p></div><b>{auditEntries.length} events</b></div><div className="audit-list">{auditEntries.length ? auditEntries.slice(0, 12).map(entry => <article key={entry.id}><span><Icon name="shield" size={18} /></span><div><strong>{entry.action}</strong><small>{entry.actor} · {entry.detail}</small></div><time>{new Date(entry.timestamp).toLocaleString()}</time></article>) : <p>No audit events recorded yet.</p>}</div></div>}
    {section === 'Settings' && <div className="admin-page-card settings-form"><div><h2>Station and connection settings</h2><p>Configure the kiosk and local Raspberry Pi. Supabase credentials come only from deployment environment variables.</p></div><div className="connection-settings"><label>Station name<input value={stationName} onChange={event => setStationName(event.target.value)} /></label><label>Raspberry Pi API URL<input value={connections.rpiUrl} onChange={event => setConnections({ ...connections, rpiUrl: event.target.value })} /></label><label>AI model identifier<input value={connections.modelName} onChange={event => setConnections({ ...connections, modelName: event.target.value })} /></label><label>Supabase cloud<input value={isSupabaseConfigured() ? 'Configured from environment' : 'Not configured'} disabled /></label></div><div className="connection-status"><span className={`status-label ${rpiStatus === 'Connected' ? 'status-label--valid' : rpiStatus === 'Unavailable' ? 'status-label--invalid' : 'status-label--uncertain'}`}>Raspberry Pi: {rpiStatus}</span><span>Active model: <strong>{connections.modelName}</strong></span><Button variant="secondary" icon="refresh" onClick={testRpi} disabled={rpiStatus === 'Checking'}>{rpiStatus === 'Checking' ? 'Checking…' : 'Test RPi connection'}</Button></div><label>Maximum accepted weight<input value="200 kg" disabled /></label><label className="settings-toggle"><span><strong>Offline mode</strong><small>Keep the PWA available without internet</small></span><input type="checkbox" defaultChecked /></label><label className="settings-toggle"><span><strong>Automatic printing</strong><small>Open print dialog after each completed session</small></span><input type="checkbox" /></label><div className="admin-card-actions"><span>Use only a publishable/anon key in Vite. Never expose a service-role key.</span><Button icon="check" onClick={() => { localStorage.setItem('tunaeye-station', stationName); localStorage.setItem('tunaeye-rpi-url', connections.rpiUrl); localStorage.setItem('tunaeye-model-name', connections.modelName); audit('Admin', 'Settings updated', 'Station and local edge settings saved'); onNotice?.({ title: 'Settings Saved', message: 'Station identity and Raspberry Pi settings were saved.', icon: 'check' }) }}>Save settings</Button></div></div>}
  </section></div>
}
function AdminRecords({ records, compact = false, onViewAll }: { records: GradingRecord[]; compact?: boolean; onViewAll?: () => void }) {
  const [page, setPage] = useState(1)
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null)
  const selectedRecord = records.find(record => record.id === selectedRecordId)
  const pageSize = 8
  const totalPages = Math.max(1, Math.ceil(records.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const displayed = compact ? records.slice(0, 5) : records.slice((safePage - 1) * pageSize, safePage * pageSize)
  useEffect(() => setPage(1), [records.length])

  return (
    <div className={`admin-table-card ${compact ? 'admin-table-card--compact' : ''}`}>
      <div className="admin-section-title">
        <div>
          <h2>{compact ? 'Recent records' : 'Grading records'}</h2>
          <p>{records.length} session{records.length === 1 ? '' : 's'} total{!compact && records.length > pageSize && ` · Page ${safePage} of ${totalPages}`}</p>
        </div>
        {onViewAll && <button onClick={onViewAll}>View all <Icon name="arrow" size={17} /></button>}
      </div>
      <div className="admin-table">
        <div className="admin-table__head">
          <span>Record</span>
          <span>Grader</span>
          <span>Sample</span>
          <span>Weight</span>
          <span>Grade</span>
          <span>Status</span>
        </div>
        {displayed.map(record => (
          <div key={record.id} className="grader-record-item" role="button" tabIndex={0} onClick={() => setSelectedRecordId(record.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') setSelectedRecordId(record.id) }}>
            <span><strong>{record.id}</strong><small>{record.time}</small></span>
            <span>{record.grader}</span>
            <span className="record-sample-cell"><StoredEvidenceImage evidenceId={record.capturedImageId} legacySource={record.capturedImage} alt={`Captured ${record.sample}`} /><strong>{record.sample}</strong><small>{record.fish} · {record.result?.originalConfidence ? `${record.result.originalConfidence}% confidence` : 'Result saved'}</small><ImageSyncLabel record={record} /></span>
            <span>{record.weight}</span>
            <span className={`table-grade table-grade--${record.grade}`}>{record.grade}</span>
            <span className={`status-label ${record.status === 'Override' ? 'status-label--uncertain' : 'status-label--valid'}`}>{record.status}</span>
          </div>
        ))}
      </div>
      {!compact && (
        <div className="admin-pagination">
          <span>Showing {records.length ? (safePage - 1) * pageSize + 1 : 0}–{Math.min(safePage * pageSize, records.length)} of {records.length}</span>
          <div className="admin-pagination__controls">
            <button className="admin-pagination__btn" disabled={safePage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</button>
            <span>Page <strong>{safePage}</strong> of <strong>{totalPages}</strong></span>
            <button className="admin-pagination__btn" disabled={safePage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</button>
          </div>
        </div>
      )}
      {selectedRecord && <div className="record-review-backdrop" role="dialog" aria-modal="true" aria-label={`Record ${selectedRecord.id}`} onClick={() => setSelectedRecordId(null)}><article className="record-review" onClick={event => event.stopPropagation()}><header><div><span className="eyebrow">Captured tuna record</span><h2>{selectedRecord.id}</h2><p>{selectedRecord.time} · {selectedRecord.grader}</p></div><button className="icon-button" onClick={() => setSelectedRecordId(null)} aria-label="Close record">×</button></header>{selectedRecord.capturedImageId || selectedRecord.capturedImage ? <StoredEvidenceImage className="record-review__image" evidenceId={selectedRecord.capturedImageId} legacySource={selectedRecord.capturedImage} alt={`Captured ${selectedRecord.sample}`} /> : <div className="record-review__missing">Captured image unavailable for this older record.</div>}<ImageSyncLabel record={selectedRecord} /><div className="record-review__grade"><span>Final result</span><strong>Grade {selectedRecord.grade}</strong><small>{selectedRecord.result?.originalConfidence ?? '—'}% original confidence</small></div><dl><div><dt>Sample</dt><dd>{selectedRecord.sample}</dd></div><div><dt>Fish association</dt><dd>{selectedRecord.fish}</dd></div><div><dt>Weight</dt><dd>{selectedRecord.weight}</dd></div><div><dt>Fish value</dt><dd>{peso(selectedRecord.transaction?.amount)}</dd></div><div><dt>Model result</dt><dd>{selectedRecord.result?.originalGrade ? `Grade ${selectedRecord.result.originalGrade}` : selectedRecord.result?.status ?? selectedRecord.status}</dd></div><div><dt>Sync status</dt><dd>{selectedRecord.transaction?.syncState === 'synced' ? 'Synced' : selectedRecord.transaction?.syncState === 'syncing' ? 'Syncing' : selectedRecord.transaction?.syncState === 'failed' ? 'Sync needs retry' : 'Saved locally'}</dd></div></dl>{selectedRecord.result?.overrideReason && <p className="record-review__reason"><strong>Override reason:</strong> {selectedRecord.result.overrideReason}</p>}</article></div>}
    </div>
  )
}
function AdminDevices({ rpiUrl, modelName, audit, onNotice }: { rpiUrl: string; modelName: string; audit: (actor: string, action: string, detail: string) => void; onNotice?: (notice: NoticeModalData) => void }) {
  const [running, setRunning] = useState(false)
  const [cameraStatus, setCameraStatus] = useState<'Checking' | 'Operational' | 'Permission Required' | 'No Camera'>('Checking')
  const [cameraInfo, setCameraInfo] = useState('Detecting camera peripherals…')

  const [printerStatus, setPrinterStatus] = useState<'Ready' | 'Web Serial / Bluetooth Ready' | 'System Spooler Only'>('Ready')
  const [printerInfo, setPrinterInfo] = useState('Web Serial & Web Bluetooth thermal printing available')

  const [scaleStatus, setScaleStatus] = useState<'Ready' | 'Web Serial Scale Ready' | 'Manual Weight Active'>('Ready')
  const [scaleInfo, setScaleInfo] = useState('Web Serial RS232 / USB scale interface ready')

  const [rpiState, setRpiState] = useState<'Checking' | 'Connected' | 'Unreachable'>('Checking')
  const [rpiInfo, setRpiInfo] = useState(`Gateway endpoint: ${rpiUrl}`)

  const [storageInfo, setStorageInfo] = useState('Checking IndexedDB storage quota…')
  const [networkInfo, setNetworkInfo] = useState(navigator.onLine ? 'Network connected · Internet access not verified' : 'Station offline mode active')
  const testNetwork = async () => {
    setNetworkInfo('Checking internet…')
    setNetworkInfo(await checkCloudConnection() ? 'Internet available · Ready to sync' : 'Waiting for internet · Local grading is available')
  }

  const testCamera = async () => {
    setCameraStatus('Checking')
    try {
      await capturePiImage()
      setCameraStatus('Operational')
      setCameraInfo('Raspberry Pi USB camera snapshot verified')
      audit('Admin', 'Camera Diagnostic', 'Raspberry Pi USB camera verified')
    } catch {
      setCameraStatus('No Camera')
      setCameraInfo('Pi camera unavailable. Check TunaRpi, ustreamer, and USB camera.')
      audit('Admin', 'Camera Diagnostic', 'Raspberry Pi camera unavailable')
    }
  }

  const testRpi = async () => {
    setRpiState('Checking')
    const start = performance.now()
    try {
      const data = await checkPiHealth(rpiUrl)
      const latency = Math.round(performance.now() - start)
      setRpiState('Connected')
      const models = data.models ? Object.entries(data.models).filter(([, ready]) => ready).map(([name]) => name).join(' + ') : data.model
      setRpiInfo(`Connected (${latency} ms) · AI Model: ${models || modelName}`)
      audit('Admin', 'RPi Diagnostic', `Raspberry Pi reachable in ${latency}ms`)
    } catch {
      setRpiState('Unreachable')
      setRpiInfo(`Unable to connect to ${rpiUrl} (Station running in local offline browser mode)`)
      audit('Admin', 'RPi Diagnostic', `Raspberry Pi unreachable at ${rpiUrl}`)
    }
  }

  const testStorage = async () => {
    if (navigator.storage?.estimate) {
      try {
        const est = await navigator.storage.estimate()
        const usedMb = ((est.usage || 0) / (1024 * 1024)).toFixed(1)
        const totalMb = ((est.quota || 0) / (1024 * 1024)).toFixed(0)
        setStorageInfo(`${usedMb} MB used of ${totalMb} MB local offline quota`)
      } catch {
        setStorageInfo('Storage estimate unavailable')
      }
    } else {
      setStorageInfo('IndexedDB & Web Storage active')
    }
  }

  const pairPrinter = async () => {
    if ('serial' in navigator) {
      try {
        // @ts-expect-error Web Serial API
        const port = await navigator.serial.requestPort()
        setPrinterInfo(`Paired with Web Serial port: ${port.getInfo?.().usbVendorId || 'Thermal ESC/POS'}`)
        setPrinterStatus('Ready')
        audit('Admin', 'Printer Pair', 'Web Serial printer paired')
      } catch (err: unknown) {
        if ((err as Error).name !== 'NotFoundError') {
          setPrinterInfo('Print dialog (System Spooler) active')
        }
      }
    } else if ('bluetooth' in navigator) {
      try {
        // @ts-expect-error Web Bluetooth API
        const device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true })
        setPrinterInfo(`Paired with Bluetooth device: ${device.name || 'Thermal Printer'}`)
        setPrinterStatus('Ready')
        audit('Admin', 'Printer Pair', `Bluetooth printer paired: ${device.name}`)
      } catch {
        setPrinterInfo('Print dialog (System Spooler) active')
      }
    } else {
      window.print()
      setPrinterInfo('System browser print dialog is ready to select a paired printer')
      setPrinterStatus('Ready')
      audit('Admin', 'Printer Pair', 'System print dialog opened for paired printer selection')
    }
  }

  const pairScale = async () => {
    if ('serial' in navigator) {
      try {
        // @ts-expect-error Web Serial API
        const port = await navigator.serial.requestPort()
        setScaleInfo(`Connected to Web Serial Scale Port (${port.getInfo?.().usbVendorId || 'RS232'})`)
        setScaleStatus('Ready')
        audit('Admin', 'Scale Pair', 'Web Serial weighing scale connected')
      } catch {
        setScaleInfo('Manual weight entry supported as fallback')
      }
    } else {
      if (onNotice) {
        onNotice({ title: 'Digital Scale Notice', message: 'Web Serial scale integration is supported on Chrome/Edge on desktop.', items: ['Manual weight entry with direct touch numpad is active and ready.'], icon: 'scale' })
      } else {
        window.alert('Web Serial is supported on Chrome/Edge on desktop. Manual weight entry is active.')
      }
    }
  }

  const runAllDiagnostics = async () => {
    setRunning(true)
    await Promise.all([testCamera(), testRpi(), testStorage()])
    setNetworkInfo(navigator.onLine ? 'Network connected · Internet access not verified' : 'Station offline mode active')
    setRunning(false)
    audit('Admin', 'Full Diagnostics', 'Executed comprehensive empirical device health checks')
  }

  useEffect(() => {
    runAllDiagnostics()
  }, [])

  return (
    <div className="admin-page-card">
      <div className="admin-section-title">
        <div>
          <h2>Station Hardware Devices</h2>
          <p>Real hardware diagnostic checks for optical cameras, scale interfaces, thermal printers, and edge AI compute.</p>
        </div>
        <Button variant="secondary" icon="refresh" onClick={runAllDiagnostics} disabled={running}>
          {running ? 'Testing…' : 'Run device diagnostics'}
        </Button>
      </div>

      <div className="device-grid">
        <article>
          <Icon name="camera" size={24} />
          <span>
            <strong>Specimen Optics (Primary Camera)</strong>
            <small>{cameraInfo}</small>
          </span>
          <div className="device-actions">
            <b className={`status-label ${cameraStatus === 'Operational' ? 'status-label--valid' : 'status-label--invalid'}`}>
              {cameraStatus}
            </b>
            <button className="device-btn" onClick={testCamera}>Test stream</button>
          </div>
        </article>

        <article>
          <Icon name="printer" size={24} />
          <span>
            <strong>Thermal Receipt Printer</strong>
            <small>{printerInfo}</small>
          </span>
          <div className="device-actions">
            <b className="status-label status-label--valid">{printerStatus}</b>
            <button className="device-btn" onClick={pairPrinter}>Connect / Test</button>
          </div>
        </article>

        <article>
          <Icon name="scale" size={24} />
          <span>
            <strong>Digital Weighing Scale</strong>
            <small>{scaleInfo}</small>
          </span>
          <div className="device-actions">
            <b className="status-label status-label--valid">{scaleStatus}</b>
            <button className="device-btn" onClick={pairScale}>Connect / Test</button>
          </div>
        </article>

        <article>
          <Icon name="spark" size={24} />
          <span>
            <strong>Raspberry Pi AI Gateway</strong>
            <small>{rpiInfo}</small>
          </span>
          <div className="device-actions">
            <b className={`status-label ${rpiState === 'Connected' ? 'status-label--valid' : 'status-label--uncertain'}`}>
              {rpiState}
            </b>
            <button className="device-btn" onClick={testRpi}>Ping gateway</button>
          </div>
        </article>

        <article>
          <Icon name="database" size={24} />
          <span>
            <strong>Local Station Storage & Cache</strong>
            <small>{storageInfo}</small>
          </span>
          <div className="device-actions">
            <b className="status-label status-label--valid">Storage OK</b>
            <button className="device-btn" onClick={testStorage}>Refresh quota</button>
          </div>
        </article>

        <article>
          <Icon name="shield" size={24} />
          <span>
            <strong>Network & Offline Connectivity</strong>
            <small>{networkInfo}</small>
          </span>
          <div className="device-actions">
            <b className={`status-label ${navigator.onLine ? 'status-label--valid' : 'status-label--uncertain'}`}>
              {navigator.onLine ? 'Connected' : 'Offline'}
            </b>
            <button className="device-btn" onClick={() => void testNetwork()}>Check network</button>
          </div>
        </article>
      </div>

      <div className="admin-card-actions">
        <span>Devices are monitored in real time using browser Web APIs & Gateway REST interfaces.</span>
      </div>
    </div>
  )
}

function GraderDashboard({ name, onStart, onLogout, onNotice }: { name: string; onStart: () => void; onLogout: () => void; onNotice: (notice: NoticeModalData) => void }) {
  const graderName = (name && name.trim()) || localStorage.getItem('tunaeye-grader-name') || 'Maria Santos'
  const getRelevantRecords = () => {
    const all = loadRecords()
    const filtered = all.filter(record => record.grader.toLowerCase() === graderName.toLowerCase())
    return filtered.length > 0 ? filtered : all
  }
  const [records, setRecords] = useState(getRelevantRecords)
  const [lastSync, setLastSync] = useState(() => localStorage.getItem('tunaeye-last-sync') ?? 'Just now')
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    const refresh = () => {
      setRecords(getRelevantRecords())
    }
    refresh()
    window.addEventListener('storage', refresh)
    window.addEventListener('tunaeye-records-updated', refresh)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('tunaeye-records-updated', refresh)
    }
  }, [graderName])

  const today = new Date().toDateString()
  const todayRecords = records.filter(record => new Date(record.timestamp).toDateString() === today)
  const sessions = new Set(todayRecords.map(record => record.sessionId)).size
  const recentSessions = new Set(records.filter(record => Date.now() - record.timestamp <= 30 * 60 * 1000).map(record => record.sessionId)).size
  const sync = async () => {
    if (syncing) return
    setSyncing(true)
    try {
      const summary = await syncPendingRecords()
      setRecords(getRelevantRecords())
      if (summary.synced) {
        const syncedAt = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
        setLastSync(syncedAt)
        localStorage.setItem('tunaeye-last-sync', syncedAt)
      }
      audit(graderName, 'Manual sync', `${summary.synced} records synchronized; ${summary.failed} failed`)
      onNotice({ title: summary.waiting ? 'Waiting for internet' : summary.failed ? `${graderName}'s sync needs attention` : `${graderName}'s records are synced`, message: `${summary.synced} new record${summary.synced === 1 ? '' : 's'} synchronized. ${summary.waiting ? `${summary.waiting} waiting for internet. ` : ''}${summary.failed} remain available for retry.${summary.firstError ? ` ${summary.firstError}` : ''}`, icon: 'refresh' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Synchronization failed.'
      audit(graderName, 'Manual sync failed', message)
      onNotice({ title: error instanceof CloudUnavailableError ? 'Waiting for internet' : 'Sync unavailable', message, icon: 'help' })
    } finally { setSyncing(false) }
  }
  return (
    <div className="screen-stack grader-dashboard">
      <div className="grader-bento grader-bento-v2">
        {/* LEFT: Hello card + 4 action buttons */}
        <div className="grader-bento-v2__left">
          <div className="grader-bento__hello-card">
            <div className="grader-hello__header">
              <h1>Welcome back, {graderName.split(' ')[0]}.</h1>
            </div>
            <div className="grader-hello__actions">
              <Button className="btn--hero" onClick={onStart} icon="arrow">Start grading</Button>
              <div className="grader-hello__subactions">
                <Button variant="secondary" onClick={() => void sync()} icon="refresh" loading={syncing}>{syncing ? `Syncing ${graderName.split(' ')[0]}…` : 'Sync now'}</Button>
                <Button variant="ghost" onClick={() => { audit(graderName, 'Logout', 'Grader ended session'); onLogout() }} icon="back">Logout</Button>
              </div>
            </div>
          </div>
          <div className="grader-bento__info-grid">
            <article className="grader-info-card">
              <span className="grader-info-card__icon"><Icon name="database" size={22} /></span>
              <div className="grader-info-card__body">
                <small>Sessions today</small>
                <strong>{sessions}</strong>
                <em>Completed grading runs</em>
              </div>
            </article>
            <article className="grader-info-card">
              <span className="grader-info-card__icon"><Icon name="spark" size={22} /></span>
              <div className="grader-info-card__body">
                <small>Samples graded</small>
                <strong>{todayRecords.length}</strong>
                <em>Visible to admin</em>
              </div>
            </article>
            <article className="grader-info-card">
              <span className="grader-info-card__icon"><Icon name="shield" size={22} /></span>
              <div className="grader-info-card__body">
                <small>Station status</small>
                <strong>Online</strong>
                <em>Local edge processing</em>
              </div>
            </article>
            <article className="grader-info-card">
              <span className="grader-info-card__icon"><Icon name="tutorial" size={22} /></span>
              <div className="grader-info-card__body">
                <small>Tutorial status</small>
                <strong>{recentSessions >= 2 ? 'Ready' : `${Math.max(0, 2 - recentSessions)} left`}</strong>
                <em>Sync: {lastSync}</em>
              </div>
            </article>
          </div>
        </div>

        {/* RIGHT: Records */}
        <div className="grader-bento-v2__right">
          {records.length
            ? <AdminRecords records={records.slice(0, 8)} compact />
            : <div className="grader-dashboard__empty"><Icon name="database" size={34} /><h2>No grading records yet</h2><p>Start a grading session to create your first synced record.</p></div>
          }
        </div>
      </div>
      <BottomBar onBack={onLogout} />
    </div>
  )
}
function GraderEntryScreen({ name, remember, onName, onRemember, onContinue, onBack, onLegal }: { name: string; remember: boolean; onName: (value: string) => void; onRemember: (value: boolean) => void; onContinue: () => void; onBack: () => void; onLegal: (kind: 'terms' | 'privacy') => void }) {
  return (
    <div className="screen-stack screen-stack--grader">
      <div className="grader-entry">
        <div className="grader-entry__copy">
          <BrandMark />
          <h1>Who is grading today?</h1>
        </div>
        <div className="grader-entry__form">
          <label className="field-label">
            Your name
            <input
              autoFocus
              value={name}
              onChange={event => {
                const val = event.target.value;
                onName(val);
                localStorage.setItem('tunaeye-grader-name', val);
              }}
              placeholder="Enter your full name"
            />
          </label>
          <label className="remember-row">
            <input type="checkbox" checked={remember} onChange={event => onRemember(event.target.checked)} />
            <span>Remember my name</span>
          </label>
          <div className="legal-links">
            <button onClick={() => onLegal('terms')}>Terms and Conditions</button>
            <span>·</span>
            <button onClick={() => onLegal('privacy')}>Privacy Policy</button>
          </div>
        </div>
      </div>
      <BottomBar onBack={onBack} primary={onContinue} primaryLabel="Start grading" primaryIcon="camera" primaryDisabled={!name.trim()} />
    </div>
  )
}

const sampleOptions: { label: string; sample: SampleType; copy: string }[] = [{ label: 'Sashibo core', sample: 'Sashibo core', copy: 'Center sashibo evidence' }, { label: 'Tail cut', sample: 'Tail cut', copy: 'Tail-cut evidence' }]
function SampleScreen({ selected, onSelect, onContinue, onBack }: { selected: SampleType[]; onSelect: (samples: SampleType[]) => void; onContinue: () => void; onBack: () => void }) { const toggle = (sample: SampleType) => onSelect(selected.includes(sample) ? selected.filter(item => item !== sample) : sampleOrder.filter(item => [...selected, sample].includes(item))); return <div className="screen-stack screen-stack--sample-selector"><div className="section-heading"><h1>What are you grading?</h1></div><div className="sample-options sample-options--two">{sampleOptions.map(option => { const active = selected.includes(option.sample); return <button key={option.label} className={`sample-card selector-card ${active ? 'is-selected' : ''}`} onClick={() => toggle(option.sample)}><div className="selector-card__art"><SampleArt sample={option.sample} className={option.sample === 'Sashibo core' ? 'sample-art--core' : 'sample-art--tail'} /></div><span className="sample-card__label"><strong>{option.label}</strong></span><span className="sample-card__check">{active && <Icon name="check" size={18} />}</span></button> })}</div><BottomBar onBack={onBack} primary={onContinue} primaryLabel="Continue" primaryDisabled={!selected.length} /></div> }
function AssociationScreen({ samples, sameFish, onSameFish, onContinue, onBack }: { samples: SampleType[]; sameFish: 'same' | 'different' | null; onSameFish: (value: 'same' | 'different') => void; onContinue: () => void; onBack: () => void }) { const single = samples.length === 1; return <div className="screen-stack screen-stack--association"><div className="association-copy"><h1>{single ? 'One sample, one fish.' : 'Same fish?'}</h1></div>{single ? <div className="single-fish-card"><span className="single-fish-card__icon"><Icon name="check" size={30} /></span><div><strong>One fish · one sample</strong><small>{samples[0]} · Fish 1</small></div></div> : <div className="association-options"><button className={sameFish === 'same' ? 'is-selected' : ''} onClick={() => onSameFish('same')}><span><Icon name="users" size={30} /></span><strong>Yes, same fish</strong><small>Associate both samples with Fish 1</small>{sameFish === 'same' && <Icon name="check" size={20} />}</button><button className={sameFish === 'different' ? 'is-selected' : ''} onClick={() => onSameFish('different')}><span><Icon name="database" size={30} /></span><strong>No, different fish</strong><small>Keep Fish 1 and Fish 2 independent</small>{sameFish === 'different' && <Icon name="check" size={20} />}</button></div>}<BottomBar onBack={onBack} primary={onContinue} primaryLabel="Continue" primaryDisabled={!single && !sameFish} /></div> }
function TutorialScreen({ samples, step, onStep, onContinue, onBack }: { samples: SampleType[]; step: number; onStep: (step: number) => void; onContinue: () => void; onBack: () => void }) { const items = [{ title: 'Pull out the tray', copy: 'Use the chamber handle and make sure the surface is clean.', image: '/assets/step 1.png' }, { title: 'Place each sample flat', copy: 'Center the selected sample inside the blue guide.', image: '/assets/step 2.png' }, { title: 'Push in and capture', copy: 'TunaEye saves each selected sample separately.', image: '/assets/step 3.png' }]; const current = items[step]; return <div className="screen-stack screen-stack--tutorial"><div className="tutorial-heading"><span className="tutorial-stage__number" aria-hidden="true">{String(step + 1).padStart(2, '0')}</span><span className="eyebrow">Guided tutorial</span><h1>{current.title}</h1><p>{current.copy}</p><div className="tutorial-sample-chips">{samples.map(sample => <span key={sample}>{sample}</span>)}</div></div><div className="tutorial-stage"><img className="tutorial-stage__image" src={current.image} alt={current.title} /><div className="tutorial-stage__callout"><Icon name="spark" size={20} /><span>{current.copy}</span></div></div><div className="tutorial-dots">{items.map((item, index) => <button key={item.title} className={step === index ? 'is-active' : ''} onClick={() => onStep(index)} aria-label={`Tutorial step ${index + 1}`} />)}</div><BottomBar onBack={onBack} primary={onContinue} primaryLabel={step < 2 ? 'Next' : 'Enter weight'} primaryIcon={step < 2 ? 'arrow' : 'scale'} /></div> }
function WeightScreen({ selected, sameFish, weights, onWeight, onContinue, onBack }: { selected: SampleType[]; sameFish: 'same' | 'different' | null; weights: Record<string, string>; onWeight: (fishId: string, value: string) => void; onContinue: () => void; onBack: () => void }) {
  const fishIds = Array.from(new Set(selected.map(sample => fishIdForSample({ sameFish } as never, sample))))
  const [activeFishId, setActiveFishId] = useState(fishIds[0] ?? 'Fish 1')
  const overweight = fishIds.some(id => Number(weights[id]) > 200)
  const underweight = fishIds.some(id => Boolean(weights[id]) && Number(weights[id]) < 15)
  const valid = fishIds.every(id => Number(weights[id]) >= 15 && Number(weights[id]) <= 200)

  const handleNumpadPress = (val: string) => {
    const current = weights[activeFishId] ?? ''
    if (val === '⌫') {
      onWeight(activeFishId, current.slice(0, -1))
    } else if (val === '.') {
      if (!current.includes('.')) {
        onWeight(activeFishId, current ? `${current}.` : '0.')
      }
    } else {
      if (current.length < 6) {
        onWeight(activeFishId, current === '0' ? val : `${current}${val}`)
      }
    }
  }

  const handleClear = () => {
    onWeight(activeFishId, '')
  }

  return (
    <div className="screen-stack screen-stack--weight">
      <div className="weight-split">
        {/* LEFT: step label + fish info */}
        <div className="weight-split__info">
          <WorkflowStrip step="weight" />
          <h1>Fish weight{fishIds.length > 1 ? 's' : ''}</h1>
          <p className="step-callout"><strong>Step 1 · Weigh this fish.</strong><span>Sashibo core is next. A tail cut is requested only if that grade is under {ACCEPT_CONFIDENCE}%.</span></p>
          <div className="weight-entry weight-entry--multi" style={{ flex: "1 1 auto", minHeight: 0 }}>
            {fishIds.map(id => (
              <div
                key={id}
                className={`weight-row ${activeFishId === id ? 'is-active-fish' : ''}`}
                onClick={() => setActiveFishId(id)}
              >
                <span>
                  <strong>{id}</strong>
                  <small>{selected.filter(sample => fishIdForSample({ sameFish } as never, sample) === id).join(' + ')}</small>
                </span>
              </div>
            ))}
          </div>
          <span className={`input-status ${valid ? 'is-valid' : overweight || underweight ? 'is-error' : ''}`} role={overweight || underweight ? 'alert' : undefined}>
            {valid ? <><Icon name="check" size={16} />Ready to start capture</> : overweight ? 'Maximum fish weight is 200 kg.' : underweight ? 'Minimum fish weight is 15 kg.' : 'Enter 15–200 kg'}
          </span>
        </div>

        {/* RIGHT: weight input display + numpad */}
        <div className="weight-split__input">
          <div className="weight-display-row">
            {fishIds.map(id => (
              <div
                key={id}
                className={`weight-input weight-input-display ${activeFishId === id ? 'is-active' : ''} ${weights[id] && (Number(weights[id]) < 15 || Number(weights[id]) > 200) ? 'is-error' : ''}`}
                onClick={() => setActiveFishId(id)}
              >
                <input
                  inputMode="decimal"
                  value={weights[id] ?? ''}
                  aria-invalid={Boolean(weights[id]) && (Number(weights[id]) < 15 || Number(weights[id]) > 200)}
                  aria-describedby={Boolean(weights[id]) && (Number(weights[id]) < 15 || Number(weights[id]) > 200) ? 'weight-limit-error' : undefined}
                  onFocus={() => setActiveFishId(id)}
                  onChange={event => onWeight(id, event.target.value.replace(/[^0-9.]/g, '').replace(/^0+(?=\d)/, '').slice(0, 6))}
                  placeholder="0.0"
                  readOnly
                  style={{ width: `${Math.max(3, (weights[id] ?? '').length)}ch` }}
                />
                <b>kg</b>
              </div>
            ))}
          </div>
          {(overweight || underweight) && <div id="weight-limit-error" className="weight-limit-dialog" role="alert"><Icon name="help" size={20} /><span><strong>Enter 15–200 kg</strong><small>{overweight ? 'The maximum is 200 kg per fish.' : 'The minimum is 15 kg per fish.'}</small></span></div>}
          <div className="numpad-container">
            <div className="numpad-grid">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'].map(key => (
                <button
                  key={key}
                  type="button"
                  className={`numpad-btn ${key === '⌫' ? 'numpad-btn--delete' : ''}`}
                  onClick={() => handleNumpadPress(key)}
                >
                  {key}
                </button>
              ))}
            </div>
            <button type="button" className="numpad-clear-btn" onClick={handleClear}>Clear</button>
          </div>
        </div>
      </div>
      <BottomBar onBack={onBack} primary={onContinue} primaryLabel="Start capture" primaryIcon="camera" primaryDisabled={!valid} />
    </div>
  )
}
function CameraScreen({ sample, index, total, onCapture, onBack, onHelp }: { sample: SampleType; index: number; total: number; onCapture: (blob: Blob, previewUrl: string) => Promise<void>; onBack: () => void; onHelp?: () => void }) {
  const uploadRef = useRef<HTMLInputElement>(null)
  const piSettings = getPiSettings()
  const demoPreview = isDemoMode() ? getDemoPreviewUrl(sample, index) : null
  const [cameraError, setCameraError] = useState(() => !demoPreview && !piSettings.configured ? PI_CONNECTION_GUIDANCE : '')
  const [streamKey, setStreamKey] = useState(0)
  const [busy, setBusy] = useState<'capture' | 'upload' | null>(null)
  const streamUrl = piSettings.configured ? `${piSettings.streamUrl}?reconnect=${streamKey}` : undefined
  const capture = async () => {
    if (busy) return
    setBusy('capture')
    setCameraError('')
    try {
      const blob = await capturePiImage(sample, index)
      await onCapture(blob, URL.createObjectURL(blob))
    }
    catch (error) {
      console.error('[TunaEye] Snapshot capture failed:', error)
      setCameraError(error instanceof PiIntegrationError ? error.message : 'Snapshot failed. Try again or check the camera settings.')
    }
    finally { setBusy(null) }
  }
  const upload = async (file?: File) => {
    if (!file || busy) return
    const demoGrade = isDemoMode() ? parseDemoGradeFromFilename(file.name) : null
    if (demoGrade) setDemoGradeHint(sample, demoGrade)
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setCameraError('Choose a JPEG, PNG, or WebP image.'); return }
    if (file.size === 0) { setCameraError('The selected image is empty. Choose another file.'); return }
    if (file.size > 10 * 1024 * 1024) { setCameraError('Choose an image smaller than 10 MB.'); return }
    setBusy('upload')
    try {
      const bitmap = await createImageBitmap(file)
      bitmap.close()
      setCameraError('')
      await onCapture(file, URL.createObjectURL(file))
    } catch (error) { console.error('[TunaEye] Uploaded image validation failed:', error); setCameraError('TunaEye could not read this image. Choose another file.') }
    finally { setBusy(null); if (uploadRef.current) uploadRef.current.value = '' }
  }
  return <div className="screen-stack screen-stack--camera"><div className="camera-layout"><div className="live-camera live-camera--demo"><img src={demoPreview ?? streamUrl} crossOrigin={piSettings.mode === 'hosted-gateway' ? 'use-credentials' : undefined} alt={demoPreview ? 'Specimen preview' : 'Live Raspberry Pi USB camera preview'} onLoad={() => setCameraError('')} onError={() => { if (!demoPreview) setCameraError(piSettings.mode === 'hosted-gateway' ? 'Secure TunaEye gateway stream unavailable. Check gateway sign-in and CORS.' : 'Raspberry Pi camera stream is unavailable.') }} /><div className="target-corners"><i /><i /><i /><i /></div>{cameraError && <div className="camera-error" role="alert"><Icon name="camera" size={28} /><span>{cameraError}</span>{piSettings.configured && <Button variant="secondary" icon="refresh" onClick={() => { setCameraError(''); setStreamKey(key => key + 1) }}>Reconnect</Button>}</div>}</div><aside className="camera-aside"><span className="eyebrow">{sample === 'Tail cut' ? 'Supplementary sample' : `Main sample · ${index + 1} of ${total}`}</span><div className="sample-context"><SampleArt sample={sample} /><span><strong>{sample}</strong><small>Raspberry Pi USB camera</small></span></div><h1>Align the sample in the guide.</h1><p>{sample === 'Tail cut' ? `Sashibo core was under ${ACCEPT_CONFIDENCE}%. This tail cut decides whether the grade can be finished.` : 'Capture grades this image immediately. No extra confirm step.'}</p><input ref={uploadRef} className="camera-upload-input" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Upload specimen image" onChange={event => void upload(event.target.files?.[0])} disabled={Boolean(busy)} />{busy === 'upload' ? <small className="camera-upload-note camera-upload-note--busy" role="status"><Spinner />Saving image…</small> : <small className="camera-upload-note" role="status">JPEG, PNG, or WebP · up to 10 MB</small>}</aside></div><BottomBar onBack={onBack} onHelp={onHelp} secondaryLabel={busy === 'upload' ? 'Uploading…' : 'Upload image'} secondaryLoading={busy === 'upload'} secondaryDisabled={Boolean(busy)} onSecondary={() => uploadRef.current?.click()} primary={() => void capture()} primaryLabel={busy === 'capture' ? 'Capturing…' : 'Capture'} primaryIcon="camera" primaryLoading={busy === 'capture'} primaryDisabled={Boolean(busy) || (!demoPreview && !piSettings.configured)} /></div>
}
function ReviewScreen({ sample, outcome, onRetake, onUse, onBack }: { sample: SampleType; outcome: DemoOutcome; onRetake: () => void; onUse: () => void; onBack: () => void }) { const valid = outcome === 'valid'; return <div className="screen-stack screen-stack--review"><div className="review-layout"><EvidenceFrame sample={sample} mode="sample" frozen /><aside className="review-aside"><span className={`review-badge review-badge--${outcome}`}>{valid ? <Icon name="check" size={17} /> : <Icon name="help" size={17} />}{valid ? 'Image saved' : outcome === 'uncertain' ? 'Check the image' : 'Retake recommended'}</span><h1>{valid ? 'Use this image?' : 'Let’s check the image.'}</h1>{!valid && <p>{outcome === 'uncertain' ? 'Review before continuing.' : 'Needs a clearer view inside the guide.'}</p>}<div className="review-actions"><Button variant="secondary" onClick={onRetake} icon="refresh">Retake</Button><Button onClick={onUse} icon="arrow">Use Image</Button></div></aside></div><BottomBar onBack={onBack} /></div> }
function AnalysisScreen({ sample }: { sample: SampleType }) {
  return (
    <div className="analysis-screen analysis-screen--split">
      {/* LEFT: captured image */}
      <div className="analysis-screen__visual">
        <EvidenceFrame sample={sample} mode="sample" frozen />
        <div className="analysis-pulse"><span /><span /><span /></div>
      </div>
      {/* RIGHT: text + status */}
      <div className="analysis-screen__info">
        <span className="eyebrow">Raspberry Pi edge inference</span>
        <h1>Reading {sample.toLowerCase()}</h1>
        <p>{sample === 'Tail cut' ? 'Checking the supplementary tail cut. At 80% or above, it is blended with the sashibo core.' : 'Checking the sashibo core. At 80% or above, this grade is final and printing is next.'}</p>
        <StepRail active={1} />
        <div className="analysis-status"><span className="spinner" />Waiting for inference result</div>
      </div>
    </div>
  )
}
function effectiveGrade(result: SampleResult | undefined): Grade | null { return result?.overrideGrade ?? result?.originalGrade ?? null }
function ResultImage({ sample }: { sample: SampleType }) { return <img className="result-sample-image" src={capturedEvidence[sample] ?? (sample === 'Sashibo core' ? '/assets/sashiboCoreFull.png' : '/assets/tailCutFull.png')} alt={`Captured ${sample}`} /> }
function IndividualResultScreen({ decision, results, sample, weight, onPrint, onTail, onRetake, onOverride, onBack }: { decision: FinalDecision; results: Partial<Record<SampleType, SampleResult>>; sample: SampleType; weight: string; onPrint: () => void; onTail: () => void; onRetake: () => void; onOverride: () => void; onBack: () => void }) {
  const grade = decision.grade
  const pricing = priceSnapshot(grade ?? 'Invalid', weight)
  const heading = (decision.source === 'sashibo' || decision.source === 'expert') && grade ? `${sample} · Grade ${grade}` : decision.source === 'combined' && grade ? `Final grade ${grade}` : decision.title
  const primary = decision.next === 'print'
    ? { label: 'Print receipt', icon: 'printer' as const, action: onPrint }
    : decision.next === 'tail'
      ? { label: 'Capture tail cut', icon: 'camera' as const, action: onTail }
      : decision.next === 'override'
        ? { label: 'Set final grade', icon: 'shield' as const, action: onOverride }
        : { label: 'Retake image', icon: 'refresh' as const, action: onRetake }
  const sashibo = results['Sashibo core']
  const tail = results['Tail cut']
  return (
    <div className="screen-stack screen-stack--result">
      <div className={`decision-layout decision-layout--${decision.source}`}>
        <div className="decision-copy">
          <WorkflowStrip step={decision.next === 'print' ? 'print' : decision.next === 'tail' ? 'tail' : 'sashibo'} />
          <span className="eyebrow">{decision.source === 'expert' ? 'Expert grade' : decision.source === 'combined' ? 'Blended result' : decision.source === 'sashibo' ? 'Sashibo core accepted' : 'Next step'}</span>
          {grade && <div className={`grade-letter grade-letter--${grade}`}>{grade}</div>}
          <h1>{heading}</h1>
          <p className="decision-detail">{decision.detail}</p>
          <p className="decision-next">{decision.next === 'print' ? 'Next: print one receipt for this fish.' : decision.next === 'tail' ? 'Next: capture a tail-cut sample.' : decision.next === 'override' ? 'Next: an expert sets the final grade.' : 'Next: retake this photo.'}</p>
          <div className="decision-meters">
            {sashibo && <div className={`confidence ${isAccepted(sashibo.originalConfidence) ? 'confidence--accepted' : 'confidence--low'}`}><div className="confidence__label"><span>Sashibo core</span><strong>{sashibo.originalConfidence ?? '—'}%</strong></div><div className="confidence__track"><span style={{ width: `${Math.min(sashibo.originalConfidence ?? 0, 100)}%` }} /></div></div>}
            {tail && <div className={`confidence ${isAccepted(tail.originalConfidence) ? 'confidence--accepted' : 'confidence--low'}`}><div className="confidence__label"><span>Tail cut</span><strong>{tail.originalConfidence ?? '—'}%</strong></div><div className="confidence__track"><span style={{ width: `${Math.min(tail.originalConfidence ?? 0, 100)}%` }} /></div></div>}
          </div>
          {grade && <div className="result-price-summary"><span>Fish value</span><strong>{peso(pricing.amount)}</strong><small>{weight || '—'} kg · {peso(pricing.unitRatePerKg)}/kg</small></div>}
        </div>
        <div className="decision-side">
          <ResultImage sample="Sashibo core" />
          {tail && <ResultImage sample="Tail cut" />}
          <div className="result-badges"><span>{sashibo?.fishId ?? 'Fish 1'}</span><span>{weight || '—'} kg</span>{decision.source === 'expert' && <span className="override-badge">Expert reviewed</span>}</div>
          {decision.next === 'print' && <Button variant="secondary" onClick={onOverride} icon="settings">Manual override</Button>}
          {decision.next !== 'retake' && <Button variant="ghost" onClick={onRetake} icon="refresh">Retake {sample.toLowerCase()}</Button>}
        </div>
      </div>
      <BottomBar onBack={onBack} primary={primary.action} primaryLabel={primary.label} primaryIcon={primary.icon} />
    </div>
  )
}
function OverviewScreen({ selected, results, sameFish, onOverride, onPrint, onBack }: { selected: SampleType[]; results: Partial<Record<SampleType, SampleResult>>; sameFish: 'same' | 'different' | null; onOverride: (sample: SampleType) => void; onPrint: () => void; onBack: () => void }) { const complete = selected.every(sample => results[sample]); const validResults = selected.map(sample => results[sample]).filter((result): result is SampleResult => Boolean(result?.originalConfidence)); const combinedConfidence = validResults.length > 1 ? Math.round(validResults.reduce((sum, result) => sum + (result.originalConfidence ?? 0), 0) / validResults.length) : null; return <div className="screen-stack screen-stack--overview"><div className="section-heading"><h1>Review samples</h1></div><div className="overview-cards">{selected.map(sample => { const result = results[sample]; const grade = effectiveGrade(result); const pricing = priceSnapshot(grade ?? 'Invalid', result?.weight ?? 0); return <div className="overview-card" key={sample}><div className="overview-card__head"><ResultImage sample={sample} /><div><span className="eyebrow">{result?.fishId ?? 'Pending fish'}</span><h2>{sample}</h2><span className={`status-label status-label--${result?.status ?? 'invalid'}`}>{result?.status === 'valid' ? `Grade ${grade}` : result?.status === 'uncertain' ? 'Uncertain' : 'Not graded'}</span></div></div><div className="overview-card__stats"><span><small>Confidence</small><strong>{result?.originalConfidence ? `${result.originalConfidence}%` : '—'}</strong></span><span><small>Weight</small><strong>{result ? `${result.weight} kg` : '—'}</strong></span><span><small>Price</small><strong>{result?.status === 'valid' ? peso(pricing.amount) : '—'}</strong></span></div><Button variant="ghost" onClick={() => onOverride(sample)} icon="settings">Manual override</Button></div> })}</div>{selected.length > 1 && <div className={`combined-panel combined-panel--${sameFish === 'same' ? 'same' : 'different'}`}><span className="combined-panel__icon"><Icon name={sameFish === 'same' ? 'users' : 'database'} size={24} /></span><div><h2>{sameFish === 'same' ? 'Same fish' : 'Two separate fish'}</h2><p>{sameFish === 'same' ? `Average confidence ${combinedConfidence ?? '—'}%` : 'Each sample graded independently.'}</p></div></div>}<BottomBar onBack={onBack} primary={onPrint} primaryLabel={complete ? 'Print separate copies' : 'Finish remaining samples'} primaryIcon={complete ? 'printer' : 'arrow'} primaryDisabled={!complete} /></div> }
function OverrideModal({ sample, result, onSave, onClose }: { sample: SampleType; result?: SampleResult; onSave: (grade: Grade, reason: string) => void; onClose: () => void }) {
  const [grade, setGrade] = useState<Grade>(result?.overrideGrade ?? result?.originalGrade ?? 'A')
  const [reason, setReason] = useState(result?.overrideReason ?? '')
  const [pin, setPin] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [error, setError] = useState('')
  const cells = useRef<Array<HTMLInputElement | null>>([])

  const setDigit = (index: number, digit: string) => {
    const next = pin.padEnd(4, ' ').split('')
    next[index] = digit.slice(-1)
    const joined = next.join('').replace(/\s/g, '').slice(0, 4)
    setPin(joined)
    setError('')
    if (digit && index < 3) cells.current[index + 1]?.focus()
  }

  const handleNumpadPress = (digit: string) => {
    if (digit === '⌫') {
      const next = pin.slice(0, -1)
      setPin(next)
      setError('')
      if (next.length < 4) cells.current[next.length]?.focus()
    } else if (pin.length < 4) {
      const next = pin + digit
      setPin(next)
      setError('')
      if (next.length < 4) cells.current[next.length]?.focus()
    }
  }

  const unlock = () => {
    if (pin === ADMIN_PIN) {
      setUnlocked(true)
      setError('')
    } else {
      setError('Incorrect station PIN.')
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Manual override">
      <div className="modal-card override-modal">
        <div className="modal-card__header">
          <div>
            <span className="eyebrow">Protected expert decision</span>
            <h2>Manual override · {sample}</h2>
          </div>
          <button className="icon-button" aria-label="Close manual override" onClick={onClose}>×</button>
        </div>

        {!unlocked ? (
          <div className="override-lock otp-screen">
            <p>Enter the 4-digit admin PIN to change the model result.</p>
            <div className="otp-inputs" onPaste={event => { event.preventDefault(); const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4); setPin(pasted); cells.current[Math.min(3, pasted.length)]?.focus() }}>
              {[0, 1, 2, 3].map(index => (
                <input
                  key={index}
                  ref={node => { cells.current[index] = node }}
                  autoFocus={index === 0}
                  inputMode="numeric"
                  type="password"
                  value={pin[index] ?? ''}
                  maxLength={1}
                  aria-label={`PIN digit ${index + 1}`}
                  onChange={event => setDigit(index, event.target.value.replace(/\D/g, ''))}
                  onKeyDown={event => {
                    if (event.key === 'Backspace' && !pin[index] && index > 0) {
                      const next = pin.slice(0, index - 1) + pin.slice(index)
                      setPin(next)
                      cells.current[index - 1]?.focus()
                    }
                    if (event.key === 'Enter' && pin.length === 4) unlock()
                  }}
                />
              ))}
            </div>
            {error ? <span className="error-text"><Icon name="help" size={16} />{error}</span> : <span className="form-hint"><Icon name="shield" size={16} />Station PIN required (Default: 1234)</span>}
            <div className="override-pin-numpad">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map(k => (
                <button
                  key={k}
                  type="button"
                  className="pin-key-btn"
                  onClick={() => {
                    if (k === 'C') setPin('');
                    else handleNumpadPress(k);
                  }}
                >
                  {k}
                </button>
              ))}
            </div>
            <div className="override-modal__actions">
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button onClick={unlock} icon="lock" disabled={pin.length < 4}>Unlock override</Button>
            </div>
          </div>
        ) : (
          <>
            <p>Original model prediction: <strong>Grade {result?.originalGrade ?? '—'} · {result?.originalConfidence ?? '—'}% confidence</strong></p>
            <span className="field-label">Select the final grade</span>
            <div className="override-grades">
              {(['A', 'B', 'C'] as Grade[]).map(item => (
                <button key={item} className={grade === item ? 'is-selected' : ''} onClick={() => setGrade(item)}>Grade {item}</button>
              ))}
            </div>
            <label className="field-label">Reason <textarea value={reason} onChange={event => setReason(event.target.value)} placeholder="Optional note for the record" rows={3} /></label>
            <div className="override-modal__actions">
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button onClick={() => onSave(grade, reason)} icon="check">Save override</Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
function PrintScreen({ samples, results, decision, printed, printing, onPrint, onSkip, onBack, graderName }: { samples: SampleType[]; results: Partial<Record<SampleType, SampleResult>>; decision: FinalDecision; printed: SampleType[]; printing: boolean; onPrint: () => void; onSkip: () => void; onBack: () => void; graderName?: string }) {
  const printIndex = 0
  const sample = samples[0] ?? 'Sashibo core'
  const result = results[sample]
  const grade = decision.grade ?? effectiveGrade(result)
  const isCompleted = printed.length > 0
  const pricing = priceSnapshot(grade ?? 'Invalid', result?.weight ?? 0)

  return (
    <div className="screen-stack screen-stack--print">
      <div className="print-layout">
        <div className="print-copy">
          <WorkflowStrip step="print" />
          <span className="eyebrow">One receipt for this fish</span>
          <h1>Print the receipt.</h1>
          <p className="decision-detail">{decision.detail || 'The final grade is ready for the thermal receipt.'}</p>
          {grade && <div className={`grade-letter grade-letter--print grade-letter--${grade}`}>{grade}</div>}
          <div className="print-queue">
            {samples.map((item, index) => (
              <div key={item} className={printed.includes(item) ? 'is-printed' : index === printIndex ? 'is-current' : ''}>
                <span>{printed.includes(item) ? <Icon name="check" size={16} /> : index + 1}</span>
                <strong>{item}</strong>
                <small>{printed.includes(item) ? 'Printed' : index === printIndex ? 'Ready now' : 'Next copy'}</small>
              </div>
            ))}
          </div>
        </div>

        <div className="receipt-container-v2">
          <PaymentReceiptPrinter
            key={`${sample}-${printIndex}`}
            status={printing ? 'printing' : 'completed'}
            merchant="TunaEye Kiosk"
            merchantSubtext="Certified Quality Inspection"
            orderNumber={`#TE-${String(14 + printIndex).padStart(3, '0')}`}
            date={new Date()}
            showStatusCard={false}
            statusTitle={isCompleted ? 'Thermal Slip Issued' : printing ? 'Printing Receipt…' : 'Grading Complete'}
            statusSubtitle={isCompleted ? 'Inspection record printed' : printing ? 'Extruding 58mm thermal slip…' : '58mm thermal slip ready to print'}
            showActions={false}
            printerModel="POS-58"
            paperWidth="58mm"
            items={[
              {
                name: `${sample} (${result?.fishId ?? 'Fish 1'})`,
                price: peso(pricing.amount),
                quantity: 1,
                tag: result?.overrideGrade ? 'Expert Override' : 'AI Graded',
                description: `${result?.weight ?? '1.0'} kg · ${peso(pricing.unitRatePerKg)}/kg · ${result?.originalConfidence ?? 96}% confidence`,
              },
            ]}
            total={peso(pricing.amount)}
            currency=""
            paymentMethod={`Inspector: ${graderName || 'Station Operator'}`}
            message="Thank you for using TunaEye Kiosk!"
            autoPrint={false}
            printDuration={1.8}
            paperTheme="cream"
          />
        </div>
      </div>
      <BottomBar onBack={onBack} secondaryLabel="Skip printing" onSecondary={onSkip} primary={onPrint} primaryLabel={printing ? 'Printing…' : 'Print receipt'} primaryIcon="printer" primaryDisabled={printing} />

      {/* 58mm Physical Thermal Printer Slip (Printed via window.print() on 58mm thermal roll) */}
      <div className="thermal-print-slip" aria-hidden="true">
        <div className="thermal-slip-header">
          <div className="thermal-slip-logo">✦ TUNAEYE ✦</div>
          <div className="thermal-slip-title">QUALITY INSPECTION SLIP</div>
          <div className="thermal-slip-subtitle">58mm Thermal Grading Record</div>
        </div>
        <div className="thermal-slip-divider">================================</div>
        <div className="thermal-slip-row">
          <span>SLIP NO:</span>
          <strong>#TE-{String(14 + printIndex).padStart(3, '0')}</strong>
        </div>
        <div className="thermal-slip-row">
          <span>DATE:</span>
          <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
        <div className="thermal-slip-row">
          <span>TIME:</span>
          <span>{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
        </div>
        <div className="thermal-slip-row">
          <span>INSPECTOR:</span>
          <span>{graderName || 'Station Operator'}</span>
        </div>
        <div className="thermal-slip-divider">--------------------------------</div>
        <div className="thermal-slip-row thermal-slip-row--head">
          <span>SPECIMEN</span>
          <span>WEIGHT</span>
        </div>
        <div className="thermal-slip-row">
          <span>{sample} ({result?.fishId ?? 'Fish 1'})</span>
          <strong>{result?.weight ? `${result.weight} kg` : '1.0 kg'}</strong>
        </div>
        <div className="thermal-slip-detail">
          Confidence: {result?.originalConfidence ?? 96}%{result?.overrideGrade ? ' (Override)' : ' (AI Graded)'}
        </div>
        <div className="thermal-slip-row"><span>RATE:</span><strong>{peso(pricing.unitRatePerKg)}/kg</strong></div>
        <div className="thermal-slip-row"><span>FISH VALUE:</span><strong>{peso(pricing.amount)}</strong></div>
        <div className="thermal-slip-divider">================================</div>
        <div className="thermal-slip-grade-box">
          <div className="thermal-slip-grade-label">FINAL GRADE</div>
          <div className="thermal-slip-grade-value">GRADE {grade ?? 'A'}</div>
          <div className="thermal-slip-grade-sub">{result?.overrideGrade ? 'MANUAL OVERRIDE VERIFIED' : 'AI MODEL VERIFIED'}</div>
        </div>
        <div className="thermal-slip-divider">--------------------------------</div>
        <div className="thermal-slip-barcode">
          <svg viewBox="0 0 160 40" preserveAspectRatio="none" className="thermal-slip-barcode-svg">
            <rect x="0" y="0" width="3" height="40" fill="#000" />
            <rect x="5" y="0" width="1.5" height="40" fill="#000" />
            <rect x="9" y="0" width="4" height="40" fill="#000" />
            <rect x="15" y="0" width="2" height="40" fill="#000" />
            <rect x="19" y="0" width="1" height="40" fill="#000" />
            <rect x="22" y="0" width="3" height="40" fill="#000" />
            <rect x="27" y="0" width="1.5" height="40" fill="#000" />
            <rect x="31" y="0" width="5" height="40" fill="#000" />
            <rect x="38" y="0" width="2" height="40" fill="#000" />
            <rect x="42" y="0" width="1" height="40" fill="#000" />
            <rect x="45" y="0" width="4" height="40" fill="#000" />
            <rect x="51" y="0" width="2" height="40" fill="#000" />
            <rect x="55" y="0" width="1.5" height="40" fill="#000" />
            <rect x="58" y="0" width="3" height="40" fill="#000" />
            <rect x="63" y="0" width="5" height="40" fill="#000" />
            <rect x="70" y="0" width="1.5" height="40" fill="#000" />
            <rect x="73" y="0" width="3" height="40" fill="#000" />
            <rect x="78" y="0" width="2" height="40" fill="#000" />
            <rect x="82" y="0" width="4" height="40" fill="#000" />
            <rect x="88" y="0" width="1.5" height="40" fill="#000" />
            <rect x="92" y="0" width="3" height="40" fill="#000" />
            <rect x="97" y="0" width="1" height="40" fill="#000" />
            <rect x="100" y="0" width="4" height="40" fill="#000" />
            <rect x="106" y="0" width="2" height="40" fill="#000" />
            <rect x="110" y="0" width="3" height="40" fill="#000" />
            <rect x="115" y="0" width="1.5" height="40" fill="#000" />
            <rect x="118" y="0" width="5" height="40" fill="#000" />
            <rect x="125" y="0" width="2" height="40" fill="#000" />
            <rect x="129" y="0" width="1" height="40" fill="#000" />
            <rect x="132" y="0" width="4" height="40" fill="#000" />
            <rect x="138" y="0" width="2" height="40" fill="#000" />
            <rect x="142" y="0" width="1.5" height="40" fill="#000" />
            <rect x="145" y="0" width="3" height="40" fill="#000" />
            <rect x="150" y="0" width="2" height="40" fill="#000" />
            <rect x="154" y="0" width="4" height="40" fill="#000" />
            <rect x="159" y="0" width="1" height="40" fill="#000" />
          </svg>
          <div className="thermal-slip-barcode-text">* TE-{String(14 + printIndex).padStart(3, '0')} *</div>
        </div>
        <div className="thermal-slip-footer">
          <div>AUTH #TE-99824 · ESC/POS 58MM</div>
          <div>*** THANK YOU ***</div>
        </div>
        <div className="thermal-slip-feed-margin" />
      </div>
    </div>
  )
}
function CompleteScreen({ printed, onAgain, onHome, onLogout }: { printed: SampleType[]; onAgain: () => void; onHome: () => void; onLogout: () => void }) { return <div className="complete-screen"><div className="complete-screen__check"><Icon name="check" size={42} /></div><span className="eyebrow">Done</span><h1>Results printed.</h1><p>{printed.length > 1 ? 'Separate copies were created for each selected sample.' : 'The grading record is saved on this device.'}</p><div className="complete-print-list">{printed.map(sample => <span key={sample}><Icon name="check" size={16} />{sample}</span>)}</div><div className="complete-screen__meta"><span className="status-dot" />Ready for the next grader</div><div className="complete-screen__actions"><Button className="complete-screen__again" onClick={onAgain} icon="refresh">Grade another</Button><div className="complete-screen__secondary"><Button variant="secondary" onClick={onHome} icon="home">Dashboard</Button><Button variant="ghost" onClick={onLogout} icon="back">Logout</Button></div></div><span className="auto-reset-note">Auto-reset is ready after inactivity</span></div> }

function App() {
  const [session, dispatch] = useReducer(reducer, initialSession)
  const [demoOn, setDemoOn] = useState(() => { initDemoMode(); return isDemoMode() })
  const [demoScenario, setDemoScenarioState] = useState<DemoScenario>(getDemoScenario)
  const [demoControlsOpen, setDemoControlsOpen] = useState(false)
  const [booting, setBooting] = useState(true)
  const [webIntroDismissed, setWebIntroDismissed] = useState(false)
  const [publicLandingRequested, setPublicLandingRequested] = useState(false)
  const [adminCloudAuthRequired, setAdminCloudAuthRequired] = useState(false)
  const [marketingPage, setMarketingPage] = useState<MarketingPage>(() => marketingPageForPath(window.location.pathname))
  const [tutorialOpen, setTutorialOpen] = useState(false)
  const [legalKind, setLegalKind] = useState<'terms' | 'privacy' | null>(null)
  const [installed, setInstalled] = useState(() => window.matchMedia('(display-mode: standalone)').matches || localStorage.getItem('tunaeye-installed') === 'true')
  const [androidFullscreenLocked, setAndroidFullscreenLocked] = useState(() => (isAndroidChrome() || isNativeAndroidKiosk()) && localStorage.getItem('tunaeye-fullscreen-unlocked') !== 'true')
  useEffect(() => {
    const markReload = () => sessionStorage.setItem(KIOSK_RELOAD_MARKER_KEY, 'true')
    window.addEventListener('beforeunload', markReload)
    return () => window.removeEventListener('beforeunload', markReload)
  }, [])
  const [refreshRecovery] = useState(() => {
    const previousScreen = screenForPath(window.location.pathname)
    const lastActivity = Number(localStorage.getItem(KIOSK_ACTIVITY_KEY) ?? 0)
    const stale = installed && wasReloaded() && lastActivity > 0 && Date.now() - lastActivity >= KIOSK_IDLE_RESET_MS
    const resetToRole = installed && wasReloaded() && !stale
    const active = resetToRole && unfinishedScreens.has(previousScreen)
    return { active, stale, resetToRole, unfinished: active && unfinishedScreens.has(previousScreen) }
  })
  const [noticeModal, setNoticeModal] = useState<NoticeModalData | null>(() => refreshRecovery.unfinished ? {
    title: "Session wasn't saved",
    message: 'Your unfinished grading session was cleared when TunaEye refreshed. Completed records on this device were kept. Choose a role to start again.',
    icon: 'refresh',
    actionLabel: 'Choose a role',
  } : null)
  const [overrideTarget, setOverrideTarget] = useState<SampleType | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [currentPathScreen] = useState<Screen>(() => refreshRecovery.resetToRole ? 'select-role' : refreshRecovery.stale ? 'welcome' : screenForPath(window.location.pathname))
  const gradingSessionRef = useRef({ id: createId(), timestamp: Date.now() })
  useEffect(() => { initDemoMode(); setDemoOn(isDemoMode()) }, [])
  useEffect(() => { if (refreshRecovery.active) { setBooting(false); return }; const timeout = window.setTimeout(() => setBooting(false), 750); return () => window.clearTimeout(timeout) }, [refreshRecovery.active])
  useEffect(() => { const beforeInstall = (event: Event) => { event.preventDefault(); setInstallPrompt(event as BeforeInstallPromptEvent) }; const appInstalled = () => { setInstalled(true); localStorage.setItem('tunaeye-installed', 'true'); setInstallPrompt(null) }; window.addEventListener('beforeinstallprompt', beforeInstall); window.addEventListener('appinstalled', appInstalled); return () => { window.removeEventListener('beforeinstallprompt', beforeInstall); window.removeEventListener('appinstalled', appInstalled) } }, [])
  useEffect(() => { if (refreshRecovery.resetToRole) { clearCapturedEvidence(); dispatch({ type: 'reset' }); dispatch({ type: 'navigate', screen: 'select-role' }); window.history.replaceState({}, '', '/select-role') } else if (refreshRecovery.stale) { clearCapturedEvidence(); dispatch({ type: 'reset' }); dispatch({ type: 'navigate', screen: 'welcome' }); window.history.replaceState({}, '', '/kiosk/') } else if (currentPathScreen !== 'welcome') dispatch({ type: 'navigate', screen: currentPathScreen }); const onPopState = () => { dispatch({ type: 'navigate', screen: screenForPath(window.location.pathname) }); setMarketingPage(marketingPageForPath(window.location.pathname)) }; window.addEventListener('popstate', onPopState); return () => window.removeEventListener('popstate', onPopState) }, [currentPathScreen, refreshRecovery.resetToRole, refreshRecovery.stale])
  useEffect(() => {
    const markActivity = () => localStorage.setItem(KIOSK_ACTIVITY_KEY, String(Date.now()))
    markActivity()
    const events = ['pointerdown', 'keydown', 'touchstart', 'scroll'] as const
    events.forEach(event => window.addEventListener(event, markActivity, { passive: true }))
    return () => events.forEach(event => window.removeEventListener(event, markActivity))
  }, [])
  useEffect(() => {
    if (currentPathScreen !== 'admin' || !requiresHostedAdminAuth()) return
    void hasAdminProfile().then(isAdmin => {
      if (isAdmin) dispatch({ type: 'adminAuthenticated' })
    }).catch(error => console.error('[TunaEye] Hosted admin session check failed:', error))
  }, [currentPathScreen])
  const go = useCallback((screen: Screen) => { dispatch({ type: 'navigate', screen }); window.history.pushState({}, '', pathForScreen(screen)) }, [])
  const goHome = useCallback(() => { clearCapturedEvidence(); gradingSessionRef.current = { id: createId(), timestamp: Date.now() }; dispatch({ type: 'reset' }); window.history.pushState({}, '', '/') }, [])
  const graderHome = useCallback(() => { clearCapturedEvidence(); dispatch({ type: 'navigate', screen: 'grader-dashboard' }); window.history.pushState({}, '', pathForScreen('grader-dashboard')) }, [])
  const requestGraderHome = useCallback(() => {
    setNoticeModal({
      title: 'Leave grading session?',
      message: 'Continue grading?',
      icon: 'home',
      cancelLabel: 'Continue grading',
      actionLabel: 'Leave session',
      onAction: graderHome,
    })
  }, [graderHome])
  const graderLogout = useCallback(() => { clearCapturedEvidence(); localStorage.removeItem('tunaeye-grader-name'); dispatch({ type: 'reset' }); window.history.pushState({}, '', '/') }, [])
  const gradeAnother = useCallback(() => { clearCapturedEvidence(); gradingSessionRef.current = { id: createId(), timestamp: Date.now() }; dispatch({ type: 'gradeAnother' }); window.history.pushState({}, '', pathForScreen('weight')) }, [])
  const back = () => { const previous: Partial<Record<Screen, Screen>> = { 'select-role': 'welcome', admin: 'select-role', 'admin-dashboard': 'select-role', grader: 'select-role', 'grader-dashboard': 'grader', sample: 'grader-dashboard', association: 'sample', tutorial: 'weight', weight: 'grader-dashboard', camera: session.currentSampleIndex > 0 ? 'individual-result' : 'weight', review: 'camera', analysis: 'camera', 'individual-result': 'camera', overview: 'individual-result', print: 'individual-result' }; const target = previous[session.screen]; target ? go(target) : goHome() }
  const selected = session.selectedSamples.length ? session.selectedSamples : ['Sashibo core'] as SampleType[]
  const sample = currentSample(session)
  const recentSessions = new Set(loadRecords().filter(record => record.grader === session.graderName && Date.now() - record.timestamp <= 30 * 60 * 1000).map(record => record.sessionId)).size
  const canSkipTutorial = recentSessions >= 2
  const capture = async (blob: Blob, previewUrl: string) => {
    if (isCapturing) return
    setIsCapturing(true)
    const recordId = `${gradingSessionRef.current.id}-${sampleOrder.indexOf(sample) + 1}`
    try {
      await saveCapturedEvidence({ id: recordId, sessionId: gradingSessionRef.current.id, sample, fishId: fishIdForSample(session, sample), capturedAt: Date.now(), blob })
      if (capturedEvidence[sample]?.startsWith('blob:')) URL.revokeObjectURL(capturedEvidence[sample]!)
      capturedEvidence[sample] = previewUrl
      dispatch({ type: 'startAnalysis' })
      setIsCapturing(false)
    } catch {
      if (previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl)
      setIsCapturing(false)
      setNoticeModal({ title: 'Capture not saved', message: 'TunaEye could not store this image on the device. Free device storage and capture it again.', icon: 'camera' })
    }
  }
  useEffect(() => {
    if (session.screen !== 'analysis') return
    let cancelled = false
    const analyze = async () => {
      try {
        const recordId = `${gradingSessionRef.current.id}-${sampleOrder.indexOf(sample) + 1}`
        const evidence = await getCapturedEvidence(recordId)
        if (!evidence) throw new Error('Captured evidence is missing.')
        const result = await gradePiImage(evidence.blob, sample)
        if (!cancelled) dispatch({ type: 'finishAnalysis', outcome: result.outcome, grade: result.grade, confidence: result.confidence, rawConfidence: result.rawConfidence, inferenceId: result.id, captureId: result.captureId, scores: result.scores, imageType: result.imageType, modelSource: result.modelSource })
      } catch (error) {
        if (cancelled) return
        console.error('[TunaEye] Raspberry Pi inference failed:', error)
        const message = error instanceof Error ? error.message : 'Inference failed.'
        setNoticeModal({ title: 'Raspberry Pi inference unavailable', message: `${message} The captured image remains saved on this device.`, icon: 'help' })
        go('review')
      }
    }
    void analyze()
    return () => { cancelled = true }
  }, [session.screen, sample, go])
  useEffect(() => { if (session.screen !== 'complete') return; const timeout = window.setTimeout(() => goHome(), 30000); return () => window.clearTimeout(timeout) }, [session.screen, goHome])
  useEffect(() => {
    const completed = sampleOrder.flatMap((item, index) => {
      const result = session.results[item]
      if (!result?.captured) return []
      const { id: sessionId, timestamp } = gradingSessionRef.current
      const decision = decisionFor(session)
      const modelGrade = effectiveGrade(result) ?? 'Invalid'
      const grade = item === 'Sashibo core' && decision.grade ? decision.grade : modelGrade
      const pricing = priceSnapshot(grade, result.weight)
      const finished = item === 'Sashibo core' && decision.next === 'print'
      return [{ id: `${sessionId}-${index + 1}`, sessionId, timestamp, time: new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), grader: session.graderName || 'Guest grader', sample: item, fish: result.fishId, weight: `${result.weight} kg`, grade, status: result.overrideGrade || (finished && decision.source === 'expert') ? 'Override' : finished || result.status === 'valid' ? 'Complete' : result.status === 'uncertain' ? 'Uncertain' : 'Invalid', capturedImageId: `${sessionId}-${index + 1}`, result: { status: result.status, originalGrade: result.originalGrade, originalConfidence: result.originalConfidence, rawConfidence: result.rawConfidence, overrideGrade: result.overrideGrade, overrideReason: result.overrideReason, overrideActor: result.overrideActor, overrideAt: result.overrideAt, inferenceId: result.inferenceId, captureId: result.captureId, scores: result.scores, imageType: result.imageType, modelSource: result.modelSource }, transaction: { currency: 'PHP', unitRatePerKg: pricing.unitRatePerKg, amount: pricing.amount, syncState: 'pending' as const } }]
    })
    if (!completed.length) return
    const previous = loadRecords().filter(record => record.sessionId !== gradingSessionRef.current.id)
    saveRecords([...completed, ...previous])
  }, [session.results, session.graderName])
  const openRole = (role: Role) => { gradingSessionRef.current = { id: createId(), timestamp: Date.now() }; dispatch({ type: 'setRole', role }); go(role === 'admin' ? 'admin' : 'grader') }
  const openLiveDemo = useCallback(() => {
    if (!startPresentationDemo()) return
    setDemoOn(true)
    setPublicLandingRequested(false)
    setWebIntroDismissed(true)
    gradingSessionRef.current = { id: createId(), timestamp: Date.now() }
    dispatch({ type: 'setRole', role: 'expert' })
    dispatch({ type: 'setSamples', samples: ['Sashibo core'] })
    dispatch({ type: 'setSameFish', value: 'same' })
    dispatch({ type: 'navigate', screen: 'weight' })
    window.history.pushState({}, '', pathForScreen('weight'))
  }, [])
  const chooseDemoScenario = (next: DemoScenario) => { setDemoScenario(next); setDemoScenarioState(next) }
  const leaveDemo = () => { stopPresentationDemo(); setDemoOn(isDemoMode()) }
  const fishWeights = session.fishWeights
  const print = () => {
    if (isPrinting) return
    setIsPrinting(true)
    window.setTimeout(() => {
      try { window.print() }
      catch {
        setIsPrinting(false)
        setNoticeModal({ title: 'Printing failed', message: 'The print dialog could not open. Check the printer connection, then try again.', icon: 'printer', actionLabel: 'Try again', onAction: print })
        return
      }
      dispatch({ type: 'printed', sample: 'Sashibo core' })
      setIsPrinting(false)
      go('complete')
    }, 1500)
  }
  const installApp = async () => {
    if (installed || isInstalling) return;
    if (!installPrompt) {
      setNoticeModal({
        title: 'Install TunaEye Kiosk',
        message: 'To install TunaEye Kiosk on your device, open your browser menu (⋮ or Share) and select "Install app" or "Add to Home Screen".',
        items: [
          'Runs in dedicated standalone kiosk mode without browser address bars',
          'Enables instant offline access even without an active internet connection',
          'Fast launch from your home screen or desktop launcher'
        ],
        icon: 'spark'
      });
      return;
    }
    setIsInstalling(true)
    try {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      if (choice.outcome === 'accepted') {
        setInstalled(true)
        localStorage.setItem('tunaeye-installed', 'true')
        audit('Device', 'App installed', 'TunaEye kiosk installed on this device')
      } else setNoticeModal({ title: 'Installation cancelled', message: 'TunaEye was not installed. You can try again whenever you are ready.', icon: 'help' })
      setInstallPrompt(null)
    } catch {
      setNoticeModal({ title: 'Installation unavailable', message: 'The browser could not start installation. Use the browser menu and choose Install app or Add to Home Screen.', icon: 'help' })
    } finally { setIsInstalling(false) }
  }
  const enterFullscreen = () => { if (!fullscreenElement()) void forceBrowserFullscreen() }
  const unlockAndroidFullscreen = () => {
    localStorage.setItem('tunaeye-fullscreen-unlocked', 'true')
    setAndroidFullscreenLocked(false)
    nativeKiosk()?.exitLockTask?.()
    const exit = document.exitFullscreen ?? (document as Document & { webkitExitFullscreen?: () => Promise<void> | void }).webkitExitFullscreen
    if (exit) void exit.call(document)
  }
  const renderScreen = () => {
    switch (session.screen) {
      case 'welcome': return <WelcomeScreen onStart={() => { enterFullscreen(); go('select-role') }} onDemo={demoCanStart() ? openLiveDemo : undefined} onInstall={installApp} installed={installed} onTutorial={() => setTutorialOpen(true)} onGoMain={() => { setMarketingPage('home'); setPublicLandingRequested(true); window.history.pushState({}, '', '/') }} />
      case 'select-role': return <SelectRoleScreen onRole={openRole} onBack={back} />
      case 'admin': return adminCloudAuthRequired ? <AdminMagicLinkScreen onBack={() => { setAdminCloudAuthRequired(false); back() }} /> : <AdminPinScreen value={session.adminPin} error={session.adminError} onChange={value => dispatch({ type: 'setAdminPin', value })} onContinue={() => { if (session.adminPin === ADMIN_PIN) { audit('Admin', 'Login', 'Administrator authenticated at the kiosk'); if (requiresHostedAdminAuth()) void hasAdminProfile().then(isAdmin => { if (isAdmin) dispatch({ type: 'adminAuthenticated' }); else setAdminCloudAuthRequired(true) }).catch(error => setNoticeModal({ title: 'Hosted admin login unavailable', message: error instanceof Error ? error.message : 'Supabase admin access could not be checked.', icon: 'help' })); else dispatch({ type: 'adminAuthenticated' }) } else { audit('Unknown', 'Failed admin login', 'Incorrect admin PIN'); dispatch({ type: 'adminError', message: 'Incorrect admin PIN.' }) } }} onBack={back} />
      case 'admin-dashboard': return <AdminDashboard onExit={goHome} onNotice={setNoticeModal} onStartGrading={() => { dispatch({ type: 'setRole', role: 'expert' }); go(session.graderName ? 'grader-dashboard' : 'grader') }} />
      case 'grader': return <GraderEntryScreen name={session.graderName} remember={session.rememberName} onName={value => dispatch({ type: 'setGraderName', value })} onRemember={value => dispatch({ type: 'setRememberName', value })} onContinue={() => { dispatch({ type: 'setSamples', samples: ['Sashibo core'] }); dispatch({ type: 'setSameFish', value: 'same' }); go('weight') }} onBack={back} onLegal={setLegalKind} />
      case 'grader-dashboard': return <GraderDashboard name={session.graderName} onStart={gradeAnother} onLogout={goHome} onNotice={setNoticeModal} />
      case 'sample': return <SampleScreen selected={selected} onSelect={samples => dispatch({ type: 'setSamples', samples })} onContinue={() => { if (selected.length === 1) { dispatch({ type: 'setSameFish', value: 'same' }); go(canSkipTutorial ? 'weight' : 'tutorial') } else go('association') }} onBack={back} />
      case 'association': return <AssociationScreen samples={selected} sameFish={session.sameFish} onSameFish={value => dispatch({ type: 'setSameFish', value })} onContinue={() => { if (selected.length === 1) dispatch({ type: 'setSameFish', value: 'same' }); go(canSkipTutorial ? 'weight' : 'tutorial') }} onBack={back} />
      case 'tutorial': return <TutorialScreen samples={selected} step={session.tutorialStep} onStep={step => dispatch({ type: 'setTutorialStep', step })} onContinue={() => session.tutorialStep < 2 ? dispatch({ type: 'setTutorialStep', step: session.tutorialStep + 1 }) : go('weight')} onBack={back} />
      case 'weight': return <WeightScreen selected={selected} sameFish={session.sameFish} weights={fishWeights} onWeight={(fishId, value) => dispatch({ type: 'setFishWeight', fishId, value })} onContinue={() => go('camera')} onBack={back} />
      case 'camera': return <CameraScreen key={demoScenario} sample={sample} index={session.currentSampleIndex} total={selected.length} onCapture={capture} onBack={back} onHelp={() => setNoticeModal({ title: 'Camera Alignment Guide', message: 'Keep the sample still and fully visible inside the reticle.', items: ['Position the specimen flat within the frame corners', 'Avoid hand or finger shadows over the meat surface', 'Wait for autofocus to stabilize, then press Capture'], icon: 'camera' })} />
      case 'review': return <ReviewScreen sample={sample} outcome={session.demoOutcome} onRetake={() => go('camera')} onUse={() => dispatch({ type: 'startAnalysis' })} onBack={back} />
      case 'analysis': return <AnalysisScreen sample={sample} />
      case 'individual-result': return <IndividualResultScreen decision={decisionFor(session)} results={session.results} sample={sample} weight={weightForSample(session, 'Sashibo core') || weightForSample(session, sample)} onPrint={() => { dispatch({ type: 'startPrinting' }); window.history.pushState({}, '', pathForScreen('print')) }} onTail={() => { dispatch({ type: 'requestTail' }); window.history.pushState({}, '', pathForScreen('camera')) }} onRetake={() => go('camera')} onOverride={() => setOverrideTarget(decisionFor(session).next === 'override' ? 'Tail cut' : sample)} onBack={back} />
      case 'overview': return <OverviewScreen selected={selected} results={session.results} sameFish={session.sameFish} onOverride={setOverrideTarget} onPrint={() => dispatch({ type: 'startPrinting' })} onBack={back} />
      case 'print': return <PrintScreen samples={selected} results={session.results} decision={decisionFor(session)} printed={session.printedSamples} printing={isPrinting} onPrint={print} onSkip={() => setNoticeModal({ title: 'Skip printing?', message: 'The grading record stays saved, but no physical receipt will be produced.', icon: 'printer', cancelLabel: 'Keep printing', actionLabel: 'Skip receipt', onAction: () => go('complete') })} onBack={back} graderName={session.graderName} />
      case 'complete': return <CompleteScreen printed={session.printedSamples} onAgain={gradeAnother} onHome={graderHome} onLogout={graderLogout} />
    }
  }
  if (booting) return <LoadingScreen />
  if ((publicLandingRequested || (!installed && !webIntroDismissed)) && session.screen === 'welcome') return <ProductLanding page={marketingPage} onInstall={installApp} onOpen={() => { setPublicLandingRequested(false); setWebIntroDismissed(true) }} onDemo={demoCanStart() ? openLiveDemo : undefined} onNavigate={page => { setMarketingPage(page); window.history.pushState({}, '', page === 'home' ? '/' : `/${page}`) }} />
  const isLanding = session.screen === 'welcome'
  const showGraderHome = session.role === 'expert' && !['welcome', 'select-role', 'grader', 'grader-dashboard', 'complete'].includes(session.screen)
  return <div className={`app-shell ${isLanding ? 'app-shell--landing' : ''}`}>{demoOn && !isLanding && <DemoControlBar scenario={demoScenario} onScenario={chooseDemoScenario} open={demoControlsOpen} onToggle={() => setDemoControlsOpen(value => !value)} />}<main className={`app-main app-main--${session.screen}`}>{renderScreen()}</main>{showGraderHome && <button className="grader-home-shortcut" onClick={requestGraderHome} aria-label="View grading history" title="View grading history"><Icon name="home" size={18} /></button>}{(isAndroidChrome() || isNativeAndroidKiosk()) && androidFullscreenLocked && <button className="android-fullscreen-lock" onClick={unlockAndroidFullscreen} aria-label="Disable fullscreen" title="Disable fullscreen"><Icon name="lock" size={12} /></button>}{noticeModal ? <NoticeModal notice={noticeModal} onClose={() => setNoticeModal(null)} /> : overrideTarget ? <OverrideModal sample={overrideTarget} result={session.results[overrideTarget]} onClose={() => setOverrideTarget(null)} onSave={(grade, reason) => { dispatch({ type: 'setOverride', sample: overrideTarget, grade, reason, actor: session.graderName || 'Guest grader', timestamp: new Date().toISOString() }); setOverrideTarget(null); dispatch({ type: 'startPrinting' }); window.history.pushState({}, '', pathForScreen('print')) }} /> : legalKind ? <LegalModal kind={legalKind} onClose={() => setLegalKind(null)} /> : tutorialOpen ? <TutorialModal onClose={() => setTutorialOpen(false)} /> : null}<InternetRecoveryToast active={installed && !booting && !isLanding} />{isCapturing && <div className="capture-toast" role="status"><span className="capture-toast__ring is-spinning"><Icon name="camera" size={22} /></span><span><strong>Saving image</strong><small>Hold still for a moment</small></span></div>}{isPrinting && <div className="capture-toast" role="status"><span className="capture-toast__ring is-spinning"><Icon name="printer" size={22} /></span><span><strong>Printing result</strong><small>Please wait</small></span></div>}{isInstalling && <div className="capture-toast" role="status"><span className="capture-toast__ring is-spinning"><Icon name="spark" size={22} /></span><span><strong>Installing TunaEye</strong><small>Waiting for the browser</small></span></div>}</div>
}

export default App
