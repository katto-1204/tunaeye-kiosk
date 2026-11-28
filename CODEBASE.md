# TunaEye Kiosk — codebase memory

Local-first grading station for tuna sashibo. The React app runs in a browser or on a Raspberry Pi kiosk, grades images on the Pi, stores records on the device, and syncs them to Supabase only when someone presses Sync now.

## How to run

- `npm run dev` — station app at `http://localhost:3000`. Demo mode stays off.
- `npm run dev:demo` — same app with simulated camera and models. Use this for user and expert presentations.
- `npm run build:demo` — production bundle with the same hardware-free demo mode.
- `npm run build` / `npm run build:pi` — production bundle. The Pi build serves the camera and grade API from the same origin.
- `npx playwright test` — browser checks. The suite starts the dev server on port 4178.

`VITE_DEMO_MODE=false` is a hard gate. A saved browser flag or `?demo=1` cannot turn simulation on. `npm run dev:demo` sets the flag, and that build starts already in demo mode.

## Grading workflow (V2)

One fish. Sashibo core is always the main sample. The grader does not pick a sample type, confirm “same fish,” or step through the tutorial before capture. Those older screens still exist for direct links.

1. Enter the operator name, or start from the grader dashboard.
2. Enter the fish weight (15–200 kg).
3. Capture the sashibo core (with Food Safety notice shown in the scanning footer). The image is saved and graded immediately.
4. Confidence gate at **75%** (`ACCEPT_CONFIDENCE = 75` in `src/kioskState.ts`):
   - **75% or above (Grade A or B):** that predicted grade is final. The next action is **Print receipt**.
   - **Below 75% or Grade C:** prompt for a tail-cut sample (or continue provisionally if unavailable).
5. Tail-cut gate at **75%**:
   - **Agreement or 1-tier blend at 75%+ average:** blend both model score vectors (`GRADE_A`, `GRADE_B`, `GRADE_C`) and print.
   - **Below 75% average or A-vs-C disagreement:** display the normal Grade card with a **FLAGGED FOR MANUAL OVERRIDE** chip so an operator can call an Admin-registered Expert Grader (personal 4-digit PIN + optional 100% offline TOTP 2FA).
6. One 58mm thermal receipt for the fish (with visual-assist food-safety footer), then the session is done.

Invalid images (the model class `INVALID`) ask for a retake instead of a tail cut or a blend.

The rule lives in `decisionFor()` in `src/kioskState.ts`. Active entrypoint is `src/main.tsx` → `launchExactUI()` in `src/exact-ui.ts` (while `src/App.tsx` remains as legacy reference). Local durability mirrors records, evidence, expert graders, PIN/2FA config, prices, and audit logs to SQLite WAL (`server/station.py`) and syncs records + audit logs to Supabase when online.

## Demo mode

On `npm run dev:demo`, the camera shows three outcomes before capture:

| Choice | Sashibo | Tail cut | What the audience sees |
| --- | --- | --- | --- |
| Sashibo accepts | A at 96.3% | not used | Grade, then print |
| Tail cut needed | C at 74.2% | B at 91.4% | Tail-cut prompt, then a blended grade |
| Expert needed | B at 68.1% | C at 66.4% | Expert PIN and grade, then print |

Samples come from `public/DEMO_SAMPLES/`. No Raspberry Pi is required.

## Main files

| File | Role |
| --- | --- |
| `src/App.tsx` | Screens, capture, grading, printing, admin and grader dashboards |
| `src/kioskState.ts` | Session reducer, sample order, 80% decision |
| `src/piClient.ts` | Pi status, snapshot, and `/grade` |
| `src/demoMode.ts` | Demo gate and the three presentation outcomes |
| `src/gradingRecords.ts` | Local record list in `localStorage` |
| `src/evidenceStorage.ts` | Captured images in IndexedDB |
| `src/cloudSync.ts` | Manual Supabase upload and read-back |
| `src/pricing.ts` | Peso price from grade and weight |
| `src/MarketingLanding.tsx` | Public site shown before the installed kiosk |
| `tests/` | Playwright coverage for the kiosk, sync, and workflow |

## Screen path

`welcome` → role → grader name or admin PIN → grader dashboard → **weight → camera → analysis → result → print → complete**.

Tail cut returns to the camera once. Expert override is a modal, then the receipt. Admin records, settings, and devices stay on `/admin`.

Completed records stay on the device as `pending` until Sync now. Connecting to the Pi hotspot is not treated as internet.

## Hardware this app does not replace

Playwright and demo mode do not prove the Pi camera, the Bluetooth or USB thermal printer, the scale, or the lighting chamber. Those still need a check on the station.
