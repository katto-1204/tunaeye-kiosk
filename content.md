# TunaEye public website: content and structure archive

Snapshot: 2026-11-17. This is a source-based archive of the current public website for a possible redesign, supplemented by local browser checks described in section 13. It includes the home landing page, shared navigation/footer, linked public pages, modal content, inactive tabs, and carousel slides. Quoted copy below preserves the wording in the source; JSX entities and typographic punctuation are rendered as normal text. Layout specifications come from the local source rather than a deployed-site audit.

No application logic, UI, assets, routes, or grading behavior was changed to create this document. The newly supplied V2 grading workflow is documented separately in `context.md`; it has not been substituted for the current website copy.

## 1. Sources and page composition

| Source | Responsibility |
| --- | --- |
| `index.html` | Document title, metadata, fonts, PWA links, React root; it does not contain the landing page markup. |
| `src/main.tsx` | Mounts `App`; imports `styles.css`, `product.css`, then `site.css`. |
| `src/App.tsx` | Public/kiosk entry conditions, URL-to-page mapping, browser history, install handler, kiosk opening callback. |
| `src/MarketingLanding.tsx` | All public page copy, shared shell, home sections, navigation, team, legal pages, FAQ, changelog. |
| `src/site.css` | Public website layout, color, typography, animation, responsive styling. |
| `src/components/TunaEyeHeroLogo.tsx` | Animated/parallax hero logo illustration. |
| `src/components/ui/hero-video-dialog.tsx` | Demo dialog and play icon. |
| `src/components/ui/macbook-pro.tsx`, `iphone-16-pro.tsx` | SVG laptop and phone frames around screenshot images. |
| `public/manifest.webmanifest`, `public/sw.js` | Install metadata and offline caching. |

`MarketingLanding` receives `page`, `onNavigate`, `onInstall`, and `onOpen`. Its structure is `site-shell` → sticky navigation → selected page main content → shared footer → fixed changelog trigger → optional changelog modal. Navigation updates React state and browser history, then scrolls to the top smoothly.

Public page paths: `/`, `/features`, `/about`, `/team`, `/faq`, `/terms`, `/privacy`. This is custom state/history routing, not React Router. Public rendering also depends on installed state, intro dismissal, and the kiosk session being on its welcome screen (`src/App.tsx`). “Start Grading” dismisses the public intro and reveals the kiosk welcome UI; it does not itself run inference.

## 2. Document metadata and install identity

From `index.html`:

- Browser title: “TunaEye Kiosk”.
- Description: “TunaEye yellowfin tuna visual grading kiosk”.
- Language: `en`; UTF-8; viewport includes `viewport-fit=cover`.
- Theme color: `#2563EB`.
- Mobile web app capable: yes; Apple web app capable: yes; Apple status bar: `black-translucent`.
- Manifest: `/manifest.webmanifest`; favicon: `/tunaeye-logo.svg`; Apple icon: `/tunaeye-192.png`.
- Preloaded local OpenRunde Regular, Medium, Semibold, and Bold fonts.

Manifest identity: “TunaEye Grading Kiosk”; short name “TunaEye”; start URL, ID, and scope `/`; fullscreen display with standalone fallback; landscape orientation; background `#f4f7fb`; theme `#2563eb`; 192px/512px icons and 512px maskable icon.

## 3. Shared navigation

Source: `src/MarketingLanding.tsx:9-19`, `:222-260`, `:316-340`.

Brand: SVG mark plus “TunaEye”; “Eye” is separately colored. The brand is a span, not a home link.

| Visible item | Destination/behavior |
| --- | --- |
| Home | `/` |
| Features | `/features` |
| About TunaEye ▾ | Opens a dropdown; the parent button toggles it. |
| Dropdown: About TunaEye | `/about` |
| Dropdown: Terms & Conditions | `/terms` |
| Dropdown: Privacy Policy | `/privacy` |
| Team | `/team` |
| FAQ | `/faq` |
| Install kiosk app | Calls the shared PWA install handler. |

Active page buttons receive `is-active`; About's parent is active for any of its child pages. The dropdown closes after choosing an item or clicking outside. On viewports ≤980px the central navigation is hidden; the logo and install button remain. There is no replacement mobile menu in this component.

## 4. Home page: exact order and content

Source: `Home` in `src/MarketingLanding.tsx:383-897`.

### 4.1 Hero — `.site-hero`

Two-column introductory section: copy left, animated TunaEye visual right, full-width workflow band below. Decorative mesh/gradient behind both.

