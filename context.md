# TunaEye codebase context

Source snapshot: 2026-11-17. This document describes the checked-in/local source inspected for this task, including existing uncommitted work. It is not a claim that the same version is deployed or that physical hardware and cloud services were tested.

The companion `content.md` archives the public website's copy, structure, assets, and interactions for a possible redesign. This task changes documentation only: no grading logic, UI, assets, configuration, or integrations were replaced.

## 1. Product and application surfaces

TunaEye is a yellowfin tuna grading assistant. The tablet guides an expert through selecting specimens, weighing, capturing evidence, sending it to a Raspberry Pi model, reviewing predictions, optionally overriding them, and printing receipts. Records and captured images are saved locally before an explicit cloud sync.

The repository contains:

- A public marketing website: Home, Features, About, Team, FAQ, Terms, and Privacy.
- An installed/browser kiosk workflow for expert graders.
- An administrator console for records, price schedules, graders, devices, audit logs, and settings.
- A Raspberry Pi HTTP client, not the actual camera/model backend implementation.
- Supabase client/schema/migration contracts for cloud records, private evidence images, profiles, and price schedules.
- An Android Capacitor wrapper and separate Remotion video projects.

Treat public marketing statements as copy, not implementation evidence. In particular, Convex, automatic record sync, B+ classification, browser webcam switching, and hardware performance claims need to be checked against source and actual integrations; see `content.md`.

## 2. Stack and entry points

| Item | Source / purpose |
| --- | --- |
| React 18 + TypeScript | Application components and typed session state |
| Vite 6 | Development server and production bundles |
| Tailwind CSS 4 + ordinary CSS | Tailwind tooling plus extensive shared and page styles |
| Motion / Framer Motion | Public site animations and UI components |
| Supabase JS | Authentication, database, private storage |
| Capacitor 8 | Android packaging |
| Playwright | Browser flow and regression tests |
| `index.html` | Root `#root` element, metadata, manifest/icon/font links, `/src/main.tsx` script |
| `src/main.tsx` | React StrictMode mount, global CSS imports, production service-worker registration |
| `vite.config.ts` | React/Tailwind plugins, port 3000, ES2022 target, vendor chunk, `dist/` output |

CSS import order is `styles.css`, then `product.css`, then `site.css`. Later declarations and media-query overrides matter when changing layout. `thermal-dial.css` supports the loading/weight dial component.

There is no React Router dependency: routes are managed with `window.history`, pathname helpers, React state, and `popstate`.

## 3. Important files

| Path | Responsibility |
| --- | --- |
| `src/MarketingLanding.tsx` | All public marketing pages, navigation/footer, criteria tabs, sample carousel, changelog |
| `src/site.css` | Public-site layout, responsive rules, colors, component treatments, animations |
| `src/App.tsx` | Kiosk/admin screen components, navigation, browser installation, session coordination, capture/inference effects, record persistence, printing, notices and overrides |
| `src/kioskState.ts` | Screen/sample/grade/session types, reducer/actions, sample order, fish/weight helpers |
| `src/piClient.ts` | Deployment-aware Pi endpoints, camera snapshot, inference request/validation, confidence status |
| `src/demoMode.ts` | Build-gated simulated captures and grading results |
| `src/gradingRecords.ts` | Local record types and localStorage read/write/update helpers |
| `src/evidenceStorage.ts` | IndexedDB evidence Blob storage and evidence sync state |
| `src/cloudSync.ts` | Explicit record/image sync, persistence verification, cloud reads, price sync, synced retention |
| `src/supabase.ts` | Typed schema/client, cloud availability, kiosk/hosted-admin authentication |
| `src/pricing.ts` | Editable PHP price schedule, price snapshot and formatting |
| `src/id.ts` | Stable identifier generation helper |
| `src/KiloThermalDial.tsx` | Dial visualization used by the app |
| `src/components/TunaEyeHeroLogo.tsx` | Animated public hero visual |
| `src/components/ui/` | Phone/laptop mockups, demo dialog, receipt printer visualization |
| `public/` | Brand/sample/app images, fonts, manifest, icons, service worker |
| `supabase/migrations/` | Shared grading contract, inference provenance, price fields/schedules |
| `android/` | Android wrapper, lock-task/device-admin integration |
| `tests/` | Kiosk, demo gating, offline cache, hotspot/cloud sync tests |
| `tunaeye-product-demo/`, `tunaeye-cinematic-film/` | Separate video source, scripts, media and QA artifacts; not the kiosk runtime |
| `tasks/todo.md`, `tasks/lessons.md` | Project plans, review results, and project-specific lessons |

`App.tsx` combines presentation and orchestration in one large file. A redesign needs to preserve its handler wiring, not just copy the visible markup.

## 4. Routes and entry behavior

