# Plan

## Offline TOTP 2FA, Secret "A" removal, SQLite state durability, Audit & Full-Queue Sync (2026-11-28)

- [x] Remove Secret Admin `"A"` mode (`#te-secret-a-btn`, `secretGradeAArmed`, `SECRET_A_DELTAS`) from `src/exact-ui.ts` and `DECISIONS.md`.
- [x] Add SQLite `station_state` table + `/local-api/state` endpoints in `server/station.py`, unit test in `server/test_station.py`, and automatic backup/restore in `src/sqliteStore.ts` & `src/main.tsx`.
- [x] Build `src/offlineTotp.ts` (100% offline RFC 6238 TOTP, zero-dependency ISO/IEC 18004 SVG QR generator, 5 single-use offline recovery codes, 58mm thermal slip print) and integrate into `src/expertGraders.ts`, Admin enrollment (`src/exact-admin.ts`), and Override verification (`src/exact-ui.ts`).
- [x] Add append-only `supabase/migrations/202611280001_audit_logs.sql`, `syncAuditLogs()`, full-queue chunked batch sync in `src/cloudSync.ts`, and `Auto-sync when online` toggle in Admin Settings + `src/main.tsx`.
- [x] Sync `CODEBASE.md` & `DECISIONS.md` to current 75% rules and verify with Python unittest, production build, and Playwright visual screenshots.

Review: All 7 Python SQLite tests (including `station_state` persistence across restarts) passed, `npm run build` passed, and Playwright verified Offline TOTP enrollment (cross-checked against Node.js `crypto` RFC 6238), QR SVG rendering, 5 recovery codes, Secret "A" removal, Factor 1 PIN + Factor 2 TOTP override authorization, and `/local-api/state` SQLite backup. Note: Item #10 (Pi LAN API token + local HTTPS) remains intentionally deferred per user request.

## Expert grader PIN registry, flagged grade card & food safety notice (2026-11-28)

- [x] Add `src/expertGraders.ts` storing Admin-registered Expert Graders with per-grader salted 4-digit PIN hashes and verification.
- [x] Update `src/exact-admin.ts` (`graders` tab) to register Expert Graders (Name + 4-digit PIN) and display non-override station operators separately.
- [x] Update `src/kioskState.ts` and `src/exact-ui.ts` to remove the black override card, display the normal Grade A/B/C card with a `FLAGGED FOR MANUAL OVERRIDE` chip, and allow operators to pick a registered Expert Grader and enter that grader's PIN in the Override modal.
- [x] Add the non-blocking Food Safety Notice on the live camera/scanning screen (`core` / `tail`) and a 1-line visual-assist footer on the 58mm thermal receipt (`src/thermalReceipt.ts`).
- [x] Build, verify all flows visually with Playwright screenshots (Admin Expert Grader registration, Scanning screen food safety notice, Flagged Grade card without black card, Expert Grader selection + PIN override, and Receipt), and check console/network errors.

Review: Implemented `src/expertGraders.ts` (PBKDF2-SHA256 per-grader PINs with 5-attempt lockout and 2 seeded sample experts), updated Admin Expert Graders to separate authorized experts from scan-only operators, removed the blocking black card in favor of the standard Grade A/B/C card + `FLAGGED FOR MANUAL OVERRIDE` chip/pill, upgraded the Override modal to select a registered Expert Grader + enter their personal PIN, and added the Food Safety Notice on scanning and 58mm receipt output. `npm run build` passed and Playwright verified all 5 screens at 1280×800 with screenshots visually inspected; wrong expert PIN rejected, Elena Reyes PIN `9876` authorized Grade A and recorded `EXPERT OVERRIDE: Elena Reyes` on the 58mm receipt preview. Physical Raspberry Pi hardware and live cloud writes remain outside browser test scope.

## Kiosk label overlap fixes (2026-11-20)

- [ ] Reproduce overlapping labels and controls in the active exact-HTML kiosk at 1024x600, 1280x800 and 1366x768.
- [ ] Apply minimal layout fixes to affected screens; preserve all state, grading and button handlers.
- [ ] Verify real browser flows, label/control geometry, console/network, existing relevant checks and production build.

Scope: active `new ui/index (4).html`, runtime-injected kiosk styles only if needed, and focused regression coverage. Preserve unrelated work, copy meaning and touch accessibility. Plan reviewed: inspect the final CSS cascade and longer runtime labels before selecting changes.

## Project scan for animated demo (2026-11-20)

- [x] Inventory active entry points, source, assets, integrations, tests and existing video projects.
- [x] Trace current grading, override, receipt, records and admin behavior against implementation.
- [x] Write `docs/ANIMATED_DEMO_PROJECT_GUIDE.md` with source references, demo storyboard, reusable assets and accuracy boundaries.
- [x] Verify guide links and key claims against current source; document scan limits and results.

Scope: documentation only. Inspect first-party source and configuration; exclude dependency internals, generated bundles, archives and private environment values. Use the active exact-HTML interface as the current product reference, distinguishing legacy React and older video captures.