- Kicker: “Expert grading, extended”.
- H1, intentional line break: “Sea” / “Beyond the Cut.”
- Quote: “We don't replace the expert eye. We extend its reach.”
- Support: “Built on expert knowledge. Enhanced by computer vision.”
- Primary CTA: “Start Grading” → `onOpen` (kiosk welcome).
- Secondary CTA: “Station Specs” → `/features`.
- Workflow band, separated by decorative dots: “01. Capture Specimen”; “02. Edge Neural Infer”; “03. Review & Override”; “04. Receipt & Cloud Sync”.
- Illustration source: `/assets/tunaEyeLoadingScreen.png`; alt: “TunaEye grading station interface”.

### 4.2 Demo — `.site-demo-video`

Copy left; MacBook Pro screenshot/mockup with play overlay right. On narrower screens, visual moves before copy.

- Kicker: “See TunaEye in Action”.
- H2: “From cut to grade — in one pass”.
- Body: “Watch experts' visual traits become a guided capture, CNN assist, and reviewable record.”
- CTA: “View Demo” → demo modal.
- Image/mockup source: `/image.png`.
- Mockup accessible label: “TunaEye workflow demo on a MacBook Pro”.
- Overlay label: “Open interactive demo”.
- Play overlay accessible label: “View TunaEye demo”.

Both demo triggers open `HeroVideoDialog`, which currently embeds `/image.png` in an iframe. This is an image preview, despite the demo/video terminology; it is not currently wired to either MP4 project in the repository. Dialog/iframe title: “TunaEye demo video”. Close control: “Close demo video”; closes via button, Escape, or backdrop. Uses a portal into `document.body` and fade/scale animation.

### 4.3 Mobile experience and installation — `.site-mobile-experience#download-app`

Two-column section: phone preview and QR on the left; install guide on the right.

- Phone accessible label: “TunaEye mobile app screen preview”.
- QR heading: “Scan to install”.
- QR image: `/assets/mobile app qr.png` (URL encoded at runtime); alt: “QR code to install the TunaEye mobile app”; declared dimensions 220×220.
- QR helper: “Point your camera at the code”.
- Kicker: “Getting Started”.
- H3: “Install the station app. Keep the expert in charge.”
- Body: “Scan the QR, install the PWA, connect the Pi, then grade. Offline capture still works.”

| Step | Title | Exact body |
| --- | --- | --- |
| 1 | Install | Scan the QR or open TunaEye in Chrome, Safari, or Edge, then choose Install App. |
| 2 | Launch | Open the home-screen icon for the standalone kiosk. |
| 3 | Connect the Pi | Link the station to the local edge CNN for on-LAN inference. |
| 4 | Grade | Name, cut type, capture — then review the assist before you accept. |

Phone screenshots preload and rotate automatically every 2 seconds, starting with the first image. There are no manual phone carousel controls:

1. `/app-screens/0f28951a-c673-402e-95af-ec54cb2299b4.jpg`
2. `/app-screens/9c1a96f6-ddce-40d8-a350-48a485826270.jpg`
3. `/app-screens/486c94d0-543c-4243-bd0c-5f5f1293ad2d.jpg`
4. `/app-screens/b87bd4a0-8c8e-4e16-94da-84dc49b9986f.jpg`
5. `/app-screens/c5ba90a3-7dfd-46bb-b1fc-58213f53544c.jpg`

The QR is an existing raster image, not generated from a link in this component. Its encoded destination was not decoded in this source audit.

### 4.4 Value proposition — `.site-story`

Two columns: heading left; two paragraphs and link right.

- Kicker: “Why TunaEye Matters”.
- H2: “Close the gap. Do not replace the grader.”
- Paragraph 1: “TunaEye is a CNN trained on expert-annotated sashibo core and tail-cut images. It mirrors the traits graders already look for so the assist is familiar, not foreign.”
- Paragraph 2: “Standardized capture and transfer learning make quality assessment more consistent and accessible. The expert still decides.”
- Link: “Read our engineering approach” → `/about`.

### 4.5 Hardware — `.site-hardware#hardware`

Centered introductory heading followed by four icon cards with small capability pills.

- Kicker: “Station Architecture”.
- H2: “Rugged hardware engineered for the port floor.”
- Body: “TunaEye connects off-the-shelf industrial components into a seamless, splash-resistant grading station.”

| Card heading (line breaks flattened) | Pills | Illustration |
| --- | --- | --- |
| Raspberry Pi Edge Server | <200ms; LAN only; Offline AI | Inline brain/chip SVG |
| 5000K CRI 98+ Diffuse Chamber | Daylight; Anti-glare; Calibrated | Inline light SVG |
| 10.1″ IP65 Touch Tablet | Splash-safe; PWA; Offline | Inline tablet SVG |
| Scale & Thermal Printer | 200kg max; 80mm; QR code | Inline scale SVG |

