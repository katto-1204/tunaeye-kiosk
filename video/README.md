# TunaEye v2.7 animated demo

Complete eight-act film following `../docs/TUNAEYE_ANIMATED_DEMO_VIDEO_FLOW.md`: 160 seconds, 1920×1080, 60fps, 9,600 frames, H.264 MP4 with AAC stereo 48kHz audio.

Final: `out/tunaeye-demo-v2.7.mp4`.

```powershell
cd video
npm ci
npm run dev
npm run typecheck
node scripts/check-timeline.mjs
npx remotion render TunaEyeDemo out/tunaeye-demo-v2.7.mp4
node scripts/verify-export.mjs
node scripts/verify-browser.mjs
```

The browser verifier uses the repository's existing Playwright installation; install the root dependencies if needed. `ffmpeg` and `ffprobe` must be on PATH for media verification and audio production. Studio uses port 3107; the browser verifier serves the MP4 locally with range requests.

| Act | Time | Content |
| --- | --- | --- |
| 1 | 0:00–0:18 | Brand, landing page, station welcome |
| 2 | 0:18–0:36 | Grader identity, readiness illustration, weight |
| 3 | 0:36–0:54 | Three placement steps, Pi capture, scan sweep |
| 4 | 0:54–1:50 | All 12 presets; A/B/C, Tail-Cut, provisional, invalid, PIN override |
| 5 | 1:50–2:02 | Receipt, three-second countdown, next fish |
| 6 | 2:02–2:14 | Grader dashboard, empty history, record evidence |
| 7 | 2:14–2:32 | Admin PIN, overview, records, graders, devices, settings, audit, mobile/cloud sync |
| 8 | 2:32–2:40 | Brand resolve |

`src/TunaEyeDemo.tsx` owns the eight act boundaries and absolute frame audio cues. Each outgoing act includes 24 transition handles, so transitions preserve the storyboard's start times. `DecisionMontage.tsx` exports its local cue and beat metadata and asserts its 3,360-frame duration. Animation uses Remotion frame values, spring motion and interpolation; there are no time-based CSS animations.

`scripts/sync-assets.py` copies and hashes the supplied logo, screenshots and local Open Runde, Inter and Instrument Serif fonts. All 41 storyboard screenshot references are included; `public/kiosk-screens/` also contains the remaining PNGs. The weight screenshot shows 85kg, so the caption describes weight entry without claiming a different displayed value. Welcome/sync workflow footers receive a presentation overlay to keep older 80% wording from contradicting the requested 75% decision rules. Copied source image files remain unchanged.

Original procedural audio is reproducible with `node scripts/generate-audio.mjs`: thirteen effects and a 160-second 98 BPM C-major marimba/ocean bed, with suspended tension and a resolved ending. Eight padded act narration clips are produced by `node scripts/generate-narration.mjs --local` using Windows System.Speech (Microsoft Zira). The optional neural service returned HTTP 403, so local narration is the delivered voice. Audio measurements and exact speech placements are in `public/audio/*report.json` and `narration-manifest.json`.

The video presents the supplied demonstration screens and documented decisions; it does not execute live inference, hardware printing or cloud writes. Readiness and cloud motion are explanatory graphics. The kiosk app and both earlier video projects are outside this project's scope.

Verification artifacts live in `qa/`: exported media analysis, browser results, decoded-frame contact sheet, visual review and the separate existing-kiosk-suite baseline. Unexpected concurrently written Root/timeline versions were preserved in `qa/concurrent-source/` before integrating the requested complete storyboard.