| URL | Behavior / owning screen |
| --- | --- |
| `/` | Public Home for a fresh noninstalled visitor; kiosk welcome when the public introduction is dismissed or the installed entry is used |
| `/features`, `/about`, `/team`, `/faq`, `/terms`, `/privacy` | Corresponding public page while the marketing shell is active |
| `/kiosk`, `/kiosk/` | Map to welcome; installed/public-intro state still affects which shell appears |
| `/select-role` | Admin or Expert Grader workspace choice |
| `/admin` | Admin PIN screen, or authenticated dashboard; both share this route |
| `/kiosk/<screen>` | Recognized screen identifiers from `kioskState.ts` |

Screen identifiers: `welcome`, `select-role`, `admin`, `admin-dashboard`, `grader`, `grader-dashboard`, `sample`, `association`, `tutorial`, `weight`, `camera`, `review`, `analysis`, `individual-result`, `overview`, `print`, `complete`.

Path recognition does not restore an entire grading session. Screen state, captures, identity, and navigation prerequisites must remain coordinated. The test suite contains route/recovery checks.

Installed detection uses standalone display mode or localStorage `tunaeye-installed`. The initial loading screen lasts about 750ms. Marketing **Start Grading** dismisses the public introduction and reveals the kiosk welcome; **Get started** then opens role selection.

Refresh recovery applies to installed entry: a reload clears the unfinished in-memory flow and returns to role selection, while a stale reload after at least 30 minutes since recorded activity returns to kiosk welcome. Completed local records remain. This is a reload-time check, not a continuous 30-minute inactivity timer. Completion separately returns home after 30 seconds.

## 5. Current implemented grading workflow

1. Open kiosk welcome → **Get started** → choose **Expert Grader**.
2. Enter/select grader identity; optionally remember the name.
3. Select **Sashibo core**, **Tail cut**, or both in advance.
4. With both samples, specify same fish or different fish.
5. Follow the three-step placement tutorial. It can be skipped after at least two sessions by that grader in the last 30 minutes.
6. Enter fish weight. Current validation accepts 15–200kg inclusive. Same-fish samples share Fish 1 and its weight; different-fish samples use Fish 1 for core and Fish 2 for tail.
7. View the Pi camera stream; capture a snapshot or upload a valid specimen image.
8. Save the captured Blob locally first, then review it. Retake or **Use Image**.
9. Run inference from the stored Blob. Preserve the returned prediction and provenance.
10. Show the individual result. Uncertain results require retake or expert review; invalid images offer retake. Valid results allow manual override.
11. Continue to the next preselected sample, if any, otherwise open the overview.
12. Review separate sample results and print separate receipts, then finish or grade another.

`sampleOrder` is core then tail. Default selection is core alone. A tail-only session is currently supported.

### Confidence and grade behavior today

The live rule in `gradePiImage` is:

```text
INVALID prediction -> invalid
otherwise confidence < 70% -> uncertain
otherwise confidence >= 70% -> valid
```

Demo results use the same 70% status boundary. Model grades are A/B/C; INVALID is a rejection status. B+ appears in public marketing copy but is not a `Grade` union member.

Effective displayed grade is `overrideGrade ?? originalGrade`. Same-fish overview can display an arithmetic average of original model confidences, rounded to a whole percentage. It still retains separate sample grades and receipts. That average is not a combined final-grade algorithm.

There is no automatic 80% core-to-tail fallback or grade-fusion implementation in the inspected frontend. No shift-open requirement was found in the inspected application/reducer, despite generic workflow instructions mentioning it.

## 6. Supplied TunaEye V2 workflow — requirement only

This section records the user's intended future workflow. It has **not** been implemented by this documentation task, and must not be mistaken for the current behavior above.

| Assessment | Confidence | Intended next action |
| --- | --- | --- |
| Sashibo Core: primary input | Above 80% | Accept its predicted grade, display it, and use it as the final grade |
| Sashibo Core | Below 80% | Request a supplementary Tail-Cut sample |
| Tail-Cut: supplementary input | Above 80% | Accept the tail prediction and combine core + tail evidence to determine the final grade |
| Tail-Cut | Below 80% | Require manual override / expert grader intervention |

Before later implementation, the requirement still needs rules for exactly **80%**, how to combine differing core/tail grades, invalid/unavailable predictions, and which combined decision/price/receipt fields to persist. These are unresolved requirements, not permission to invent behavior. The user explicitly asked to preserve logic during the current documentation/redesign preparation.

## 7. Capture and Raspberry Pi integration

The inspected camera screen uses the Pi stream and snapshot endpoints. It does not implement browser `getUserMedia()` webcam selection. Upload accepts nonempty decodable JPEG, PNG, or WebP files up to 10MB.

`src/piClient.ts` supports:

| Mode | Endpoint selection |
| --- | --- |
| Pi local hosting | `VITE_PI_LOCAL_HOSTED=true`: same-origin `/status`, `/stream`, `/snapshot`, `/grade` |
| Hosted HTTPS | Configured `VITE_PI_GATEWAY_URL`, or a saved HTTPS gateway; HTTP mixed-content requests are blocked with connection guidance |
| Development/local HTTP | Saved URL or build-time LAN URL; defaults API `http://10.42.0.1:5000`, camera `http://10.42.0.1:8080` |

Requests use an 8-second timeout and bounded retries. HTTPS gateway requests include credentials. Gateway authentication, CORS, and network access must be configured outside this frontend.

Inference contract:

```text
POST /grade (multipart/form-data)
  image_type: sashibocore | tailcut
  image: captured image Blob

Required response:
  id, capture_id: nonempty strings
  grade: A | B | C | GRADE_A | GRADE_B | GRADE_C | INVALID
  confidence: finite numeric probability or percentage
  scores: finite numeric GRADE_A, GRADE_B, GRADE_C, INVALID
  image_type: if supplied, must match the requested sample
```

Confidence is normalized from 0–1 or 0–100 into a percentage and validated. Raw confidence, all scores, capture/inference IDs, image type, and model source are retained. On inference failure the image stays stored and the UI returns to review with a notice.

Actual model weights, training, image preprocessing, camera server, and Pi backend execution are outside this frontend checkout; the client contract alone does not establish model accuracy or hardware latency.

## 8. State, evidence, records, and pricing

| Layer | Current storage / contents |
| --- | --- |
| Active session | React reducer memory: screen, role/name, samples, fish association/weights, tutorial/sample index, predictions, overrides, auth/print state |
| Completed record metadata | localStorage `tunaeye-records` via `gradingRecords.ts` |
| Captured image bytes | IndexedDB database `tunaeye-offline`, object store `evidence` |
| Preview URLs | Temporary object URLs in the active UI; not durable evidence |
| Station preferences | localStorage station name, endpoint/model preferences, grader list/name, prices, install/demo flags |
| Local audit | localStorage `tunaeye-audit-log`, capped at 500 events |

Records are saved when analysis results become available/updated, before printing. Record/evidence IDs use `<sessionId>-<sample order index + 1>`. A record includes grader, sample/fish identity, weight, grade/status, timestamps, evidence reference, original model output, override metadata, inference provenance, financial snapshot, and sync status.

Evidence includes Blob/MIME, capture time, sample/fish/session identity, sync state and optional remote path. Keep image bytes in IndexedDB; do not move them into localStorage.

`pricing.ts` defaults are PHP/kg A=420, B=350, C=280. The administrator can edit the local schedule. Saved records contain the rate and rounded amount snapshot, so sync retries use stored financial values rather than current prices.

## 9. Cloud synchronization and authentication

Current grading-record sync is **manual**, invoked by explicit dashboard **Sync now** actions. A Wi-Fi reconnect or the internet-recovery toast must not be described as automatically uploading records.

`syncPendingRecords`:

1. Checks configuration, pending records and cloud reachability, then obtains an existing Supabase session or anonymous kiosk user.
2. Loads the local evidence and uploads it to private bucket `grading-images` under a user/record/sample path.
3. Upserts `grading_records` using the stable local ID.
4. Reads the complete persisted row back and verifies fields, including score values independent of JSON key order.
5. Downloads the private cloud image and checks its bytes against the local Blob.
6. Marks evidence and record synced only after verification.

Network failures preserve pending work and report waiting for internet; other failures remain retryable. A shared active promise prevents duplicate concurrent sync runs. Cleanup retains the newest 200 **verified synced** records locally; pending/failed records are excluded from that retention cap.

Price schedules have a separate upsert/readback path. Admin cloud records are fetched from Supabase; there is no implemented Convex client/dependency in the inspected application.

`navigator.onLine` indicates network connectivity, not cloud reachability. A timed no-store `/auth/v1/health` probe and event listeners support connectivity feedback without automatic record writes. The Pi hotspot can provide camera/inference while internet remains unavailable.

Admin entry uses the hardcoded station PIN. Hosted non-localhost builds with Supabase configured additionally require an authenticated Supabase profile with `role=admin`; the magic-link return URL is `/admin`. This is distinct from anonymous kiosk sync identity. Do not treat the client-side station PIN as server authorization.

Schema files:

- `202610070001_shared_grading_contract.sql`: shared tables, policies and storage contract.
- `202610090002_inference_provenance.sql`: original inference metadata/provenance.
- `202610100001_grading_prices.sql`: price fields and schedules.

Repository migrations do not prove the deployed database has applied them. No private environment values or credentials are included in these documents.

## 10. Overrides, printing, and hardware limits

Overrides unlock through a station PIN, select A/B/C and optionally record a reason; the original prediction/confidence remains alongside override actor/time. Preserve this provenance when restyling.