### 4.6 Criteria and grades — `.site-criteria`

Centered introduction, two cut-selection buttons, one conditional two-column panel, then four grade cards. Default selected cut: Sashibo.

- Kicker: “Anatomical Grading Criteria”.
- H2: “Standardized quality metrics for Sashibo & Tail Cut samples.”
- Body: “TunaEye evaluates the primary anatomical sample cuts used in commercial yellowfin sashimi grading.”
- Buttons: “Sashibo Core Sample Analysis”; “Tail Cut Cross-Section Analysis”. Clicking replaces the panel; it does not invoke grading.

**Sashibo panel**

- H3: “Sashibo Core Evaluation Metrics”.
- Intro: “Extracted using a specialized sashibo probe from the core flesh near the dorsal fin, this sample provides a direct look into internal muscle quality.”
- “Flesh Translucency & Oil Content”: “Measures light transmission and lipid dispersion across the core specimen, indicating high fat content prized in Grade A sashimi.”
- “Myoglobin Color Saturation”: “Detects deep cherry-red hue versus brown oxidation or darkening caused by post-capture stress or thermal spike.”
- “Core Structural Integrity”: “Ensures the core sample retains firmness without gaping, mushiness, or parasitic muscle breakdown.”
- Image: `/assets/sashiboCoreFull.png`; alt: “Sashibo core sample breakdown”.
- Caption: “Center-Cut Core Evidence”.

**Tail Cut panel**

- H3: “Tail Cut Cross-Section Metrics”.
- Intro: “Harvested at the caudal peduncle, the tail cut exposes the muscle cross-section for rapid visual assessment of firmness and muscle density.”
- “Muscle Grain Density & Tightness”: “Evaluates muscle fiber compactness. Tight, dense grain indicates strong muscle retention and superior shelf life.”
- “Oxidation & Color Saturation”: “Detects edge browning and metmyoglobin formation along the outer fat ring and central muscle mass.”
- “Drip Loss & Surface Moisture”: “Quantifies excessive surface water exudation resulting from cellular rupture during improper chilling.”
- Image: `/assets/tailCutFull.png`; alt: “Tail cut sample breakdown”.
- Caption: “Caudal Peduncle Cross-Section”.

**Grade cards**

| Badge | Heading | Exact body |
| --- | --- | --- |
| Grade A | Export Sashimi Grade | Deep translucent red, high fat content, zero oxidation, firm core texture. Highest commercial value. |
| Grade B+ | Premium Fresh Grade | Strong red color saturation, slight fat dispersion, firm muscle grain. Excellent fresh market suitability. |
| Grade B | Standard Fresh Grade | Moderate red color, minor surface oxidation acceptable, suitable for domestic retail and grilling. |
| Grade C | Processing / Canning Grade | Dark/brown oxidation, soft texture or high drip loss. Allocated for cooked processing or canning. |

These are archived marketing descriptions, not a verified specification of model outputs or directly measured traits.

### 4.7 Workflow — `.site-workflow.site-workflow--picto`

- Kicker: “Station Workflow”.
- H2: “Six steps. One traceable record.”
- Six numbered pictograms: “01” / “Grader Auth”; “02” / “Select Cut”; “03” / “Weigh Fish”; “04” / “Capture”; “05” / “Edge AI”; “06” / “Print & Sync”.
- SVG pictograms: authentication/person, cut, scale, chamber/camera, inference chip, receipt. Connectors are decorative arrows.

Source caveat: `src/site.css:1908` declares `.site-workflow--picto > div { display: none; }`, which also matches the actual `.picto-pipeline` direct child. A local desktop Playwright check confirmed the pipeline is hidden. This archive preserves all six steps from the source without changing that rule.

### 4.8 Evidence carousel — `.site-showcase`

Two columns: kicker/title/body and controls left; framed sample image right.

- Kicker: “Traceable Evidence”.
- Image heading/caption: “Captured sample evidence”.
- Previous/next controls: “←” / “→”; accessible labels: “Previous sample” / “Next sample”.
- Counter: `1 / 2` or `2 / 2`.
- Starts on Sashibo. Controls wrap between two entries; there is no auto-advance timer.

| Slide/title (also image alt) | Image | Exact body |
| --- | --- | --- |
| Sashibo Core Sample | `/assets/sashiboCoreFull.png` | Center-cut core sample providing evidence of translucency, fat/oil distribution, core structural integrity, and myoglobin oxidation. |
| Tail Cut Cross-Section | `/assets/tailCutFull.png` | Cross-sectional tail muscle sample revealing muscle grain density, color saturation, drip loss, and post-mortem firmness. |

