import { useState, useEffect, useRef } from 'react'
import { TunaEyeHeroLogo } from './components/TunaEyeHeroLogo'
import { Iphone16Pro } from './components/ui/iphone-16-pro'
import { MacbookPro } from './components/ui/macbook-pro'
import { DemoPlayIcon, HeroVideoDialog } from './components/ui/hero-video-dialog'

export type MarketingPage = 'home' | 'features' | 'about' | 'team' | 'faq' | 'terms' | 'privacy'

const pages: { id: MarketingPage; label: string; children?: { id: MarketingPage; label: string }[] }[] = [
  { id: 'home', label: 'Home' },
  { id: 'features', label: 'Features' },
  { id: 'about', label: 'About TunaEye', children: [
    { id: 'about', label: 'About TunaEye' },
    { id: 'terms', label: 'Terms & Conditions' },
    { id: 'privacy', label: 'Privacy Policy' },
  ]},
  { id: 'team', label: 'Team' },
  { id: 'faq', label: 'FAQ' },
]

const mobileAppScreens = [
  '/app-screens/0f28951a-c673-402e-95af-ec54cb2299b4.jpg',
  '/app-screens/9c1a96f6-ddce-40d8-a350-48a485826270.jpg',
  '/app-screens/486c94d0-543c-4243-bd0c-5f5f1293ad2d.jpg',
  '/app-screens/b87bd4a0-8c8e-4e16-94da-84dc49b9986f.jpg',
  '/app-screens/c5ba90a3-7dfd-46bb-b1fc-58213f53544c.jpg',
]

const changelog = [
  { version: 'v0.9.0', date: 'Oct 2026', items: ['Initial kiosk workflow with guided capture', 'Raspberry Pi edge inference integration', 'Dual-cloud sync (Supabase + Convex)', 'Admin dashboard with audit logging'] },
  { version: 'v0.8.0', date: 'Sep 2026', items: ['Multi-camera support with live preview', 'Thermal receipt printing (80mm)', 'Expert override with PIN protection'] },
  { version: 'v0.7.0', date: 'Aug 2026', items: ['Offline-first PWA architecture', 'Bluetooth weighing scale integration', 'Sample association (same-fish / different-fish)'] },
  { version: 'v0.6.0', date: 'Jul 2026', items: ['5000K CRI 98+ lighting chamber design', 'Sashibo core and tail cut grading criteria', 'Grade A/B/C classification model training'] },
]

/* ─── SVG icon library ─────────────────────────────────────────────────── */
function IconBrain() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="15" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.15"/>
      <path d="M11 10c0-2 1.5-3 3-3s3 1 3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M8 14c-1.5 0-2.5 1-2.5 2.5S6.5 19 8 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M24 14c1.5 0 2.5 1 2.5 2.5S25.5 19 24 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M11 10c-3 0-5 2-5 4.5 0 1.5.6 2.8 1.5 3.5.9.7 2 1 3 1h1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M14 10c1 0 2 .4 2.5 1M17 10c3 0 5 2 5 4.5 0 1.5-.6 2.8-1.5 3.5-.9.7-2 1-3 1h-1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M10 19v5M14 18v6M18 18v6M22 19v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M10 22h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function IconLight() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="13" r="5.5" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M16 4V2M16 24v2M4 13H2M30 13h-2M7.1 6.1 5.7 4.7M26.9 6.1l1.4-1.4M7.1 19.9 5.7 21.3M26.9 19.9l1.4 1.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M12 23h8M13 26h6M14 29h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}

function IconTablet() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="5" y="2" width="22" height="28" rx="3" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M5 24h22" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="16" cy="27" r="1.2" fill="currentColor"/>
      <rect x="9" y="6" width="14" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M11 13l2.5 2.5L16 13l2.5 2.5L21 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  )
}

function IconScale() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M16 5v22M8 27h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M16 5l-8 12h16L16 5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <rect x="12" y="24" width="8" height="3" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M8 17c0 0 2-4 4-4M24 17c0 0-2-4-4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.6"/>
    </svg>
  )
}

function IconPerson() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle cx="24" cy="17" r="9" stroke="currentColor" strokeWidth="2"/>
      <path d="M7 41c0-8.3 7.6-15 17-15s17 6.7 17 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

function IconMedal() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="19" r="9" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M12 3h8l-2 8h-4L12 3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M14 11l-3 3M18 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M13 19l1.5 1.5L19 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IconArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IconFlow() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 10h12M12 6l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

/* ─── Workflow pictogram icons ──────────────────────────────────────────── */
function PictoAuth() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <circle cx="18" cy="12" r="6" stroke="currentColor" strokeWidth="2"/>
      <path d="M6 30c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="26" cy="10" r="4" fill="currentColor" opacity="0.15"/>
      <path d="M24 10l1.5 1.5L28 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