Plan review: cover the product story and real workflow, data/hardware contracts, current decision thresholds, production/demo differences, visual identity and existing animation material. No application changes or external writes.

Review: delivered a 4,748-word source-based guide covering the active exact-HTML entry, 75% core-first/provisional/combined decisions, expert review, current camera and 58mm print paths, browser/SQLite/Supabase records, background sync, Admin, asset shelf and older Remotion projects, plus a proposed 120-second storyboard. Flagged stale 80%/manual-only/80mm marketing and test assumptions, partial Android scaffold, conceptual model graphics and the persisted forced-Grade-A control. All 30 Markdown source links resolve; code fences balance; key policy/sync/promotion/700ms print anchors checked directly; git diff whitespace check passed. Documentation only: app/browser tests, actual model/hardware/cloud, Android build and media playback were not run. Existing untracked DECISIONS.md and .claude/ were left untouched.

## Kiosk stability, offline storage and hardware-flow fixes (2026-11-18)

- [ ] Preserve exact presentation; isolate compact 58mm print document with offline Code128 and paper-height controls.
- [ ] Fix localhost production PWA caching, asset/font/install handling and attachment/transition failures; stamp coherent build caches.
- [ ] Complete station SQLite service, browser outbox/recovery and verified PostgreSQL sync; show actual save outcome.
- [ ] Gate live mode with real retryable Pi/camera/models/storage checklist; fix configurable protected offline admin PIN.
- [ ] Provide A/B/C, invalid, tail and expert demo scenarios without operational writes or Pi dependencies.
- [ ] Verify focused and integrated desktop/tablet/offline/recovery/printing tests, build production package, document limits and commit.

Scope: preserve UI, fonts, features and existing default 80% decision/fusion rules. Experimental backend policy remains disabled. Physical hardware and live cloud are separate verification boundaries.

## Backend policy preparation and rejected capture safety (2026-11-18)

- [ ] Keep experimental 85%/20-point policy disabled until backend validation is confirmed; prepare shared acceptance/status helpers and policy-aware messages.
- [ ] Parse sample-validation 422 errors without retry; stage evidence under a unique temporary ID and atomically promote only validated captures.
- [ ] Verify mismatch/unknown rejection, preserved prior evidence, legacy and experimental policy boundaries, existing capture/receipt flows; build and commit without deploying/enabling policy.

## Automatic receipt printing (2026-11-18)

- [x] Restore a one-second automatic print on receipt entry, using the existing printer flow.
- [x] Verify delay, navigation cancellation, manual-print deduplication and retry/error behavior with Playwright.
- [x] Build the Pi package, refresh ZIP and commit locally.

Scope: receipt timing only. Preserve grade validation, receipt contents, stored evidence and manual print/skip controls. Existing output uses the OS print dialog; no direct Bluetooth transport is configured.

Review: the exact-HTML adapter now restores automatic printing at 1000ms and checks the originating print button so stale timers cannot print after leaving/reentering. Existing busy lock prevents manual/automatic duplicates. Extended the real core-capture-to-receipt Playwright flow: Grade C at 91% preserved; no print before 500ms; automatic print after at least 950ms; printer error permits retry and retains the saved record; leaving cancels printing; manual print before timeout prints once. Print calls are mocked, not physical paper verification. No page errors or failed requests (external fonts stubbed). TypeScript/Pi build passed. ZIP refreshed and integrity checked. OS printer configuration still determines Bluetooth routing and whether a print dialog appears.

## Restore light dashboard admin (2026-11-18)

- [x] Restore white navigation, sans-serif typography and blue feature cards from the preferred dashboard references.
- [x] Put real station metrics/charts and recent records first; retain diagnostics and every admin handler.
- [x] Verify desktop/tablet navigation, CRUD/settings, diagnostics and logout; refresh Pi ZIP and commit locally.

Scope: admin presentation only. No grading, camera, offline storage or cloud-sync policy changes.

Review: replaced the gradient sidebar/serif styling with white navigation, sans-serif headers, a blue summary card and compact weekly-volume/grade-distribution cards. Overview now starts with saved-record metrics and recent records; diagnostics remain below and on Devices. Charts use actual stored records with an accessible weekly summary and a neutral empty ring. Playwright technical-admin checks passed at 1280x800 and 1024x600, including counts, Pi success/failure, evidence and no remote writes. Existing admin CRUD/settings/PIN/pagination/tablet-entry and logout checks pass. Screenshots reviewed; TypeScript/Pi build and ZIP integrity pass. Hardware and live cloud remain untested.

## Logout confirmation button fix (2026-11-18)

- [x] Reproduce the clipped green logout label and trace the conflicting style.
- [x] Isolate the destructive-action class from record-grade badge styles.
- [x] Verify single-line white label, Cancel and confirmed logout on desktop/tablet; build and refresh Pi ZIP.

Scope: shared destructive confirmation styling only; preserve logout behavior, records and all other existing work.

