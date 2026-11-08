# Plan

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
- Reports: `qa/export-verification.md`, `qa/playback-verification.json`, `qa/visual-review.md`, `qa/final-contact-sheet.jpg` and `qa/playwright-report.json` inside the new project.
- Inference and camera fixtures are labeled demonstrations; the network is conceptual. Physical hardware, live cloud writes, paper printing, subjective audio listening and manual inspection of every frame were not tested. Production source and the earlier demo were preserved.

## Local records sync needs attention (2026-10-10)
- [x] Check the live cloud schema and reproduce the failing record verification with reordered Supabase JSON.
- [x] Apply the smallest complete fix while retaining unsynced records and evidence.
- [ ] Verify sync/retry with Playwright, run existing suite and production builds.

Scope: shared record sync, corresponding regression tests, required cloud schema/config and task notes. Do not bypass persistence verification or change manual sync behavior.