function PictoCut() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <ellipse cx="18" cy="19" rx="12" ry="7" stroke="currentColor" strokeWidth="2"/>
      <path d="M6 19c0-3.866 5.373-7 12-7s12 3.134 12 7" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2"/>
      <path d="M18 12v14M10 16l16 6M10 22l16-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.5"/>
      <circle cx="18" cy="19" r="3" fill="currentColor" opacity="0.2"/>
    </svg>
  )
}
function PictoWeigh() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <rect x="6" y="24" width="24" height="5" rx="2.5" stroke="currentColor" strokeWidth="2"/>
      <path d="M18 7v17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M18 7l-9 11h18L18 7z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M11 20h14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.4"/>
    </svg>
  )
}
function PictoChamber() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <rect x="5" y="9" width="26" height="20" rx="3" stroke="currentColor" strokeWidth="2"/>
      <circle cx="18" cy="19" r="5.5" stroke="currentColor" strokeWidth="2"/>
      <circle cx="18" cy="19" r="2" fill="currentColor" opacity="0.3"/>
      <path d="M14 9V7a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="1.8"/>
      <circle cx="27" cy="13" r="1.5" fill="currentColor" opacity="0.5"/>
    </svg>
  )
}
function PictoInfer() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <rect x="8" y="8" width="20" height="20" rx="4" stroke="currentColor" strokeWidth="2"/>
      <path d="M8 14h20M8 22h20M14 8v20M22 8v20" stroke="currentColor" strokeWidth="1.3" opacity="0.3"/>
      <path d="M15 18l2 2 4-4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="28" cy="10" r="4" fill="#176BFF" opacity="0.9"/>
      <path d="M27 10l.8.8L30 9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
function PictoReceipt() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <rect x="9" y="4" width="18" height="24" rx="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M13 11h10M13 15h10M13 19h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.6"/>
      <path d="M9 28l3-3 3 3 3-3 3 3 3-3 3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="28" cy="26" r="5" fill="#2eb67d" opacity="0.9"/>
      <path d="M25.5 26l1.5 1.5L30 24.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

/* ─── Scroll animation hook ──────────────────────────────────────────────── */
function useScrollReveal() {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-revealed')
          obs.unobserve(el)
        }
      },
      { threshold: 0.12 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return ref
}