Review: reproduced the green, two-line label caused by the generic `.dg` record badge selector. Renamed the destructive modal class to `xpr--danger`, leaving record badge styles and logout handlers unchanged. Playwright verified white single-line label, Cancel retaining admin, and confirmation returning to welcome at 1280x800 and 1024x600, with no page errors or failed requests using a local-font fixture for blocked Google Fonts. Both screenshots reviewed. TypeScript and Pi build passed; deployment ZIP refreshed. Camera-flow inspection confirmed the active live source is Pi `/stream` and `/snapshot`, without browser getUserMedia; no camera behavior changed.

## Operational admin and floating-chip removal (2026-11-18)

- [x] Remove the global bottom-right demo/live chip from the DOM; retain operating-mode controls in grader entry and Admin Settings.
- [x] Add real manual diagnostics for Pi/model metadata, camera snapshot, cloud reachability, sync queue/errors and local storage/evidence.
- [x] Verify technical success/failure states, no automatic uploads, chip absence in live/demo, settings toggle and tablet layout with browser tests; build and refresh Pi package.

Scope: operational admin controls and requested chip removal. Keep grading/classification rules, local records, manual verified cloud sync and sample-validation proposal boundary intact. Never fabricate hardware readiness or unsupported telemetry.

Review: deleted the floating chip's creation/append code. Explicit mode controls remain in identity entry and Admin Settings. Added `exact-technical.ts` to Overview/Devices: effective URLs/deployment, manually measured status latency/service/version/model/class metadata, decoded real snapshot size/MIME/dimensions/preview, independent cloud reachability, pending/failed/synced queues with stored errors/record IDs, quota/persistence/cache/secure-origin and referenced-evidence inspection. No automatic probes, record uploads, deletion or sync-state rewriting. Connection changes invalidate stale diagnostic results; sidebar reflects the latest Pi check. Last-sync time advances only when verified records actually synced.

Browser fixtures passed at 1280×800 and 1024×600 for success/503 failure, model metadata, camera decode, missing evidence, cloud check, queue errors, settings toggle, and absence of the floating chip; zero remote writes and retained failed records asserted. Both screenshots reviewed. Existing dial/demo/admin CRUD/tablet and core-to-receipt scripts pass; TypeScript/Pi build pass. Physical hardware and live cloud writes remain untested. Pi ZIP refreshed; no commit/deployment.

## Version-history dialog design (2026-11-18)

- [x] Inspect the exact HTML changelog content and all open/close entry points.
- [x] Design a landing-style release timeline with a featured latest release, readable history and accessible dialog controls.
- [x] Verify desktop/mobile/short tablet scrolling, both entry points, keyboard/backdrop close, focus and page/network errors with Playwright; run grading smoke and Pi build.

Scope: changelog presentation and dialog-specific behavior only. Preserve every release note, current release number, other modals and grading/Pi/storage/sync behavior. Use supplied HTML as rendering source; no new dependency or deployment.

Review: redesigned the supplied HTML's Version History into a blue/serif header, featured latest-release card, four-release timeline, fixed footer/close controls, scrollable release body and mobile layout. All 13 existing notes and version/date values are preserved. Dialog has named accessible semantics, initial focus, focus loop, Escape/backdrop/button close, opener focus restoration and background scroll locking. `scripts/verify-version-history.cjs` passed at 1440×1000, 1024×600 and 390×844 with no page errors or failed local requests; all three screenshots visually inspected. Inline classic-script parsing and TypeScript/Pi production build passed. Existing exact-UI core-to-receipt smoke passed. Refreshed `tunaeye-pi-build-2026-11-18-updated.zip` and verified ZIP integrity. No business/inference changes, hardware/cloud testing, commit or deployment.

## Exact UI follow-up: loading, modes, validation and admin (2026-11-18)

- [x] Restore actual KiloThermalDial on startup and landing-to-kiosk transition; tablet auto-entry/fullscreen fallback.
- [x] Add explicit persisted demo/live toggle and visible simulated status, preserving live Pi requests when off.
- [x] Inspect frontend sample contract and prepare independent-validation proposal; user requested no production detector changes yet.
- [x] Transfer admin record/settings/price/grader/device/audit capabilities into landing-style admin.
- [x] Fix supplied HTML syntax/vendor diagnostics, test browser flows/tablets/offline and rebuild Pi release.

Plan review: use supplied UI, not old screen rendering; fullscreen may require user gesture. Sample identity requires model evidence and cannot be inferred reliably from a filename or selected model alone. User explicitly authorizes demo toggle in Pi build; keep demo records out of operational/cloud data.