### 4.9 Metrics — `.site-metrics`

Four articles in one desktop row:

| Value | Label |
| --- | --- |
| < 200ms | Edge inference speed |
| 200 kg | Maximum fish weight cap |
| 1:1 | Fish-to-evidence traceability |
| 100% | Offline kiosk availability |

These are fixed copy, not live telemetry or benchmark results.

### 4.10 Infrastructure — `.site-architecture`

- Kicker: “Resilient Infrastructure”.
- H2: “Local edge speed. Cloud transparency.”
- Body: “The kiosk tablet handles operator interactions and offline IndexedDB queueing. The Raspberry Pi performs zero-latency AI inference on station LAN. Supabase PostgreSQL serves as the durable system of record, while Convex broadcasts live updates across all admin consoles.”
- Link: “Explore full feature breakdown” → `/features`.
- Three-step illustrated flow: “01” / “Tablet Kiosk” / “Capture, weigh & review”; “02” / “Raspberry Pi” / “Edge AI model inference”; “03” / “Supabase + Convex” / “Durable records & live sync”.

### 4.11 FAQ preview — `.site-faq-preview`

- Kicker: “Deployment FAQ”.
- H2: “Frequently asked questions before deployment.”
- Native `details` elements; the first is initially open, the remaining three initially closed. Each can expand independently.

| Question | Exact answer |
| --- | --- |
| Who uses the TunaEye station? | Fish ports, buying stations, commercial seafood processors, trained quality graders, and export inspection officers. |
| Does the kiosk work during internet outages? | Yes. The kiosk shell, camera capture, local weight entry, Raspberry Pi edge inference, thermal printing, and audit logging operate 100% offline. Cloud synchronization resumes automatically when connectivity is restored. |
| How are expert overrides handled and audited? | If a grader disagrees with the AI model confidence score, an expert override can be entered. Overrides require the Station Admin PIN and record the reason, preserving both the original AI output and the grader override for audit purposes. |
| Which cameras and scales are supported? | TunaEye supports device cameras, USB industrial cameras, and webcams via standard WebRTC, along with serial/Bluetooth digital weighing scales up to 200kg. |

- Link: “View all questions & answers” → `/faq`.

### 4.12 Final CTA — `.site-cta`

Centered closing block:

- Kicker: “Ready for the Grading Floor?”.
- H2: “Turn every yellowfin tuna sample into clear, connected evidence.”
- Body: “Start grading now or explore the full platform capabilities in your browser.”
- Primary: “Start Grading” → `onOpen`.
- Secondary: “Explore Features” → `/features`.

## 5. Shared footer

Source: `src/MarketingLanding.tsx:350-370`.

Two large desktop panels: brand/mission panel left; four link columns with newsletter beneath right.

- Brand: “TunaEye”.
- Statement: “We extend the expert eye.”
- Description: “CNN assist for sashibo and tail-cut yellowfin grading.”
- Social symbols: “X”, “in”, “f”, “◎”. These are spans, not working external social links.
- Copyright: “© 2026 TunaEye Systems. All rights reserved.”

| Column | Label → destination/behavior |
| --- | --- |
| Product | Features → `/features`; Workflow → `/` and scroll to page top (not a workflow anchor); Install app → PWA install handler. |
| Resources | Help → `/faq`; FAQ → `/faq`; Changelog → opens version modal. |
| Company | About → `/about`; Team → `/team`; Contact → `mailto:hello@tunaeye.app`. |
| Legal | Terms → `/terms`; Privacy → `/privacy`; location text “General Santos City”. |
| Newsletter | Hidden label “Email address”; email placeholder “Enter your email”; submit “Submit”. |

Newsletter submit only calls `preventDefault()`. There is no subscription API, persistence, success state, or mailing-list integration here.

## 6. Fixed changelog and modal

Source: `src/MarketingLanding.tsx:29-34`, `:264-295`, `:372-378`.

Fixed trigger: “v0.9.0”, “What's new”, sparkle “✨”; title “View Changelog”. Available across public pages. Footer “Changelog” opens the same modal. Dialog accessible label: “Changelog”; kicker: “What's New”; heading: “Version History”; close accessible label: “Close changelog”; visible close “×”. Clicking the backdrop also closes it.

