# Exact supplied interface — Pi release

## Updated follow-up release

The receipt page automatically starts the existing system print flow after one second. A manual print before the timeout does not duplicate the job; leaving the page invalidates its timer. Failed printing leaves saved records intact and retains retry/skip controls. Bluetooth printers must be configured through the operating system print service; this change does not add direct Bluetooth transport or claim physical paper delivery. Browser/system configuration determines whether the print dialog appears.

Admin presentation now follows the preferred light dashboard references: white navigation, sans-serif headings, blue summary cards, weekly volume and grade distribution calculated from saved records. Metrics and recent records appear before the retained technical diagnostics. Grading, offline storage and manual sync behavior are unchanged.

The latest update removes the floating bottom-right demo/live chip entirely. Switch modes in grader entry or **Admin → Settings → Grading operating mode**. Overview and Devices now include operational diagnostics: Pi/model/service metadata and request latency, decoded camera snapshots, effective endpoint configuration, cloud gateway reachability, queue/error details, browser quota and evidence/cache checks. All probes require an explicit click, never perform record uploads, and distinguish untested/unavailable services from successful checks. Tests cover success and failure using isolated API fixtures; actual station hardware and cloud writes are not claimed verified.

Use `tunaeye-pi-build-2026-11-18-updated.zip` for the latest build. It restores the actual KiloThermalDial on startup and landing-to-kiosk transition, adds an explicit persisted demo/live switch, tablet kiosk auto-entry, and a landing-style admin with records/evidence/search/pagination/CSV, grader management, price/settings persistence, device diagnostics, audit and cloud sign-in controls. Tablets attempt fullscreen automatically and retry on the first kiosk tap if the browser requires a gesture.

Live mode remains the default. Explicit demo mode is now available in the Pi build because the user requested that control; demo inference does not call the Pi and simulated results/evidence do not enter operational records or manual cloud sync. Mode changes are blocked during an unfinished graded session. The switch is visibly labeled simulated versus live.

Follow-up browser checks passed both dial transitions, demo/live switching and isolation, PIN/admin grader CRUD/settings/record pagination, tablet auto-entry, core acceptance, supplementary-tail combination and expert override. The production bundle reloaded offline with React/vendor/CSS assets cached. Admin screenshot: `test-results/exact-followup/admin.png`. HTML classic scripts parse and the vendor appearance diagnostic is fixed.

Independent sample identity validation is **proposal-only**, following the user's later instruction. `docs/SAMPLE_TYPE_VALIDATION_PROPOSAL.md` describes the independent classifier, backend/API extension, exact rejection messages, immutable previous evidence and rollout tests. SSH to the supplied backend path timed out. No production Pi backend changes or detector-enforcement changes were made; existing grade A/B/C/INVALID behavior is retained. Real hardware, hosted email delivery and live cloud writes remain unverified.

The application entry now renders `new ui/index (4).html` directly. The old React landing/kiosk screens are not mounted. The supplied HTML is retained as the visual source, including all public sections, illustrations, animations and embedded kiosk screens. `src/exact-ui.ts` replaces technical prototype behavior at load time; it does not approximate the interface with the legacy components.

The adapter uses the existing `piClient`, `kioskState`, evidence/record storage, pricing, Supabase authentication and verified manual sync modules. Capture uses Pi `/snapshot`, `/stream` and `/grade`; model grades are preserved independently of confidence. The existing 80% core-first decision and score-vector combination remain. Captured image Blobs are stored in IndexedDB; records and original inference/override metadata are saved before printing. The prototype random predictions, fabricated seeded history, fake sync, automatic printing and unprotected overrides are not used. Expert overrides require PIN verification; physical printing uses the OS dialog with 58mm output rules. Manual Sync now calls the existing cloud upload/readback/image-byte verification code.

## Build and transfer

Run `npm run build:pi`. Upload the contents of `dist/` to the Pi's existing static application directory; retain the existing Python/model/camera server and its API routes. The zip release contains the same directory contents. Follow `RASPBERRY_PI_LOCAL_HOSTING.md` for the existing station's directory and service setup; back up its current frontend before replacing it.

```powershell
scp -r .\dist\* tunarpi@10.42.0.1:/home/tunarpi/rpi-cam-demo/pwa_build/
```

Pi build uses same-origin `GET /status`, `/snapshot`, `/stream` and `POST /grade`, with demo mode disabled. No Pi backend or model files are included or replaced.

## Offline/PWA

Manifest and service worker remain at the app origin. The service worker pre-caches the shell and compiled exact-HTML bundle; evidence and records remain on device until manual cloud sync. Internet loss does not imply loss of the local Pi network. Actual inference still requires the Pi to be reachable.

Browser PWA installation and service workers require a secure/trusted origin. Plain `http://10.42.0.1:5000` can serve the interface and APIs but ordinary Android Chrome does not grant it service-worker/PWA privileges. Use the station's trusted HTTPS deployment, or a kiosk browser configured to trust that local origin. Establish the offline cache while connected before relying on offline reload.

## Verification

- TypeScript and Pi production build pass.
- Chrome integration: supplied landing → kiosk identity → weight → Pi snapshot/inference → exact result cards → receipt; Grade C at 91% remains C, saved locally with original confidence.
- Supplementary tail/combined grade and PIN-protected expert override paths pass at 1024×600, using isolated Pi HTTP fixtures.
- Production exact-HTML shell reload passes with browser networking disabled after service-worker installation, on a trusted loopback origin.
- Physical Pi `/status` was unreachable from this workstation. Physical camera/model, paper output, live cloud writes, and installation on the actual tablet remain unverified. Browser fixtures establish client behavior, not hardware readiness.
- Earlier React-specific browser suites target the replaced component structure; the exact-interface regression scripts are `scripts/verify-exact-ui.cjs` and `scripts/verify-exact-outcomes.cjs`.
