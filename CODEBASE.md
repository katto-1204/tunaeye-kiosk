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

1. Enter the grader name, or start from the grader dashboard.
2. Enter the fish weight (15–200 kg).
3. Capture the sashibo core. The image is saved and graded immediately.
4. Confidence gate at **80%**:
   - **80% or above:** that predicted grade is final. The next action is **Print receipt**.
   - **Below 80%:** capture a tail-cut sample.
5. Tail-cut gate at **80%**:
   - **80% or above:** blend both model score vectors (`GRADE_A`, `GRADE_B`, `GRADE_C`). The class with the higher average score is the final grade, then print.
   - **Below 80%:** an expert must set the grade. Saving that override opens the receipt.
6. One thermal receipt for the fish, then the session is done.

Invalid images (the model class `INVALID`) ask for a retake instead of a tail cut or a blend.

The rule lives in `decisionFor()` in `src/kioskState.ts`. The Pi client still reports its own `valid` / `uncertain` / `invalid` outcome. The 80% gate is separate from that older 70% uncertain cutoff.

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