| Version/date | Exact bullet items |
| --- | --- |
| v0.9.0 / Oct 2026 | Initial kiosk workflow with guided capture; Raspberry Pi edge inference integration; Dual-cloud sync (Supabase + Convex); Admin dashboard with audit logging |
| v0.8.0 / Sep 2026 | Multi-camera support with live preview; Thermal receipt printing (80mm); Expert override with PIN protection |
| v0.7.0 / Aug 2026 | Offline-first PWA architecture; Bluetooth weighing scale integration; Sample association (same-fish / different-fish) |
| v0.6.0 / Jul 2026 | 5000K CRI 98+ lighting chamber design; Sashibo core and tail cut grading criteria; Grade A/B/C classification model training |

These are hardcoded release notes, not generated from Git history or installed model metadata.

## 7. Linked public pages: complete copy

Source: `innerPageMeta` and `InnerPage`, `src/MarketingLanding.tsx:1038-1165`. Features, About, FAQ, Terms, and Privacy share an intro hero, numbered content cards (`01`, `02`, etc.), and closing CTA. They reuse the same public navigation/footer/changelog.

### 7.1 Features — `/features`

- Eyebrow: “Platform Features”.
- H1: “Everything a connected tuna grading station needs.”
- Intro: “Guided capture, edge CNN assist, expert review, receipts, and cloud sync — built to extend graders, not replace them.”

| Card | Exact body |
| --- | --- |
| Guided Kiosk Workflow | Large touch targets, high contrast, and responsive 16:10 tablet layouts built for wet port floors. |
| Multi-Camera Capture | Seamless switching between device, USB, and virtual station cameras with live optical alignment rails. |
| Raspberry Pi Edge Service | Sub-200ms local ONNX neural network inference with HTTP LAN health monitoring. |
| Protected Expert Overrides | Requires administrator PIN authorization while preserving original AI model confidence scores in immutable logs. |
| Dual-Cloud Records | Supabase PostgreSQL durable historical database combined with Convex real-time multi-station broadcast engine. |
| Comprehensive Audit Visibility | Complete event log tracking grader login, scale inputs, inference results, overrides, settings changes, and sync events. |
| Integrated Thermal Receipts | 80mm receipt generation with fish weight, grade, timestamp, QR verification code, and station ID. |
| Offline-First Architecture | PWA service-worker caching with local IndexedDB storage ensures 100% station uptime during network drops. |

### 7.2 About — `/about`

- Eyebrow: “About TunaEye”.
- H1: “Sea Beyond the Cut.”
- Intro: “We don't replace the expert eye. We extend its reach. TunaEye is a CNN-based computer vision system that supports expert graders on sashibo core and tail-cut yellowfin images.”

| Card | Exact body |
| --- | --- |
| Our purpose | Bridge traditional grading and AI-assisted assessment. Automate the repetitive look — keep the expert in charge. |
| Our method | Expert-annotated datasets, standardized image acquisition, and transfer learning that mirrors grader traits. |
| Our limit | TunaEye is decision support. It does not claim to replace human expertise or commercial judgment. |

### 7.3 FAQ — `/faq`

- Eyebrow: “Frequently Asked Questions”.
- H1: “Answers for station operators and deployment teams.”
- Intro: “Detailed breakdown of TunaEye hardware boundaries, offline mechanics, and security controls.”
- This page uses numbered cards, not collapsible accordions.

| Question | Exact answer |
| --- | --- |
| Can TunaEye replace a trained grader? | No. We mirror expert traits and automate the repetitive look. Qualified graders still review, override, and own the decision. |
| How does offline mode function? | The PWA and local IndexedDB store all sessions on the tablet. Inference runs on the local Pi LAN. Cloud sync uploads queued records once internet returns. |
| How are multiple cuts handled per fish? | Graders can link both Sashibo Core and Tail Cut samples to the same fish ID, tracking individual images, weights, and grades under one master record. |
| How is the tablet secured in kiosk mode? | The PWA manifest requests standalone fullscreen display. For full Android hardware button locking, managed kiosk / lock-task mode is recommended. |
| Where is data stored long term? | Locally on the tablet first, then stored durably in Supabase PostgreSQL with raw photo object storage and Convex real-time dashboard sync. |
| How are model updates deployed? | Station admins can check the Raspberry Pi health endpoint to inspect active model identifiers and update edge models without modifying the tablet kiosk. |

### 7.4 Terms — `/terms`

- Navigation dropdown calls this “Terms & Conditions”; page heading uses “Terms of Service”.
- Eyebrow: “Legal”.
- H1: “Terms of Service”.
- Intro: “TunaEye provides decision-support tools for commercial seafood assessment. Operators remain responsible for fish association, sample quality, regulatory compliance, and purchasing agreements.”