Follow-up review: actual dial is mounted at both transitions; browser checks pass demo/live control, no demo Pi calls or operational records, admin PIN/grader CRUD/settings/search/pagination, tablet auto-entry, supplementary-tail and expert outcomes. Admin screenshot visually inspected after entrance animation. Production offline reload passes after precaching CSS/vendor scripts and serving cached public assets with safe same-origin Vary handling. TypeScript/Pi build and inline classic script parsing pass. First-tap fullscreen fallback is wired inside the tablet kiosk frame; real tablet fullscreen permissions remain hardware QA. No Pi backend was edited: SSH timed out, and the classifier/data/API/evidence-staging proposal is in `docs/SAMPLE_TYPE_VALIDATION_PROPOSAL.md`. Updated ZIP release is `tunaeye-pi-build-2026-11-18-updated.zip`; actual model/camera/printer, hosted email delivery and live cloud writes remain unverified.

## Exact supplied HTML and Pi release (2026-11-18)

Correction: use `new ui/index (4).html` itself, rather than approximating its visuals in the old React components. The app entry renders the supplied complete landing/embedded-kiosk document. Technical prototype behavior is bridged to existing domain/integration modules in `src/exact-ui.ts`.

- [x] Replace the active rendering entry; preserve the supplied HTML, public sections, artwork, animation, layout and embedded kiosk presentation.
- [x] Bridge real Pi stream/snapshot/grade, model-label preservation, existing V2 decisions and score-vector combination; disable prototype random inference and seeded history.
- [x] Save evidence in IndexedDB and inference/override/price metadata locally before printing; connect manual Sync now to existing verified cloud synchronization.
- [x] Keep PIN checks, explicit printing/skip, 15–200kg validation, upload validation and 58mm physical print styling.
- [x] Verify exact UI core-to-receipt against development and built Pi assets; verify supplementary-tail and expert-override flows at 1024×600.
- [x] Verify production service-worker-controlled offline reload and build the Pi transfer archive; integrity-check ZIP.
- [ ] Migrate the full legacy React-specific browser suite and verify all admin/CRUD/auth edge cases against the exact interface.
- [ ] Verify actual Pi camera/model, printer/tablet installation and live cloud writes on station hardware.

Review: `npm run build:pi` passed; domain/integration modules have no diff. Exact-interface scripts passed core Grade C at 91% without deriving A from confidence, multipart image_type, local result preservation, receipt, supplementary-tail combined grade B and PIN override A preserving original predictions. The production Pi bundle passed the same core-to-receipt test using same-origin API fixtures. Trusted-loopback production shell reloaded with browser networking disabled after service-worker installation. No physical Pi connection was available. Full legacy regression migration/admin coverage and hardware/live-cloud verification remain explicitly outstanding.

Release: `tunaeye-pi-build-2026-11-18.zip`, 7,183,897 bytes, ZIP integrity passed; SHA256 `44c46bb0b8508fcedf4927c53184285c705c112666b42ac5987c95a86579e043`. Transfer instructions and PWA secure-origin requirements: `docs/EXACT_UI_PI_RELEASE.md`. No commit, push or deployment performed.

## Integrate supplied landing and kiosk UI (2026-11-18)

Scope: adapt `new ui/index (4).html` into the existing React application, preserving the currently implemented V2 grading decisions, Pi endpoint contracts, local persistence, overrides, pricing snapshots, manual verified cloud sync and printing. Keep reference assets and layout; replace prototype simulation/data with real state and handlers. Local implementation only; no commit or deployment.

- [ ] Map supplied design screens/assets/actions to current landing, kiosk and admin surfaces; record integration boundaries.
- [ ] Integrate landing presentation with existing navigation/install/demo/entry callbacks and public content.
- [ ] Integrate kiosk presentation with existing session, capture, inference, review, records, override and printing handlers.
- [ ] Verify real Pi request contracts and error handling with browser fixtures, and probe physical Pi availability where reachable.
- [ ] Verify navigation, full grading outcomes, authentication, CRUD/settings/sync and responsive layouts with Playwright; inspect screenshots/console/network.
- [ ] Run existing browser suites, TypeScript and standard/Pi production builds; resolve regressions and document evidence/limits.

Plan review: source-only presentation changes must not import prototype random grades or fake device statuses. Preserve domain/integration modules where possible, scope CSS to avoid legacy cascade interference, reuse supplied imagery, and keep hardware-free demo distinct from real Pi operation. Required tablet QA: 1024×600, 1280×800, 1366×768; include public mobile layout. No new business rules.

## Resolve interrupted pull conflicts (2026-11-17)

Scope: resolve only the task-history and generated test-metadata conflicts from the existing pull. Preserve both task histories, local test metadata, incoming source changes and unrelated working files. No application/UI edits, commit, push or remote changes.

- [x] Verify the explicit repository root, origin, merge state and conflict stages.
- [x] Combine both task-history additions without discarding either side.
- [x] Stage the two resolved conflict paths and verify no unmerged entries remain.
- [x] Verify no new application changes were introduced and document the resulting merge state.

Plan review: existing incoming grading changes and Android deletions belong to the already-started merge; resolving metadata must not silently revise them. Retaining generated test metadata does not certify a test run.

### Conflict repair review

