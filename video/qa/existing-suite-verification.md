# Existing kiosk suite baseline

Result: **2 passed, 44 failed, 4 skipped**. All 50 existing tests were attempted; the completed run took 5.6 minutes.

```powershell
node node_modules/@playwright/test/cli.js test --config=video/qa/existing-suite.config.ts --fully-parallel --workers=4 --trace=off --global-timeout=600000
```

Scope: existing main-kiosk tests against unchanged production source. This baseline is separate from the new video's Studio, exported-media and playback assertions. Most failures target legacy React selectors and routes absent from the current iframe kiosk, including Get started, Capture, grader forms and role cards. The offline-cache VM fixture also lacks self.location.origin. These failures were not repaired because the user explicitly excluded main-app changes.

An initial run with default scheduling stalled in browser-context teardown and was interrupted. The bounded rerun above completed normally. Its assertions and application source were unchanged; scheduling was parallelized and trace capture disabled to avoid the teardown stall.

Full results: `existing-suite-report.json`. Failure context: `kiosk-artifacts/`. Environment-specific skips include Pi hosting, hosted gateway and mock Supabase configuration. This result must not be described as a passing kiosk suite or live hardware/cloud verification.