/* Wrap any block element with scroll reveal */
function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useScrollReveal()
  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`scroll-reveal ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}

/* ─── Logo / Arrow ───────────────────────────────────────────────────────── */
function Logo() {
  return (
    <span className="site-logo">
      <img src="/tunaeye-logo.svg" alt="" />
      <strong>Tuna<span>Eye</span></strong>
    </span>
  )
}

function Arrow() {
  return <IconArrowRight />
}

function NavDropdown({ item, page, onNavigate }: { item: typeof pages[number]; page: MarketingPage; onNavigate: (p: MarketingPage) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])
  return (
    <div className={`site-nav-dropdown ${open ? 'is-open' : ''}`} ref={ref}>
      <button
        className={`site-nav-dropdown__toggle ${item.children?.some(c => c.id === page) ? 'is-active' : ''}`}
        onClick={() => setOpen(v => !v)}
      >
        {item.label} <span className="dropdown-chevron" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="site-nav-dropdown__menu">
          {item.children?.map(child => (
            <button key={child.id} className={page === child.id ? 'is-active' : ''} onClick={() => { onNavigate(child.id); setOpen(false) }}>
              {child.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ChangelogModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop changelog-backdrop" role="dialog" aria-modal="true" aria-label="Changelog" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="changelog-modal">
        <div className="changelog-modal__header">
          <div className="changelog-modal__title-group">
            <span className="changelog-kicker">What's New</span>
            <h2>Version History</h2>
          </div>
          <button className="changelog-close-btn" aria-label="Close changelog" onClick={onClose}>&times;</button>
        </div>
        <div className="changelog-modal__body">
          {changelog.map(release => (
            <div key={release.version} className="changelog-entry">
              <div className="changelog-entry__head">
                <span className="changelog-version-badge">{release.version}</span>
                <span className="changelog-date">{release.date}</span>
              </div>
              <ul className="changelog-list">
                {release.items.map(item => (
                  <li key={item}>
                    <span className="changelog-bullet" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function MarketingLanding({
  page,
  onNavigate,
  onInstall,
  onOpen,
  onDemo,
}: {
  page: MarketingPage
  onNavigate: (page: MarketingPage) => void
  onInstall: () => void
  onOpen: () => void
  onDemo?: () => void
}) {
  const [changelogOpen, setChangelogOpen] = useState(false)

  const navigate = (next: MarketingPage) => {
    onNavigate(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="site-shell">
      <div className="site-nav-wrapper">
        <header className="site-nav">
          <Logo />
          <nav>
            {pages.map(item =>
              item.children ? (
                <NavDropdown key={item.id} item={item} page={page} onNavigate={navigate} />
              ) : (
                <button
                  key={item.id}
                  className={page === item.id ? 'is-active' : ''}
                  onClick={() => navigate(item.id)}
                >
                  {item.label}
                </button>
              )
            )}
          </nav>
          <button className="site-nav__cta" onClick={onInstall}>
            Install kiosk app
          </button>
        </header>
      </div>

      {page === 'home' ? (
        <Home onInstall={onInstall} onOpen={onOpen} onDemo={onDemo} onNavigate={navigate} onChangelog={() => setChangelogOpen(true)} />
      ) : page === 'team' ? (
        <TeamPage onNavigate={navigate} onOpen={onOpen} />
      ) : (
        <InnerPage page={page} onNavigate={navigate} onOpen={onOpen} />
      )}

      <footer className="site-footer">
        <div className="site-footer__brand">
          <Logo />
          <div className="site-footer__brand-bottom">
            <strong>We extend the expert eye.</strong>
            <p>CNN assist for sashibo and tail-cut yellowfin grading.</p>
            <div className="site-footer__socials" aria-label="Social links"><span>X</span><span>in</span><span>f</span><span>◎</span></div>
            <small>© 2026 TunaEye Systems. All rights reserved.</small>
          </div>
        </div>
        <div className="site-footer__links">
          <div><strong>Product</strong><button onClick={() => navigate('features')}>Features</button><button onClick={() => navigate('home')}>Workflow</button><button onClick={onInstall}>Install app</button></div>
          <div><strong>Resources</strong><button onClick={() => navigate('faq')}>Help</button><button onClick={() => navigate('faq')}>FAQ</button><button onClick={() => setChangelogOpen(true)}>Changelog</button></div>
          <div><strong>Company</strong><button onClick={() => navigate('about')}>About</button><button onClick={() => navigate('team')}>Team</button><a href="mailto:hello@tunaeye.app">Contact</a></div>
          <div><strong>Legal</strong><button onClick={() => navigate('terms')}>Terms</button><button onClick={() => navigate('privacy')}>Privacy</button><span>General Santos City</span></div>
          <form className="site-footer__newsletter" onSubmit={event => event.preventDefault()}>
            <strong>Newsletter</strong>
            <div><label className="sr-only" htmlFor="footer-email">Email address</label><input id="footer-email" type="email" placeholder="Enter your email" /><button type="submit">Submit</button></div>
          </form>
        </div>
      </footer>

      <button className="fixed-changelog-trigger" onClick={() => setChangelogOpen(true)} title="View Changelog">
        <span className="version-pill">v0.9.0</span>
        <span>What's new</span>
        <span className="sparkle-icon">✨</span>
      </button>

      {changelogOpen && <ChangelogModal onClose={() => setChangelogOpen(false)} />}
    </div>
  )
}

function Home({
  onInstall,
  onOpen,
  onDemo,
  onNavigate,
  onChangelog,
}: {
  onInstall: () => void
  onOpen: () => void
  onDemo?: () => void
  onNavigate: (page: MarketingPage) => void
  onChangelog: () => void
}) {
  const [showcase, setShowcase] = useState(0)
  const [selectedCut, setSelectedCut] = useState<'sashibo' | 'tail'>('sashibo')
  const [mobileScreen, setMobileScreen] = useState(0)

  useEffect(() => {
    mobileAppScreens.forEach(src => { const image = new Image(); image.src = src })
    const timer = window.setInterval(() => setMobileScreen(current => (current + 1) % mobileAppScreens.length), 2_000)
    return () => window.clearInterval(timer)
  }, [])

  const showcaseItems = [
    {
      image: '/assets/sashiboCoreFull.png',
      title: 'Sashibo Core Sample',
      copy: 'Center-cut core sample providing evidence of translucency, fat/oil distribution, core structural integrity, and myoglobin oxidation.',
    },
    {
      image: '/assets/tailCutFull.png',
      title: 'Tail Cut Cross-Section',
      copy: 'Cross-sectional tail muscle sample revealing muscle grain density, color saturation, drip loss, and post-mortem firmness.',
    },
  ]

  return (
    <main className="site-home">
      {/* HERO SECTION */}
      <section className="site-hero">
        <div className="site-hero__mesh" />
        <div className="site-hero__copy">
          <span className="site-kicker">Expert grading, extended</span>
          <h1>
            Sea<br />
            <em>Beyond the Cut.</em>
          </h1>
          <p className="site-hero__quote">We don't replace the expert eye. We extend its reach.</p>
          <p className="site-hero__support">Built on expert knowledge. Enhanced by computer vision.</p>
          <div className="site-actions">
            <button className="site-button site-button--primary" onClick={onOpen}>
              Start Grading <Arrow />
            </button>
            {onDemo && <button className="site-button site-button--demo" onClick={onDemo}>Try full demo · no Pi <Arrow /></button>}
            <button className="site-button" onClick={() => onNavigate('features')}>
              Station Specs <Arrow />
            </button>
          </div>
        </div>

        <div className="site-hero__visual">
          <TunaEyeHeroLogo />
        </div>

        <div className="site-hero__band">
          <span>01. Weigh the fish</span>
          <i />
          <span>02. Grade sashibo core</span>
          <i />
          <span>03. Tail cut only under 80%</span>
          <i />
          <span>04. Print one receipt</span>
        </div>
      </section>

      {/* DEMO VIDEO SECTION */}
      <Reveal>
        <section className="site-demo-video">
          <div className="site-demo-video__copy">
            <span className="site-kicker">See TunaEye in Action</span>
            <h2>From cut to grade — in one pass</h2>
            <p>Watch experts' visual traits become a guided capture, CNN assist, and reviewable record.</p>
            <div className="site-actions">
              <HeroVideoDialog videoSrc="/image.png" trigger={<span className="site-button site-button--primary">View Demo <Arrow /></span>} />
              {onDemo && <button className="site-button site-button--demo" onClick={onDemo}>Try full demo · no Pi <Arrow /></button>}
            </div>
          </div>
          <div className="site-demo-video__visual">
            <MacbookPro className="demo-macbook" src="/image.png" aria-label="TunaEye workflow demo on a MacBook Pro" />
            <HeroVideoDialog videoSrc="/image.png" trigger={<span className="video-play-button" aria-label="View TunaEye demo"><DemoPlayIcon /></span>} />
            <span className="demo-macbook__label">Open interactive demo</span>
          </div>
        </section>
      </Reveal>

      {/* MOBILE EXPERIENCE SECTION */}
      <Reveal>
        <section className="site-mobile-experience" id="download-app">
          <div className="mobile-experience-grid">
            {/* LEFT SIDE: Device Mockup + QR Code */}
            <div className="mobile-experience__left">
              <div className="device-mockup">
                <Iphone16Pro
                  className="iphone-16-pro"
                  src={mobileAppScreens[mobileScreen]}
                  aria-label="TunaEye mobile app screen preview"
                />
              </div>

              <div className="qr-section">
                <h3>Scan to install</h3>
                <div className="qr-code">
                  <img
                    className="qr-code__image"
                    src={encodeURI('/assets/mobile app qr.png')}
                    alt="QR code to install the TunaEye mobile app"
                    width={220}
                    height={220}
                  />
                  <p>Point your camera at the code</p>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE: Installation guide */}
            <div className="mobile-experience__right">
              <span className="site-kicker">Getting Started</span>
              <h3>Install the station app. Keep the expert in charge.</h3>
              <p>Scan the QR, install the PWA, connect the Pi, then grade. Offline capture still works.</p>
              <div className="experience-steps">
                <div className="step">
                  <div className="step-number">1</div>
                  <div className="step-content">
                    <h4>Install</h4>
                    <p>Scan the QR or open TunaEye in Chrome, Safari, or Edge, then choose Install App.</p>
                  </div>
                </div>
                <div className="step">
                  <div className="step-number">2</div>
                  <div className="step-content">
                    <h4>Launch</h4>
                    <p>Open the home-screen icon for the standalone kiosk.</p>
                  </div>
                </div>
                <div className="step">
                  <div className="step-number">3</div>
                  <div className="step-content">
                    <h4>Connect the Pi</h4>
                    <p>Link the station to the local edge CNN for on-LAN inference.</p>
                  </div>
                </div>
                <div className="step">
                  <div className="step-number">4</div>
                  <div className="step-content">
                    <h4>Grade</h4>
                    <p>Name, cut type, capture — then review the assist before you accept.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      {/* WHY TUNAEYE / VALUE PROP */}
      <Reveal>
        <section className="site-story">
          <div>
            <span className="site-kicker">Why TunaEye Matters</span>
            <h2>Close the gap. Do not replace the grader.</h2>
          </div>
          <div>
            <p>
              TunaEye is a CNN trained on expert-annotated sashibo core and tail-cut images. It mirrors the traits graders already look for so the assist is familiar, not foreign.
            </p>
            <p>
              Standardized capture and transfer learning make quality assessment more consistent and accessible. The expert still decides.
            </p>
            <button className="site-text-link" onClick={() => onNavigate('about')}>
              Read our engineering approach <Arrow />
            </button>
          </div>
        </section>
      </Reveal>

      {/* HARDWARE & CHAMBER INTEGRATION */}
      <Reveal>
        <section className="site-hardware" id="hardware">
          <header>
            <span className="site-kicker">Station Architecture</span>
            <h2>Rugged hardware engineered for the port floor.</h2>
            <p>TunaEye connects off-the-shelf industrial components into a seamless, splash-resistant grading station.</p>
          </header>

          <div className="hardware-grid">
            <Reveal delay={0}>
              <article className="hardware-card hardware-card--minimal">
                <div className="hardware-card__icon"><IconBrain /></div>
                <h3>Raspberry Pi<br/>Edge Server</h3>
                <div className="hw-pills">
                  <span>&lt;200ms</span><span>LAN only</span><span>Offline AI</span>
                </div>
              </article>
            </Reveal>

            <Reveal delay={80}>
              <article className="hardware-card hardware-card--minimal">
                <div className="hardware-card__icon"><IconLight /></div>
                <h3>5000K CRI 98+<br/>Diffuse Chamber</h3>
                <div className="hw-pills">
                  <span>Daylight</span><span>Anti-glare</span><span>Calibrated</span>
                </div>
              </article>
            </Reveal>

            <Reveal delay={160}>
              <article className="hardware-card hardware-card--minimal">
                <div className="hardware-card__icon"><IconTablet /></div>
                <h3>10.1″ IP65<br/>Touch Tablet</h3>
                <div className="hw-pills">
                  <span>Splash-safe</span><span>PWA</span><span>Offline</span>
                </div>
              </article>
            </Reveal>

            <Reveal delay={240}>
              <article className="hardware-card hardware-card--minimal">
                <div className="hardware-card__icon"><IconScale /></div>
                <h3>Scale &amp;<br/>Thermal Printer</h3>
                <div className="hw-pills">
                  <span>200kg max</span><span>80mm</span><span>QR code</span>
                </div>
              </article>
            </Reveal>
          </div>
        </section>
      </Reveal>

      {/* TUNA GRADING CRITERIA BREAKDOWN */}
      <Reveal>
        <section className="site-criteria">
          <div className="site-criteria__intro">
            <span className="site-kicker">Anatomical Grading Criteria</span>
            <h2>Standardized quality metrics for Sashibo &amp; Tail Cut samples.</h2>
            <p>TunaEye evaluates the primary anatomical sample cuts used in commercial yellowfin sashimi grading.</p>
          </div>

          <div className="criteria-tabs">
            <button
              className={selectedCut === 'sashibo' ? 'is-active' : ''}
              onClick={() => setSelectedCut('sashibo')}
            >
              Sashibo Core Sample Analysis
            </button>
            <button
              className={selectedCut === 'tail' ? 'is-active' : ''}
              onClick={() => setSelectedCut('tail')}
            >
              Tail Cut Cross-Section Analysis
            </button>
          </div>

          <div className="criteria-content">
            {selectedCut === 'sashibo' ? (
              <div className="criteria-panel">
                <div className="criteria-panel__text">
                  <h3>Sashibo Core Evaluation Metrics</h3>
                  <p>Extracted using a specialized sashibo probe from the core flesh near the dorsal fin, this sample provides a direct look into internal muscle quality.</p>
                  <div className="criteria-list">
                    <div>
                      <strong>Flesh Translucency &amp; Oil Content</strong>
                      <p>Measures light transmission and lipid dispersion across the core specimen, indicating high fat content prized in Grade A sashimi.</p>
                    </div>
                    <div>
                      <strong>Myoglobin Color Saturation</strong>
                      <p>Detects deep cherry-red hue versus brown oxidation or darkening caused by post-capture stress or thermal spike.</p>
                    </div>
                    <div>
                      <strong>Core Structural Integrity</strong>
                      <p>Ensures the core sample retains firmness without gaping, mushiness, or parasitic muscle breakdown.</p>
                    </div>
                  </div>
                </div>
                <div className="criteria-panel__image">
                  <img src="/assets/sashiboCoreFull.png" alt="Sashibo core sample breakdown" />
                  <span>Center-Cut Core Evidence</span>
                </div>
              </div>
            ) : (
              <div className="criteria-panel">
                <div className="criteria-panel__text">
                  <h3>Tail Cut Cross-Section Metrics</h3>
                  <p>Harvested at the caudal peduncle, the tail cut exposes the muscle cross-section for rapid visual assessment of firmness and muscle density.</p>
                  <div className="criteria-list">
                    <div>
                      <strong>Muscle Grain Density &amp; Tightness</strong>
                      <p>Evaluates muscle fiber compactness. Tight, dense grain indicates strong muscle retention and superior shelf life.</p>
                    </div>
                    <div>
                      <strong>Oxidation &amp; Color Saturation</strong>
                      <p>Detects edge browning and metmyoglobin formation along the outer fat ring and central muscle mass.</p>
                    </div>
                    <div>
                      <strong>Drip Loss &amp; Surface Moisture</strong>
                      <p>Quantifies excessive surface water exudation resulting from cellular rupture during improper chilling.</p>
                    </div>
                  </div>
                </div>
                <div className="criteria-panel__image">
                  <img src="/assets/tailCutFull.png" alt="Tail cut sample breakdown" />
                  <span>Caudal Peduncle Cross-Section</span>
                </div>
              </div>
            )}
          </div>

          {/* GRADE CLASSIFICATION SCALE */}
          <div className="grade-scale-grid">
            <Reveal delay={0}><div className="grade-card grade-card--a">
              <span className="grade-badge">Grade A</span>
              <h4>Export Sashimi Grade</h4>
              <p>Deep translucent red, high fat content, zero oxidation, firm core texture. Highest commercial value.</p>
            </div></Reveal>
            <Reveal delay={80}><div className="grade-card grade-card--bplus">
              <span className="grade-badge">Grade B+</span>
              <h4>Premium Fresh Grade</h4>
              <p>Strong red color saturation, slight fat dispersion, firm muscle grain. Excellent fresh market suitability.</p>
            </div></Reveal>
            <Reveal delay={160}><div className="grade-card grade-card--b">
              <span className="grade-badge">Grade B</span>
              <h4>Standard Fresh Grade</h4>
              <p>Moderate red color, minor surface oxidation acceptable, suitable for domestic retail and grilling.</p>
            </div></Reveal>
            <Reveal delay={240}><div className="grade-card grade-card--c">
              <span className="grade-badge">Grade C</span>
              <h4>Processing / Canning Grade</h4>
              <p>Dark/brown oxidation, soft texture or high drip loss. Allocated for cooked processing or canning.</p>
            </div></Reveal>
          </div>
        </section>
      </Reveal>

      {/* END-TO-END WORKFLOW AT A GLANCE */}
      <Reveal>
        <section className="site-workflow site-workflow--picto">
          <header>
            <span className="site-kicker">Station Workflow</span>
            <h2>Six steps. One traceable record.</h2>
          </header>

          <div className="picto-pipeline">
            {([
              ['01', 'Grader Auth',   <PictoAuth />],
              ['02', 'Select Cut',    <PictoCut />],
              ['03', 'Weigh Fish',    <PictoWeigh />],
              ['04', 'Capture',       <PictoChamber />],
              ['05', 'Edge AI',       <PictoInfer />],
              ['06', 'Print & Sync',  <PictoReceipt />],
            ] as [string, string, React.ReactNode][]).map(([num, label, icon], i) => (
              <Reveal key={num} delay={i * 55}>
                <div className="picto-step">
                  <div className="picto-step__icon">{icon}</div>
                  <span className="picto-step__num">{num}</span>
                  <strong className="picto-step__label">{label}</strong>
                </div>
                {i < 5 && <div className="picto-connector" aria-hidden="true"><IconFlow /></div>}
              </Reveal>
            ))}
          </div>
        </section>
      </Reveal>

      {/* SAMPLE EVIDENCE SHOWCASE */}
      <Reveal>
        <section className="site-showcase">
          <div className="site-showcase__copy">
            <span className="site-kicker">Traceable Evidence</span>
            <h2>{showcaseItems[showcase].title}</h2>
            <p>{showcaseItems[showcase].copy}</p>
            <div>
              <button
                onClick={() => setShowcase(value => (value ? value - 1 : showcaseItems.length - 1))}
                aria-label="Previous sample"
              >
                ←
              </button>
              <span>
                {showcase + 1} / {showcaseItems.length}
              </span>
              <button
                onClick={() => setShowcase(value => (value + 1) % showcaseItems.length)}
                aria-label="Next sample"
              >
                →
              </button>
            </div>
          </div>
          <div className="site-showcase__image">
            <span>Captured sample evidence</span>
            <img src={showcaseItems[showcase].image} alt={showcaseItems[showcase].title} />
          </div>
        </section>
      </Reveal>

      {/* STATION METRICS */}
      <Reveal>
        <section className="site-metrics">
          <article>
            <strong>&lt; 200ms</strong>
            <span>Edge inference speed</span>
          </article>
          <article>
            <strong>200 kg</strong>
            <span>Maximum fish weight cap</span>
          </article>
          <article>
            <strong>1:1</strong>
            <span>Fish-to-evidence traceability</span>
          </article>
          <article>
            <strong>100%</strong>
            <span>Offline kiosk availability</span>
          </article>
        </section>
      </Reveal>

      {/* DUAL CLOUD ARCHITECTURE */}
      <Reveal>
        <section className="site-architecture">
          <div>
            <span className="site-kicker">Resilient Infrastructure</span>
            <h2>Local edge speed. Cloud transparency.</h2>
            <p>
              The kiosk tablet handles operator interactions and offline IndexedDB queueing. The Raspberry Pi performs zero-latency AI inference on station LAN. Supabase PostgreSQL serves as the durable system of record, while Convex broadcasts live updates across all admin consoles.
            </p>
            <button className="site-text-link" onClick={() => onNavigate('features')}>
              Explore full feature breakdown <Arrow />
            </button>
          </div>
          <div className="architecture-flow">
            <article>
              <b>01</b>
              <strong>Tablet Kiosk</strong>
              <small>Capture, weigh &amp; review</small>
            </article>
            <i aria-hidden="true"><IconFlow /></i>
            <article>
              <b>02</b>
              <strong>Raspberry Pi</strong>
              <small>Edge AI model inference</small>
            </article>
            <i aria-hidden="true"><IconFlow /></i>
            <article>
              <b>03</b>
              <strong>Supabase + Convex</strong>
              <small>Durable records &amp; live sync</small>
            </article>
          </div>
        </section>
      </Reveal>

      {/* FAQ PREVIEW */}
      <Reveal>
        <section className="site-faq-preview">
          <header>
            <span className="site-kicker">Deployment FAQ</span>
            <h2>Frequently asked questions before deployment.</h2>
          </header>
          <div>
            <details open>
              <summary>Who uses the TunaEye station?</summary>
              <p>
                Fish ports, buying stations, commercial seafood processors, trained quality graders, and export inspection officers.
              </p>
            </details>
            <details>
              <summary>Does the kiosk work during internet outages?</summary>
              <p>
                Yes. The kiosk shell, camera capture, local weight entry, Raspberry Pi edge inference, thermal printing, and audit logging operate 100% offline. Cloud synchronization resumes automatically when connectivity is restored.
              </p>
            </details>
            <details>
              <summary>How are expert overrides handled and audited?</summary>
              <p>
                If a grader disagrees with the AI model confidence score, an expert override can be entered. Overrides require the Station Admin PIN and record the reason, preserving both the original AI output and the grader override for audit purposes.
              </p>
            </details>
            <details>
              <summary>Which cameras and scales are supported?</summary>
              <p>
                TunaEye supports device cameras, USB industrial cameras, and webcams via standard WebRTC, along with serial/Bluetooth digital weighing scales up to 200kg.
              </p>
            </details>
          </div>
          <button className="site-text-link" onClick={() => onNavigate('faq')}>
            View all questions &amp; answers <Arrow />
          </button>
        </section>
      </Reveal>

      {/* CALL TO ACTION */}
      <Reveal>
        <section className="site-cta">
          <span className="site-kicker">Ready for the Grading Floor?</span>
          <h2>Turn every yellowfin tuna sample into clear, connected evidence.</h2>
          <p>Start grading now or explore the full platform capabilities in your browser.</p>
          <div className="site-actions">
            <button className="site-button site-button--primary" onClick={onOpen}>
              Start Grading <Arrow />
            </button>
            <button className="site-button" onClick={() => onNavigate('features')}>
              Explore Features
            </button>
          </div>
        </section>
      </Reveal>
    </main>
  )
}

interface RosterMember { name: string; role: string; bio: string; photo: string }

function RosterCard({ member, index }: { member: RosterMember; index: number }) {
  const [photoFailed, setPhotoFailed] = useState(false)
  const [expanded, setExpanded] = useState(false)
  return (
    <button
      type="button"
      className={`roster-card ${expanded ? 'is-expanded' : ''}`}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      onFocus={() => setExpanded(true)}
      onBlur={() => setExpanded(false)}
      onClick={() => setExpanded(value => !value)}
      aria-expanded={expanded}
    >
      <span className="roster-card__tag">P{index + 1}</span>
      <div className="roster-card__photo">
        {photoFailed ? (
          <div className="roster-card__fallback"><IconPerson /></div>
        ) : (
          <img src={member.photo} alt={member.name} loading="lazy" onError={() => setPhotoFailed(true)} />
        )}
        <div className="roster-card__scrim" />
      </div>
      <div className="roster-card__caption">
        <h3>{member.name}</h3>
        <span className="roster-card__role">{member.role}</span>
      </div>
      <div className="roster-card__bio" aria-hidden={!expanded}>
        <div className="roster-card__bio-grid" />
        <p>{member.bio}</p>
      </div>
    </button>
  )
}

function TeamPage({
  onNavigate,
  onOpen,
}: {
  onNavigate: (page: MarketingPage) => void
  onOpen: () => void
}) {
  const teamMembers = [
    {
      name: 'ARNADO, Catherine C.',
      role: 'Project Lead & Full Stack Architect, AI & Computer Vision Lead',
      bio: 'Leads system architecture, dual-cloud sync, PWA development, and port kiosk integrations.',
      photo: '/assets/team/arnado.jpg',
    },
    {
      name: 'PALMA, Xander',
      role: 'Hardware & Embedded Systems',
      bio: 'Designs camera enclosures, 5000K CRI 98+ lighting chambers, Raspberry Pi peripherals, and thermal printers.',
      photo: '/assets/team/palma.jpg',
    },
    {
      name: 'ABING, Eliza Marie',
      role: 'Documentation & Quality & Field Operations Specialist',
      bio: 'Keeps project documentation, QA checklists, and field deployment notes aligned with how the station is actually used.',
      photo: '/assets/team/abing.jpg',
    },
    {
      name: 'SALAZAR, Joey',
      role: 'Mobile App Developer, QA Lead',
      bio: 'Builds the companion mobile app and leads quality assurance across the kiosk and mobile surfaces.',
      photo: '/assets/team/salazar.jpg',
    },
  ]

  const advisers = [
    {
      name: 'Dr. Owen B. Pilongo, DBM-IS',
      title: 'Project Adviser',
      affiliation: 'CET Chairperson, BSIT Program Head',
      expertise: '',
    },
  ]

  return (
    <main className="site-inner team-page">
      <header className="team-header">
        <span className="site-kicker">The People Behind TunaEye</span>
        <h1>Engineered for precision. Built for real ports.</h1>
        <p>
          Meet the multidisciplinary team of engineers, researchers, and fisheries experts dedicated to digitizing yellowfin tuna grading.
        </p>
      </header>

      <section className="roster-section">
        <div className="roster-section__heading">
          <span className="roster-section__kicker">Introducing</span>
          <h2>Our Team</h2>
        </div>
        <div className="roster-cards">
          {teamMembers.map((m, i) => (
            <Reveal key={m.name} delay={i * 70}>
              <RosterCard member={m} index={i} />
            </Reveal>
          ))}
        </div>
      </section>

      <section className="advisers-section">
        <div className="team-section-title">
          <h2>Project Adviser</h2>
        </div>
        <div className="adviser-cards">
          {advisers.map((a, i) => (
            <Reveal key={a.name} delay={i * 80}>
              <div className="adviser-card">
                <div className="adviser-card__icon"><IconMedal /></div>
                <div>
                  <h3>{a.name}</h3>
                  <span className="adviser-card__title">{a.affiliation}</span>
                  {a.expertise && <p>{a.expertise}</p>}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <aside>
        <h2>Want to partner or deploy TunaEye at your port?</h2>
        <div className="site-actions">
          <button className="site-button site-button--primary" onClick={onOpen}>
            Start Grading <Arrow />
          </button>
          <button className="site-button site-button--secondary" onClick={() => onNavigate('faq')}>
            Read FAQ
          </button>
        </div>
      </aside>
    </main>
  )
}

/* ─── INNER PAGE — visual card layout ──────────────────────────────────── */
const innerPageMeta: Record<
  'features' | 'about' | 'faq' | 'terms' | 'privacy',
  {
    eyebrow: string
    title: string
    intro: string
    cards: [string, string][]
  }
> = {
  features: {
    eyebrow: 'Platform Features',
    title: 'Everything a connected tuna grading station needs.',
    intro:
      'Guided capture, edge CNN assist, expert review, receipts, and cloud sync — built to extend graders, not replace them.',
    cards: [
      ['Guided Kiosk Workflow', 'Large touch targets, high contrast, and responsive 16:10 tablet layouts built for wet port floors.'],
      ['Multi-Camera Capture', 'Seamless switching between device, USB, and virtual station cameras with live optical alignment rails.'],
      ['Raspberry Pi Edge Service', 'Sub-200ms local ONNX neural network inference with HTTP LAN health monitoring.'],
      ['Protected Expert Overrides', 'Requires administrator PIN authorization while preserving original AI model confidence scores in immutable logs.'],
      ['Dual-Cloud Records', 'Supabase PostgreSQL durable historical database combined with Convex real-time multi-station broadcast engine.'],
      ['Comprehensive Audit Visibility', 'Complete event log tracking grader login, scale inputs, inference results, overrides, settings changes, and sync events.'],
      ['Integrated Thermal Receipts', '80mm receipt generation with fish weight, grade, timestamp, QR verification code, and station ID.'],
      ['Offline-First Architecture', 'PWA service-worker caching with local IndexedDB storage ensures 100% station uptime during network drops.'],
    ],
  },
  about: {
    eyebrow: 'About TunaEye',
    title: 'Sea Beyond the Cut.',
    intro:
      'We don\'t replace the expert eye. We extend its reach. TunaEye is a CNN-based computer vision system that supports expert graders on sashibo core and tail-cut yellowfin images.',
    cards: [
      ['Our purpose', 'Bridge traditional grading and AI-assisted assessment. Automate the repetitive look — keep the expert in charge.'],
      ['Our method', 'Expert-annotated datasets, standardized image acquisition, and transfer learning that mirrors grader traits.'],
      ['Our limit', 'TunaEye is decision support. It does not claim to replace human expertise or commercial judgment.'],
    ],
  },
  faq: {
    eyebrow: 'Frequently Asked Questions',
    title: 'Answers for station operators and deployment teams.',
    intro: 'Detailed breakdown of TunaEye hardware boundaries, offline mechanics, and security controls.',
    cards: [
      ['Can TunaEye replace a trained grader?', 'No. We mirror expert traits and automate the repetitive look. Qualified graders still review, override, and own the decision.'],
      ['How does offline mode function?', 'The PWA and local IndexedDB store all sessions on the tablet. Inference runs on the local Pi LAN. Cloud sync uploads queued records once internet returns.'],
      ['How are multiple cuts handled per fish?', 'Graders can link both Sashibo Core and Tail Cut samples to the same fish ID, tracking individual images, weights, and grades under one master record.'],
      ['How is the tablet secured in kiosk mode?', 'The PWA manifest requests standalone fullscreen display. For full Android hardware button locking, managed kiosk / lock-task mode is recommended.'],
      ['Where is data stored long term?', 'Locally on the tablet first, then stored durably in Supabase PostgreSQL with raw photo object storage and Convex real-time dashboard sync.'],
      ['How are model updates deployed?', 'Station admins can check the Raspberry Pi health endpoint to inspect active model identifiers and update edge models without modifying the tablet kiosk.'],
    ],
  },
  terms: {
    eyebrow: 'Legal',
    title: 'Terms of Service',
    intro:
      'TunaEye provides decision-support tools for commercial seafood assessment. Operators remain responsible for fish association, sample quality, regulatory compliance, and purchasing agreements.',
    cards: [
      ['Authorized Use', 'Use TunaEye only with authorized stations, devices, grader credentials, and standard operating procedures.'],
      ['Human Responsibility', 'AI model output serves as decision support. Final commercial acceptance remains the sole responsibility of authorized personnel.'],
      ['Operational Integrity', 'Users must not tamper with captured evidence, bypass PIN security controls, or falsify station records.'],
    ],
  },
  privacy: {
    eyebrow: 'Legal',
    title: 'Privacy Policy',
    intro:
      'TunaEye processes grader identity, captured specimen photos, device metadata, grading decisions, and audit events strictly to operate and secure the service.',
    cards: [
      ['Data Purpose', 'Operate visual grading, station synchronization, system troubleshooting, audit logging, and commercial reporting.'],
      ['Data Access & Retention', 'Station records and cloud backups are restricted to authorized organization personnel with defined retention schedules.'],
      ['Image Security', 'Captured evidence photos are stored securely and associated exclusively with their corresponding station and fish IDs.'],
    ],
  },
}

function InnerPage({
  page,
  onNavigate,
  onOpen,
}: {
  page: Exclude<MarketingPage, 'home'>
  onNavigate: (page: MarketingPage) => void
  onOpen: () => void
}) {
  const content = innerPageMeta[page as keyof typeof innerPageMeta]
  if (!content) return null

  return (
    <main className="site-inner site-inner--visual">
      <Reveal>
        <header className="inner-hero">
          <span className="site-kicker">{content.eyebrow}</span>
          <h1>{content.title}</h1>
          <p>{content.intro}</p>
        </header>
      </Reveal>

      <section className="inner-cards">
        {content.cards.map(([title, copy], index) => (
          <Reveal key={title} delay={index * 60}>
            <article className="inner-card">
              <div className="inner-card__num">
                <span>{String(index + 1).padStart(2, '0')}</span>
              </div>
              <div className="inner-card__body">
                <h2>{title}</h2>
                <p>{copy}</p>
              </div>
            </article>
          </Reveal>
        ))}
      </section>

      <Reveal>
        <aside className="inner-cta">
          <h2>Ready to see TunaEye in action?</h2>
          <div className="site-actions">
            <button className="site-button site-button--primary" onClick={onOpen}>
              Start Grading <Arrow />
            </button>
            <button className="site-button" onClick={() => onNavigate('home')}>
              Back to Home
            </button>
          </div>
        </aside>
      </Reveal>
    </main>
  )
}