- Removed only the task conflict markers and retained every nonblank line from both conflict stages. Kept the local generated `.last-run.json` unchanged and validated its JSON.
- Staged only `tasks/todo.md` and `test-results/.last-run.json` for this repair; `git ls-files -u` is empty. The merge is resolved and ready for the user's commit, with no commit or push performed.
- Staged `src/`, package files and tests match `MERGE_HEAD`; no unstaged changes exist in those paths. Incoming workflow and Android changes were not rewritten. Application/browser tests were not rerun for this metadata-only resolution.
- Conflict-path whitespace checks passed. The full staged-tree whitespace check reports one pre-existing incoming blank line at EOF in `.agents/skills/write-swift/SKILL.md`; left unrelated skill content untouched.

## Landing content archive and codebase context (2026-11-17)

Scope: documentation only. Archive the current public landing page before a possible redesign; map the existing application and record the supplied V2 workflow as a proposed requirement. Preserve all application logic, styles, assets, and existing work. Do not connect or replace the kiosk HTML yet.

- [x] Inspect landing-page source, content, assets, styles, routes, and interactions.
- [x] Scan application architecture and current grading/integration contracts.
- [x] Write root `content.md` with the landing page's copy and structure.
- [x] Write root `context.md` with verified codebase context and proposed workflow boundaries.
- [x] Cross-check both documents against source and record verification results.

Plan review: distinguish implemented behavior from requested future behavior, capture conditional/mobile content as well as visible sections, and document unknowns without changing runtime behavior. Browser tests are required if UI changes; this task changes documentation only.

### Landing archive review

- `content.md` archives all home sections, shared shell, public subpages, changelog, tab/carousel/FAQ/bio content, install handler copy, assets and responsive/animation rules. Source comparison found no missing nontrivial static JSX copy; long content strings were cross-checked as well.
- `context.md` maps source modules, current routes/grading/state/storage/Pi/cloud/auth/pricing/printing, commands/tests and future HTML integration boundaries. Clearly separates today's 70% rule and separate sample grades from the unimplemented supplied 80% workflow; exactly 80% and grade fusion remain unspecified.
- Local Chrome/Playwright probes verified home, all six linked public pages, Tail Cut criteria/evidence, four-entry changelog, and mobile 390px width. No application page errors or failed requests observed in successful probes; route/changelog/mobile probe also recorded no HTTP errors. Confirmed existing hidden workflow pipeline and absent public install fallback dialog; documented without fixes.
- Only documentation was created/updated for this task. Preserved pre-existing changes in Pi hosting documentation, service worker, test-results metadata and `.claude/`. No app logic/UI edits, build, full regression suite, hardware/live cloud test, commit or deployment.

## Full offline demo discoverability (2026-11-09)

- [x] Confirm the public landing page exposes a full demo entry point.
- [x] Keep demo inference and sample capture simulated across the complete grading flow.
- [x] Expose persistent demo status and outcome controls while grading.
- [ ] Verify the full demo path from landing through completion in Playwright.

### Review

The demo is a full workflow mode: it uses local samples and simulated model responses, so Raspberry Pi camera and inference hardware are not required. The public CTA now says “Try full demo · no Pi”; the kiosk keeps a visible Demo mode bar with the three presentation outcomes.

## Grading workflow V2 (2026-11-09)

- [x] Record the kiosk map in `CODEBASE.md`.
- [x] Grade sashibo core first. Accept at 80% and go to one receipt.
- [x] Below 80%, capture a tail cut. Blend when the tail cut is also at 80% or above.
- [x] Below 80% on both, require an expert grade, then print.
- [x] Add `npm run dev:demo` with three presentation outcomes.
- [x] Verify the new path and the existing kiosk checks in the browser.

### Workflow V2 review

Sashibo at or above 80% opens one receipt. Below 80% asks for a tail cut, then blends the two score vectors. Both below 80% require the expert PIN and then print. Browser checks passed for those three paths, demo-mode lockout, upload, the full grade-to-receipt session, print failure, the thermal slip, weight entry, and tablet overlap at 1024×600 and 800×1280. The hotspot sync check stayed skipped because this run had no mock Supabase URL. Physical camera, printer, and scale were not tested.

## Previous plans

## Combined cinematic product demo with admin sync (2026-10-10)

Scope: one new 120-second cut in the existing separate Remotion project. Preserve both accepted videos and production app. Blend the cinematic sample/brand visuals with the earlier demo's complete functional footage. Faster (+8%) natural narration, livelier original score, actual admin UI with isolated cloud fixtures visibly labeled.

- [x] Capture admin dashboard, offline preservation, manual sync and verified record/image states; verify both tablet sizes.
- [x] Edit eleven scenes: hook 0-8, expert 8-16, brand 16-23, vision 23-32, workflow 32-62, results 62-73, override 73-85, receipts 85-93, local records 93-100, admin sync 100-114, finale 114-120.
- [ ] Produce faster narration, energetic original music, real-interaction effects and mastered stems.
- [x] Typecheck and review meaningful feature/transition frames; verify existing browser flows.
- [ ] Render narrated and narration-free combined MP4s plus full-length preview.
- [ ] Verify exact duration, frame counts, audio levels, actual playback and sampled final visuals; deliver updated storyboard and instructions.