| Card | Exact body |
| --- | --- |
| Authorized Use | Use TunaEye only with authorized stations, devices, grader credentials, and standard operating procedures. |
| Human Responsibility | AI model output serves as decision support. Final commercial acceptance remains the sole responsibility of authorized personnel. |
| Operational Integrity | Users must not tamper with captured evidence, bypass PIN security controls, or falsify station records. |

### 7.5 Privacy — `/privacy`

- Eyebrow: “Legal”.
- H1: “Privacy Policy”.
- Intro: “TunaEye processes grader identity, captured specimen photos, device metadata, grading decisions, and audit events strictly to operate and secure the service.”

| Card | Exact body |
| --- | --- |
| Data Purpose | Operate visual grading, station synchronization, system troubleshooting, audit logging, and commercial reporting. |
| Data Access & Retention | Station records and cloud backups are restricted to authorized organization personnel with defined retention schedules. |
| Image Security | Captured evidence photos are stored securely and associated exclusively with their corresponding station and fish IDs. |

### 7.6 Shared inner-page CTA

Features, About, FAQ, Terms, Privacy end with:

- H2: “Ready to see TunaEye in action?”.
- Primary: “Start Grading” → `onOpen`.
- Secondary: “Back to Home” → `/`.

### 7.7 Team — `/team`

Source: `src/MarketingLanding.tsx:899-1036`. Separate team layout.

- Header kicker: “The People Behind TunaEye”.
- H1: “Engineered for precision. Built for real ports.”
- Intro: “Meet the multidisciplinary team of engineers, researchers, and fisheries experts dedicated to digitizing yellowfin tuna grading.”
- Roster kicker: “Introducing”.
- Roster H2: “Our Team”.

| Tag | Name | Role | Bio | Referenced photo |
| --- | --- | --- | --- | --- |
| P1 | ARNADO, Catherine C. | Project Lead & Full Stack Architect, AI & Computer Vision Lead | Leads system architecture, dual-cloud sync, PWA development, and port kiosk integrations. | `/assets/team/arnado.jpg` |
| P2 | PALMA, Xander | Hardware & Embedded Systems | Designs camera enclosures, 5000K CRI 98+ lighting chambers, Raspberry Pi peripherals, and thermal printers. | `/assets/team/palma.jpg` |
| P3 | ABING, Eliza Marie | Documentation & Quality & Field Operations Specialist | Keeps project documentation, QA checklists, and field deployment notes aligned with how the station is actually used. | `/assets/team/abing.jpg` |
| P4 | SALAZAR, Joey | Mobile App Developer, QA Lead | Builds the companion mobile app and leads quality assurance across the kiosk and mobile surfaces. | `/assets/team/salazar.jpg` |

Roster cards are buttons. Hover/focus expands the bio; mouse leave/blur collapses it; click toggles it. Expanded state is exposed through `aria-expanded`. Photos use lazy loading and the member name as alt text; image load failure replaces the photo with an inline person icon. At this snapshot, the referenced four JPGs are absent from `public/assets/team/`; that directory contains `README.md` only.

- Adviser section heading: “Project Adviser”.
- Adviser name: “Dr. Owen B. Pilongo, DBM-IS”.
- Displayed affiliation: “CET Chairperson, BSIT Program Head”.
- Adviser data also stores title “Project Adviser”, but the card renders affiliation rather than this title; expertise is empty and does not render.
- Closing H2: “Want to partner or deploy TunaEye at your port?”.
- Buttons: “Start Grading” → `onOpen`; “Read FAQ” → `/faq`.

## 8. Install CTA behavior and conditional copy

Source: `installApp` in `src/App.tsx`. Header and footer install actions use the same handler; phone QR is a separate existing image.

If already installed or an install attempt is in progress, the handler returns. If no browser install prompt is available, it sets a notice containing:

- Title: “Install TunaEye Kiosk”.
- Message: “To install TunaEye Kiosk on your device, open your browser menu (⋮ or Share) and select "Install app" or "Add to Home Screen".”
- Items: “Runs in dedicated standalone kiosk mode without browser address bars”; “Enables instant offline access even without an active internet connection”; “Fast launch from your home screen or desktop launcher”.

If a deferred browser install prompt exists, the handler invokes it. Acceptance sets installed state, persists `tunaeye-installed=true`, and audits “App installed” / “TunaEye kiosk installed on this device”. Dismissal sets title “Installation cancelled” and message “TunaEye was not installed. You can try again whenever you are ready.” Failure sets title “Installation unavailable” and message “The browser could not start installation. Use the browser menu and choose Install app or Add to Home Screen.”

