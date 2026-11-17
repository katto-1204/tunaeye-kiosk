import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import landingSource from '../public/new-ui/landing-templates.json?raw'
import { loadPriceSchedule, peso, priceSnapshot } from './pricing'
import type { Grade } from './kioskState'
import './reference-landing.css'

export type MarketingPage = 'home' | 'features' | 'about' | 'team' | 'faq' | 'terms' | 'privacy'
type Cut = 's' | 't'
type Modal = 'demo' | 'changelog' | null
interface LandingTemplates {
  pages: Record<MarketingPage, string>
  nav: string
  footer: string
  criteria: Record<Cut, string>
  evidence: { title: string; description: string; image: string }[]
  changelog: [string, string, string[]][]
  demoImage: string
}
// Trusted static markup/SVG from the supplied design; none of its prototype scripts execute.
const templates = JSON.parse(landingSource) as LandingTemplates
const pageNames: MarketingPage[] = ['home', 'features', 'about', 'team', 'faq', 'terms', 'privacy']
const gradeNames: Record<Grade, string> = { A: 'Premium', B: 'Standard', C: 'Processing' }
const navMarkup = templates.nav.replace('<button class="btn b sm"', '<button class="landing-menu-toggle" type="button" data-act="menu" aria-label="Open navigation" aria-expanded="false">Menu</button><button class="btn b sm"')