Plan review: allocates 82 seconds to concrete product workflows, keeps expert control and separate sample results, includes manual offline-first sync, and requires media plus real browser evidence.

Progress review: both Admin viewport captures and the corrected Tail camera retake passed. Feature source timing, specimen identity, guide/weight ordering and critical typography were reviewed. Existing suite: 38 passed, 4 skipped, one fractional-pixel assertion failure; the exact test passed on isolated retry. Lint/typecheck and diff whitespace checks passed. New instrumental mix passed at -13.93 LUFS / -1.30 dBTP with 88 audible synchronized effects, no clipping, exactly 120 seconds and stereo 48kHz. Revised neural narration remains pending explicit Microsoft TTS disclosure approval after automatic approval review rejected that external action; no retry occurred. Full instrumental render is underway, with separate final numerical/playback QA required.

## Internet recovery and captured image sync labels (2026-10-10)
- [x] Add bounded cloud reachability checks and friendly waiting states for both sync entry points.
- [x] Show verified Synced / saved-local labels on captured images and current record review.
- [x] Show one dismissible Internet is back toast after confirmed recovery; preserve manual sync.
- [x] Verify hotspot, recovery, partial disconnect and image labels in Playwright; run existing suite and Pi build.

Scope: existing cloud modules, shared records UI, existing toast style and focused tests. Keep all grading data and cloud verification requirements.

### Internet recovery review
- A five-second uncached cloud check runs at kiosk entry, foreground/focus, online events and every 15 seconds while visible. It never starts record uploads. Wi-Fi alone does not show recovery; the toast appears once after confirmed unavailable-to-available transition, is dismissible, and clears after eight seconds.
- Both record sync actions show Waiting for internet and preserve data. A connection lost during upload/readback returns the current record/evidence to pending and stops further attempts; other authentication, database and verification errors stay distinct. Last-sync time only advances when records are actually synchronized.
- Captured image thumbnails and review show Saved locally, Syncing, Synced or Sync needs retry. Synced remains tied to existing cloud row and image-byte verification. Open review derives its current record by ID.
- The service worker bypasses no-store requests so cached health/app-shell responses cannot fake internet recovery. The browser regression verifies periodic recovery without a Wi-Fi event, no false/duplicate toast, no automatic writes, retained financial data, distinct authentication failure and successful manual retry after mid-sync disconnect.
- Standard suite: 37 passed, 4 environment-specific skips, 2 failures resolved (compact badge row spacing and the old offline notice expectation); both affected tests passed on rerun. Final Pi-focused run: 4 passed, including same-origin Pi routes and offline cache check. Final 1024x600 tablet QA passed; 1000x650 record row/review screenshots inspected.
- Live read-only Supabase health GET and apikey preflight passed with the effective Pi config and Origin http://10.42.0.1:5000. Actual hotspot-device internet, live cloud record/image writes, physical hardware and deployment remain unverified. No cloud data was written by the live probe.
- Final TypeScript and Pi production build passed. Updated dist/ includes the final badge spacing, recovery UI and service-worker bypass. Diff whitespace checks passed.

- [x] Inspect the persistence and sync flow that marks records as syncing before manual sync is requested.
- [x] Remove the unintended automatic sync trigger during kiosk startup/reconnect handling.
- [x] Validate the affected Playwright scenario for pending local records.

## Pi hotspot cloud failure (2026-10-10)
- [x] Reproduce DNS failure and unintended reconnect sync with browser tests.
- [x] Keep sync manual, explain cloud connectivity failures, and correct network readiness copy.
- [x] Verify offline preservation and manual cloud retry; run kiosk suite and rebuild Pi assets.

Scope: cloud authentication error, remaining automatic reconnect trigger, network status wording, regression tests. Keep local records and evidence.

### Hotspot cloud fix review
- Reproduced unwanted cloud authentication after an online event before the fix. Removed the remaining reconnect sync; only the two explicit Sync now handlers call record sync.
- Authentication network failures now explain Pi Wi-Fi versus internet access. Pending record data stays unchanged; an empty queue avoids unnecessary cloud authentication. Devices reports network connectivity without claiming internet/cloud readiness.
- Browser DNS-failure regression verifies zero reconnect requests, a clear manual sync failure, unchanged pending financial data, continued grading navigation, and corrected Devices status. Mocked cloud test verifies manual upload/readback, retry, evidence retention and price sync; both passed in Pi mode.
- Standard suite: 37 passed, 4 environment-specific skipped, 1 route test initially landed on role selection. Isolated retry passed; all 38 eligible checks verified. Pi build and diff whitespace checks passed.
- Current workstation DNS resolves the configured Supabase hostname and a no-key health request reaches its gateway (401 expected). This workstation is outside the Pi hotspot subnet. User-device DNS/internet, live cloud data writes, extension behavior and deployment were not tested; updated Pi assets are in dist/.