Rendering caveat: the public branch returns `ProductLanding` directly; the app-level `noticeModal` UI is rendered later in the kiosk shell. A local desktop Playwright check clicked “Install kiosk app” without an available install prompt and confirmed no dialog appeared while public content remained active. This archive records the handler's content and the conditional rendering boundary without altering it. Native browser installation was not tested.

## 9. Asset inventory used by the public website

| Asset | Placement | Snapshot status |
| --- | --- | --- |
| `public/tunaeye-logo.svg` | Header/footer mark, favicon | Present |
| `public/assets/tunaEyeLoadingScreen.png` | Animated hero central image | Present |
| `public/image.png` | Laptop screenshot and iframe demo target | Present; static image |
| `public/assets/mobile app qr.png` | Install QR | Present; encoded target not decoded |
| Five `public/app-screens/*.jpg` paths listed above | Phone carousel | Present |
| `public/assets/sashiboCoreFull.png` | Criteria and evidence carousel | Present |
| `public/assets/tailCutFull.png` | Criteria and evidence carousel | Present |
| `public/assets/team/{arnado,palma,abing,salazar}.jpg` | Team portrait references | Missing; icon fallback exists |
| `public/fonts/OpenRunde-{Regular,Medium,Semibold,Bold}.woff2` | Local typography | Present |
| `public/tunaeye-192.png`, `tunaeye-512.png` | PWA/app icons | Present |

Inline SVGs supply icons, arrows, pictograms, device mockup frames, hero target rings, and adviser/person fallback art. `public/assets/tunaeyebackground.png`, tutorial step images, `public/DEMO_SAMPLES/*`, and the separate film/demo project MP4s are not referenced by `MarketingLanding` as landing content.

## 10. Design and responsive structure

Source: `src/site.css`; shared global CSS may also affect defaults. This records the current design rather than prescribing the redesign.

- Font: local “Open Runde”, then system sans-serif. Large tightly spaced headings; uppercase kickers with 0.12em tracking. Main hero heading uses `clamp(54px, 6.5vw, 92px)`, 0.92 line height, −0.07em tracking; ≤620px uses 46px. Section headings generally use `clamp(38px, 4.5vw, 68px)`.
- Palette: light `#f5f8fc` shell; white/pale blue alternating sections; navy `#08266F`; blue `#176BFF` and `#0B45E5`; muted body `#526a85`. Footer is black with blue brand panel. These are actual public CSS values, distinct from some kiosk theme tokens.
- Header: sticky floating pill, top 16px, max-width 1100px, height 64px, rounded 9999px, translucent white with blur/shadow. At ≤980px height 58px and nav hidden; ≤620px top 10px and height 56px.
- Hero: grid `1.05fr 0.95fr`; min-height `calc(100dvh - 80px)`; deliberate negative top margin beneath floating header; blue gradient/mesh; illustration minimum height 480px. ≤980px becomes one column with 380px visual minimum; ≤620px visual minimum 300px.
- Main CTA buttons: minimum 56px tall, pill borders, primary blue gradient, hover lift/shadow. Text links are unboxed blue buttons.
- Demo/install: equal two-column grid, fluid 80–130px vertical padding and 28–120px side padding. ≤980px becomes one column and demo visual appears first; ≤620px uses 64px/20px padding with 38px gap. Phone/QR become vertically stacked at ≤620px.
- Story/infrastructure: equal two-column grids with fluid large spacing; evidence is also two columns. These and the criteria panel collapse at ≤980px.
- Hardware and grade grids: four desktop columns, two at ≤1100px, one at ≤620px. White rounded cards and blue pill labels; grade badges use green/blue/amber/red colors for A/B+/B/C.
- Criteria: centered pill buttons; rounded pale-blue panel; text/image split with 50px gap; image sits on a white rounded plate, max-height 280px.
- Workflow: navy full-width band; six icon items and arrows in wrapping flex layout, subject to the display rule noted above. Icon boxes shrink at ≤900px; connectors hide and smaller icons wrap at ≤620px.
- Evidence carousel: image plate with decorative overlay/frame and contained specimen; image height becomes 320px at ≤620px.
- Metrics: four columns, two at ≤980px, one at ≤620px.
- Architecture flow: three cards with arrows; wraps at ≤980px; becomes a vertical flow with rotated arrows at ≤620px.
- Footer: left/right panels in a `0.7fr / 1.4fr` grid, 520px minimum panels; right panel four link columns and full-width newsletter. ≤980px panels stack; ≤620px links use two columns and newsletter input/submit stack.
- Inner pages: dark intro hero, numbered cards with staggered reveals, closing CTA. Inner cards collapse their internal grid at ≤980px. Team roster expands the active card on wide layouts; wraps into two columns at ≤900px and one at ≤540px.