export default function MarketingLanding({ page, onNavigate, onInstall, onOpen, onDemo }: { page: MarketingPage; onNavigate: (page: MarketingPage) => void; onInstall: () => void; onOpen: () => void; onDemo?: () => void }) {
  const root = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const [modal, setModal] = useState<Modal>(null)
  const [cut, setCut] = useState<Cut>('s')
  const [sample, setSample] = useState(0)
  const [priceGrade, setPriceGrade] = useState<Grade>('A')
  const [weight, setWeight] = useState('85')
  const hasDemo = Boolean(onDemo)
  const markup = useMemo(() => hasDemo && page === 'home' ? templates.pages[page].replace('<button class="btn g" data-go="features">Station Specs</button>', '<button class="btn g" data-go="features">Station Specs</button><button class="btn g" data-act="live-demo">Try full demo · no Pi</button>') : templates.pages[page], [page, hasDemo])

  useEffect(() => {
    setCut('s'); setSample(0); setModal(null); setPriceGrade('A'); setWeight('85')
    const element = root.current
    if (!element) return
    element.classList.remove('mobile-open')
    element.querySelector('.dd')?.classList.remove('open')
    element.querySelectorAll<HTMLButtonElement>('[data-go]').forEach(button => button.classList.toggle('on', button.dataset.go === page))
    element.querySelector('#ddb')?.classList.toggle('on', ['about', 'terms', 'privacy'].includes(page))
    element.querySelector('#ddb')?.setAttribute('aria-expanded', 'false')
    element.querySelector('[data-act="menu"]')?.setAttribute('aria-expanded', 'false')
    const reveals = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('in'); reveals.unobserve(entry.target) }
    }), { threshold: 0.12 })
    element.querySelectorAll('.rv').forEach(item => reveals.observe(item))
    const solidNav = () => { const nav = element.querySelector('.nav'); nav?.classList.toggle('solid', page !== 'home' || window.scrollY > window.innerHeight - 120); nav?.classList.toggle('small', window.scrollY > 60) }
    solidNav()
    window.addEventListener('scroll', solidNav, { passive: true })
    let phoneIndex = 0
    const screens = element.querySelectorAll('#pscr .sc')
    const interval = window.setInterval(() => {
      if (document.hidden || !screens.length) return
      screens[phoneIndex].classList.remove('on'); phoneIndex = (phoneIndex + 1) % screens.length; screens[phoneIndex].classList.add('on')
    }, 2000)
    return () => { reveals.disconnect(); window.clearInterval(interval); window.removeEventListener('scroll', solidNav) }
  }, [page])

  useEffect(() => {
    const element = root.current, panel = element?.querySelector('#crit')
    if (panel) panel.innerHTML = templates.criteria[cut]
    element?.querySelectorAll('[data-tab]').forEach(button => button.setAttribute('aria-selected', String(button.getAttribute('data-tab') === cut)))
  }, [cut, page])

  useEffect(() => {
    const element = root.current, evidence = templates.evidence[sample]
    const title = element?.querySelector('#evt'), description = element?.querySelector('#evp'), image = element?.querySelector<HTMLImageElement>('#evi'), counter = element?.querySelector('#evc')
    if (title) title.textContent = evidence.title
    if (description) description.textContent = evidence.description
    if (image) { image.src = evidence.image; image.alt = evidence.title }
    if (counter) counter.textContent = `${sample + 1} / ${templates.evidence.length}`
  }, [sample, page])

  useEffect(() => {
    const element = root.current, kilograms = Number(weight), valid = weight.trim() !== '' && Number.isFinite(kilograms) && kilograms >= 0 && kilograms <= 200
    const total = element?.querySelector('#pct'), detail = element?.querySelector('#pcs')
    if (total) total.textContent = valid ? peso(priceSnapshot(priceGrade, weight).amount) : '—'
    if (detail) detail.textContent = valid ? `${kilograms} kg × ${peso(loadPriceSchedule()[priceGrade])} · ${gradeNames[priceGrade]}` : 'Enter a weight from 0 to 200 kg'
    element?.querySelectorAll<HTMLButtonElement>('[data-pg]').forEach(button => { const selected = button.dataset.pg === priceGrade; button.classList.toggle('on', selected); button.setAttribute('aria-pressed', String(selected)) })
    const thumb = element?.querySelector<HTMLElement>('#pth')
    if (thumb) thumb.style.transform = `translateX(${'ABC'.indexOf(priceGrade) * 100}%)`
  }, [priceGrade, weight, page])

  useEffect(() => {
    if (!modal) return
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null, overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    modalRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setModal(null) }
      if (event.key !== 'Tab') return
      const items = modalRef.current?.querySelectorAll<HTMLElement>('button,a[href],input,[tabindex="0"]')
      if (!items?.length) return
      const first = items[0], last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', keydown)
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keydown); previousFocus?.focus() }
  }, [modal])

  const click = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target instanceof Element ? event.target : null, element = root.current
    if (!target || !element) return
    if (target.closest('#ddb')) { const open = element.querySelector('.dd')?.classList.toggle('open'); element.querySelector('#ddb')?.setAttribute('aria-expanded', String(Boolean(open))); return }
    element.querySelector('.dd')?.classList.remove('open'); element.querySelector('#ddb')?.setAttribute('aria-expanded', 'false')
    const button = target.closest<HTMLElement>('[data-go],[data-act],[data-tab],[data-ev],[data-pg],[data-scroll]')
    if (!button) return
    const { go, act, tab, ev, pg, scroll } = button.dataset
    if (go && pageNames.includes(go as MarketingPage)) { onNavigate(go as MarketingPage); window.scrollTo({ top: 0, behavior: 'smooth' }) }
    else if (act === 'start') onOpen()
    else if (act === 'install') onInstall()
    else if (act === 'live-demo') onDemo?.()
    else if (act === 'demo') setModal('demo')
    else if (act === 'log') setModal('changelog')
    else if (act === 'menu') { const open = element.classList.toggle('mobile-open'); button.setAttribute('aria-expanded', String(open)); button.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation') }
    else if (tab === 's' || tab === 't') setCut(tab)
    else if (ev) setSample(value => (value + Number(ev) + templates.evidence.length) % templates.evidence.length)
    else if (pg === 'A' || pg === 'B' || pg === 'C') setPriceGrade(pg)
    else if (scroll) element.querySelector(`#${scroll}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
  const tilt = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const stage = (event.target as Element).closest<HTMLElement>('.stage'), logo = stage?.querySelector<HTMLElement>('.logo')
    if (!stage || !logo) { const restingLogo = root.current?.querySelector<HTMLElement>('.logo'); if (restingLogo) restingLogo.style.transform = ''; return }
    const box = stage.getBoundingClientRect()
    logo.style.transform = `rotateY(${((event.clientX - box.left) / box.width - .5) * 22}deg) rotateX(${((event.clientY - box.top) / box.height - .5) * -22}deg) scale(1.04)`
  }
  return <div className="reference-landing" ref={root} onClick={click} onSubmit={event => event.preventDefault()} onPointerMove={tilt} onPointerLeave={() => { const logo = root.current?.querySelector<HTMLElement>('.logo'); if (logo) logo.style.transform = '' }} onInput={event => { const input = event.target; if (input instanceof HTMLInputElement && input.id === 'pcw') setWeight(input.value) }}>
    <div dangerouslySetInnerHTML={{ __html: navMarkup }} />
    <main id="reference-main" dangerouslySetInnerHTML={{ __html: markup }} />
    <footer id="reference-footer" dangerouslySetInnerHTML={{ __html: templates.footer }} />
    <button type="button" className="cl" data-act="log" title="View Changelog"><b>v0.9.0</b>What’s new ✨</button>
    {modal && <div className="mo show" onClick={event => { if (event.target === event.currentTarget) setModal(null) }}><div className={`mb${modal === 'demo' ? ' big' : ''}`} ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="landing-modal-title">
      <button type="button" className="x" aria-label={modal === 'demo' ? 'Close demo video' : 'Close changelog'} onClick={() => setModal(null)}>×</button>
      {modal === 'changelog' ? <><span className="chip">What’s New</span><h3 id="landing-modal-title">Version History</h3>{templates.changelog.map(([version, date, items]) => <div className="ver" key={version}><b>{version}</b><span>{date}</span><ul>{items.map(item => <li key={item}>{item}</li>)}</ul></div>)}</> : <><h3 id="landing-modal-title">TunaEye demo video</h3><p>A preview of the station experience.</p><div className="lap landing-demo-preview"><div className="scr"><div className="ui"><div className="top"><span>04 · Capture</span><span>Station 01</span></div><div className="cam"><img src={templates.demoImage} alt="Tail-cut specimen preview" /></div><div className="bar"><i /></div></div></div><div className="base" /></div>{onDemo && <button type="button" className="btn b" onClick={onDemo}>Try full demo · no Pi</button>}</>}
    </div></div>}
  </div>
}