## Cinematic kiosk product demo (2026-10-10)
- [x] Inspect current real kiosk screens and preserve production source.
- [x] Capture ordered same-fish, two-sample flow; verify 1280x800 and 1024x600.
- [x] Build 90-second 1920x1080/60fps Remotion source; lint/typecheck and key frame QA.
- [x] Verify all 35 eligible existing kiosk tests; 3 deployment-specific skips.
- [x] Finish neural narration, original music and synchronized effects.
- [x] Finish final, no-narration and preview renders.
- [x] Verify export metadata/audio levels and document delivery.

Scope: tunaeye-product-demo only plus task tracking. Keep unrelated ongoing app and task edits.

### Product demo review

- Delivered all three MP4s and four requested WAV stems with complete isolated Remotion source, capture/audio/render scripts, storyboard and README.
- Full versions: exactly 90 seconds, 5,400 decoded frames, 1920x1080/60fps, H.264 yuv420p BT.709, AAC stereo 48kHz. Preview: 90 seconds, 1280x720/30fps.
- Final mix: -14.0 LUFS / -1.5 dBTP. Narration-free MP4: -13.5 LUFS / -1.1 dBTP. No clipping detected; every stem exactly 90 seconds, stereo 48kHz PCM.
- Real ordered flow passed at 1280x800 and 1024x600; all 35 eligible existing tests passed across full run plus isolated retries, 3 deployment-specific skips. Final MP4 playback/seek passed in Chrome across all 11 scenes. Lint and TypeScript pass.
- Pi inference/camera preview were isolated fixtures and visibly labelled. Physical hardware, OS print dialog/paper output and live cloud sync were not tested. Production application files were not edited by the demo work.
- Reports: tunaeye-product-demo/qa/export-verification.md, playback-verification.json, source-audit.md, existing-suite-verification.md.

## Demo mode override bug (2026-10-10)
- [x] Trace shared demo initialization and verify effective Vite flags.
- [x] Reproduce stale storage / URL overriding disabled demo mode in Playwright.
- [x] Enforce the build flag and clear stale demo activation.
- [x] Verify Pi capture/review/inference path and existing kiosk tests; build standard and Pi outputs.

Scope: shared demoMode initializer, focused regression tests, task notes. Preserve all unrelated changes and grading records.

### Demo mode fix review

- Root cause: saved browser activation and `?demo=1` bypassed `VITE_DEMO_MODE=false`. The shared initializer now treats the build flag as an absolute gate and removes stale activation.
- All three browser regression cases failed before the fix and passed after it, exercising capture, image review and Pi inference request paths with isolated API fixtures.
- Existing suite plus new regressions: 38 eligible tests passed across full run and retry; 3 deployment-specific checks skipped. The sole initial failure was a tablet height measured as 67.999992px against a 68px threshold and passed on retry.
- Pi-mode run: all 4 checks passed, including same-origin API/camera routing. Standard production and Pi builds passed; `dist/` now contains the Pi build.
- Live Pi `/status` timed out from this workstation. Physical camera/inference and deployment were not verified; the running or installed app must load the rebuilt assets to receive the fix.
## 120-second cinematic product launch film (2026-10-10)

Scope: new `tunaeye-cinematic-film/` project; preserve production app and existing 90-second demo. 1920x1080, 60fps, 7200 frames, H.264/AAC stereo 48kHz. Eight acts at 0/15/30/43/55/72/95/108/120 seconds. Actual UI and repository samples; isolated simulated inference visibly labelled. Procedural graphics represent classification conceptually, never measured feature maps or Grad-CAM.

- [x] Audit current product claims/assets and capture real ordered browser workflow.
- [x] Produce eight spoken narration clips, original 128 BPM score, frame-synchronized effects and ducked mastered stems.
- [x] Build eight editable cinematic Remotion scenes with distinct compositions, shared visual transitions and readable UI.
- [x] Typecheck, browser verification, existing Playwright suite and critical-frame visual review.
- [x] Render all 7200 frames; mux narrated and narration-free finals; create preview.
- [x] Verify duration/frame count/resolution/audio/loudness/playback; deliver README and storyboard with evidence and limits.

### Cinematic launch film review

- Delivered narrated and narration-free 120-second MP4s, a full-length lightweight preview, all four requested WAV files, editable Remotion source, storyboard and README in `tunaeye-cinematic-film/`.
- Both full exports contain exactly 7200 decoded frames at 1920x1080/60fps with H.264 video and AAC stereo 48kHz audio. Their visual streams are identical. Preview contains 3600 frames at 1280x720/30fps. Every WAV is exactly 120 seconds, stereo 48kHz PCM.
- Narrated export measures -14.1 LUFS / -1.3 dBTP; narration-free export -13.9 / -1.1; preview -14.2 / -1.2. All 12 media checks passed with no clipping. Grade A/B/C/Invalid reveals and effects align to spoken word timestamps within one frame.
- Actual kiosk workflow passed at 1280x800 and 1024x600 with no console errors or failed requests. Existing Playwright suite: 39 passed, 4 environment-gated skips, 0 failures and 0 flaky tests. Remotion lint/typecheck and diff whitespace checks passed.
- All three final MP4s passed 20 real Chrome seeks each, with audio/video decoding and no console, page, HTTP or unexpected network errors. Reviewed 21 decoded final frames and full-resolution opening, grade, overview and finale screenshots; visual review passed.