## 11. Animation and interaction inventory

- `Reveal` wraps most sections/cards. An `IntersectionObserver` threshold of 0.12 adds `is-revealed` once and unobserves. CSS transitions opacity 0→1 and translateY 28px→0 over 0.6s with easing; individual cards use stagger delays.
- Hero `TunaEyeHeroLogo` uses `motion/react`, spring-smoothed scroll rotation (0→45° over 800px), scale (1→0.88 over 600px), and vertical movement (0→50px over 600px). Pointer position tilts layers, hover scales the stage to 1.04, ambient glow changes intensity, orbit/target rings and floating dots animate.
- Phone screenshots change every 2 seconds; initial images preload on mount.
- Criteria tab state and evidence carousel index are independent local React state.
- Demo modal uses fade/scale entrance/exit; changelog uses separate CSS modal transitions.
- Nav dropdown opens on click; active styles indicate current public page.
- FAQ preview uses native `details`; linked FAQ page uses static cards.
- Newsletter/social elements are presentation placeholders as described above.

## 12. Claims and discrepancies to review before rewriting

The purpose of this file is to retain current content. The following copy must not be mistaken for verified implementation or measured hardware behavior:

1. **Automatic sync:** home FAQ says sync resumes automatically. Current project behavior is manual “Sync now”; do not reintroduce automatic writes based on archived copy.
2. **Convex/dual cloud:** home architecture, features, FAQ, team bio, and changelog advertise Convex. Current application uses Supabase integration; a Convex runtime/client is not established by this archive. Treat those statements as legacy marketing claims pending implementation confirmation.
3. **Grades:** landing includes Grade B+; current app grading types use A/B/C plus Invalid/uncertain outcomes. Marketing grade descriptions do not define classifier output or combination logic.
4. **Demo:** “View Demo”, “Open interactive demo”, and video labels currently lead to `/image.png`, not an interactive kiosk session or MP4.
5. **Hardware/performance:** sub-200ms, zero-latency, 100% availability, IP65, lighting calibration/CRI, serial/Bluetooth scale support, thermal printer dimensions, and QR verification are copy/specifications here; this scan did not benchmark or physically verify them.
6. **Model traits:** translucency, oil content, structural integrity, moisture, muscle density, and similar anatomical wording are preserved marketing copy; they are not proof of separately measured model features.
7. **Data/storage:** generic “local IndexedDB queueing” language oversimplifies the app's split persistence. See `context.md` for metadata versus image storage and verified cloud sync behavior.
8. **Placeholder integrations/assets:** newsletter does not submit; social icons do not link; team photos are absent; installation notice visibility and workflow pipeline styling have source caveats documented above.
9. **New V2 workflow:** the current page describes generic capture/select-cut workflows; it does not document or implement the supplied 80% Sashibo-first supplementary Tail-Cut decision tree.

## 13. Archive verification and limits

Cross-checked against all public page branches in `src/MarketingLanding.tsx`, its imported illustration/dialog components, `src/site.css`, the public render/install callback in `src/App.tsx`, entry metadata, manifest, and referenced public asset paths. Includes inactive criteria content, both evidence slides, all phone screenshot references, expandable team bios, initially closed FAQ answers, all version entries, and shared footer/legal content.

Local read-only Chrome/Playwright checks against the Vite development server also verified:

- Home renders at 1440×1000; headings match the archived sections.
- Switching to the Tail Cut criteria panel and advancing to the Tail Cut evidence slide works.
- Changelog opens with all four release entries and closes.
- Direct navigation to Features, About, Team, FAQ, Terms, and Privacy renders the expected page heading.
- At 390×844, the desktop navigation is hidden and document width equals the 390px viewport (no horizontal overflow in the checked home state).
- The workflow pipeline is hidden and the install fallback dialog is absent, as described above.
- The successful route/changelog/mobile probe recorded no page JavaScript errors, failed requests, or HTTP responses at 400 or above. The home/tab/carousel probe recorded no page errors or failed requests. This does not establish that every image decodes: missing team portraits are separately established by filesystem inspection and have an icon fallback.

An automated TypeScript-source comparison found every nontrivial static JSX text fragment in `MarketingLanding.tsx` represented in this archive. Long content strings were also cross-checked; unmatched strings were SVG geometry and CSS class names. Referenced local assets were checked on disk.

This was documentation work with targeted browser inspection, not a UI change or full application regression run. No production build, full Playwright suite, grading/inference benchmark, live cloud write, QR destination decode, camera/scale/printer test, deployed-site inspection, or deployment was performed. Existing runtime behavior is preserved.