Printing uses `window.print()` and an 80mm receipt layout, with a receipt per selected sample. Opening/returning from the print dialog does not confirm paper output. Completion can also follow the explicit skip flow.

Device diagnostics expose serial/Bluetooth pairing capabilities, but the current weight form is manual entry. Pairing does not establish a working scale reading/parser integration. No SQLite persistence implementation was found in the inspected frontend; its current durable browser stores are localStorage and IndexedDB.

Physical Pi camera, lighting chamber, scale, Bluetooth thermal printer, paper output, image quality and actual device connectivity require separate integration tests.

## 11. Using the separate HTML kiosk design later

Yes: the separate design can be used as a presentation reference and adapted into React screen components connected to existing handlers. The root `index.html` currently inspected is only the Vite entry shell; it does not contain a replacement kiosk design. The separate new design has not been identified or connected in this task.

Preserve these connections when integration is requested:

- Reducer/session types and actions in `kioskState.ts`.
- Role selection, grader identity, sample/fish association, tutorial and weight validation.
- Capture → IndexedDB save → review → inference orchestration in `App.tsx`.
- Result statuses, original predictions, PIN override and provenance.
- Stable record/evidence IDs, financial snapshots, manual sync and verification.
- Route/history behavior, installed/public entry, refresh recovery, notices and error states.
- Receipt/print/skip/completion actions and tablet accessibility.

Replacing the entry shell with unrelated static HTML alone does not wire its buttons, fields or results into React. A UI-only integration should retain current business behavior; the proposed V2 decision policy is a separate future change. No replacement, integration, dependency install, commit or deployment was performed for this request.

## 12. Run, build, deploy, and verify

Commands from `package.json` (project instructions require the `rtk` prefix):

```powershell
rtk npm run dev
rtk npm run build
rtk npm run build:pi
rtk npm run preview
rtk npm run build:android
rtk npm run open:android
rtk npx playwright test
```

Node requirement in `package.json` is >=18. `pnpm-lock.yaml` and `pnpm-workspace.yaml` are present; Android scripts use pnpm. Standard build runs TypeScript then Vite; Pi build uses `--mode pi`. Neither is needed to change Markdown alone.

Relevant environment variable **names**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_PI_API_URL`, `VITE_PI_CAMERA_URL`, `VITE_PI_LOCAL_HOSTED`, `VITE_PI_GATEWAY_URL`, `VITE_DEMO_MODE`. See `.env.example`; actual values are intentionally omitted. `VITE_DEMO_MODE=false` is an absolute gate: saved flags or `?demo=1` cannot enable simulated grading.

PWA manifest requests fullscreen/standalone landscape entry at `/`. Production registers `/sw.js`; development unregisters it. Current service-worker code bypasses Pi API paths and no-store requests. Vercel config serves `dist` with SPA rewrites. Capacitor uses app ID `com.tunaeye.kiosk`, webDir `dist`, and a native lock-task exit bridge.

Available browser coverage:

| File | Coverage area |
| --- | --- |
| `tests/kiosk.spec.ts` | Marketing/kiosk navigation, roles/admin, tablet layouts, inputs/weight, capture/upload, inference/results/override, local records, printing, recovery |
| `tests/demo-mode.spec.ts` | Demo build gate and activation behavior |
| `tests/supabase-sync.spec.ts` | Cloud record/image persistence, price/provenance verification, retries/retention |
| `tests/hotspot-sync.spec.ts` | Pi Wi-Fi versus internet, offline preservation, explicit sync and recovery |
| `tests/offline-cache.spec.ts` | Offline shell/cache behavior |

`playwright.config.ts` uses Chrome, a default 1280×800 viewport, local server port 4178 and retained failure traces. Some tests are environment-gated. Project rules require browser verification of every later UI change, relevant tablet sizes, console/network checks and existing suites. Test availability here is not a statement that the full suite was executed for this documentation-only task.

## 13. Supporting documents and current-task verification

Read source first when older reports disagree. Useful references: `README.md`, `ARCHITECTURE.md`, `FEATURES.md`, `INSTALLATION.md`, `ANDROID_KIOSK_SETUP.md`, `RASPBERRY_PI_LOCAL_HOSTING.md`, `docs/VERCEL_CAMERA_GATEWAY.md`, `docs/SHARED_SUPABASE_CONTRACT.md`, and `docs/STATION_IDENTITY_MIGRATION.md`.

Verification for this task consists of a source audit, asset/path checks, an automated public-copy comparison, documentation cross-checks and diff inspection. Targeted local Chrome/Playwright observations at 1440×1000 and 390×844, including all seven public pages and selected interactions, are recorded in `content.md`. Full app tests, hardware execution, live cloud writes, deployed-page verification, model benchmarks and a production build are not claimed for these Markdown additions. Existing unrelated work is preserved.