## TunaEye v2.7.0 Remotion Animated Demo Video (2026-11-21)
Scope: isolated `video/` only, plus this task log. Preserve the kiosk and both earlier video projects. Follow the eight-act 160-second timeline (9,600 frames); demonstrate the documented rules using supplied screenshots rather than changing application behavior.

- [x] Verify source assets, fixed act boundaries and all 12 decision presets.
- [x] Scaffold `video/` Remotion project (`remotion`, `@remotion/cli`, `@remotion/transitions`, `1920×1080 @ 60fps`).
- [x] Sync `public/assets/applogo.svg` + updated `public/kiosk-screens/*.png` (all 8 Acts + 12 Demo presets, Grader Dashboard, Admin Console, Cloud Sync).
- [x] Generate synthesized WAV SFX stems + `98 BPM` ocean marimba bed into `video/public/audio/`.
- [x] Build `HeroLockup`, `TabletScene` (3D bezel + Ken Burns + scan sweep + Grade A/B/C glow), `DecisionMontage`, and `TunaEyeDemo` (`TransitionSeries` + `<Audio>`).
- [x] Render `video/out/tunaeye-demo-v2.7.mp4` (`npx remotion render TunaEyeDemo out/tunaeye-demo-v2.7.mp4`) and verify playback + audio sync.

## TunaEye v2.7.0 Dynamic Demo v2 + ElevenLabs Voiceover Plan (2026-11-21)
Scope: Upgrade `video/` into a punchy ~90-second (`5400` frames @ `60fps` or `2700` frames @ `30fps`) dynamic presentation with zero intro lag, 6 varied visual layouts, tighter pacing, and natural ElevenLabs narration.

- [x] **Fix Intro Lag & Kinetic Timing (`HeroLockup` v2):** Cut intro from `6s` (`360f`) to `3.2s` (`192f` @ 60fps), start kinetic logo + word-by-word reveal at frame `0–8` with snappy spring (`stiffness: 220, damping: 20`), add active sonar pulse + zoom-through transition into Act 1.
- [x] **Replace Repetitive `TabletScene` Loop with 6 Distinct Layouts (`~90s` total):**
  - [x] `CenterStageScene`: Full-bleed centered tablet (`1.12x`) + animated tap ripples + floating glass callouts (Welcome, Sign-In/Weight, Receipt).
  - [x] `PiScanScene`: 5000K chamber crop zoom + CV scan reticle + live confidence bar (Placement + Sashibo Capture).
  - [x] `DecisionShowcase` (compress 56s -> 28s): 3-column Grade A/B/75% comparison cards, animated Tail-Cut branch flow (Upgrade to A / Confirm C / Provisional), and rapid-cut `Cannot Be Determined` + Black Override PIN card.
  - [x] `ReceiptPrintScene`: Animated 58mm thermal receipt unroll + 3-2-1 countdown ring.
  - [x] `CommandCenterScene`: Grader Dashboard + Admin PIN + Admin Console + Kiosk/Mobile -> Supabase live sync flow.
  - [x] Varied fast transitions (`14f` `wipe`, `slide`, `fade`) so layout changes every 2–4 seconds.
- [x] **Natural Male Neural Voiceover (disregarded ElevenLabs per user):**
  - [x] Updated `video/scripts/generate-narration.mjs` to use `python -m edge_tts` with `en-US-BrianMultilingualNeural` (`-2%` rate, `-1Hz` pitch, 48kHz stereo PCM, 0 clipped samples) synced to `90s` timeline.
- [x] **Render & Verify:** Typecheck (`tsc --noEmit`), render `video/out/tunaeye-demo-v2.7-dynamic.mp4`, verify with `ffprobe` + inspect extracted frames.
- [ ] Typecheck; verify Studio and final playback with Playwright; inspect rendered frames; decode/count frames and measure audio; document review and limits.
- Reports: `qa/export-verification.md`, `qa/playback-verification.json`, `qa/visual-review.md`, `qa/final-contact-sheet.jpg` and `qa/playwright-report.json` inside the new project.
- Inference and camera fixtures are labeled demonstrations; the network is conceptual. Physical hardware, live cloud writes, paper printing, subjective audio listening and manual inspection of every frame were not tested. Production source and the earlier demo were preserved.

## Local records sync needs attention (2026-10-10)
- [x] Check the live cloud schema and reproduce the failing record verification with reordered Supabase JSON.
- [x] Apply the smallest complete fix while retaining unsynced records and evidence.
- [ ] Verify sync/retry with Playwright, run existing suite and production builds.

Scope: shared record sync, corresponding regression tests, required cloud schema/config and task notes. Do not bypass persistence verification or change manual sync behavior.
