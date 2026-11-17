# Lessons

- Cloud verification must compare JSON score keys and values without relying on property order; make Supabase browser fixtures return PostgreSQL-style reordered JSON and verify that changed values still fail safely.

- At the target kiosk resolution, verify the final cascade and seeded real records: an empty dashboard can hide table-cell overlap, and a shared modal fallback class can accidentally impose modal dimensions inside table rows.

- Financial values must be snapshotted with the grading record before retry; never recompute historical prices from a mutable current schedule, and keep the stable record ID as the cloud upsert key.

- Recheck live service state immediately after the user says they changed it; distinguish an enabled Supabase Auth setting from a stale Vercel bundle that still needs redeployment.

- Never let an HTTPS deployment inherit HTTP Raspberry Pi defaults: select endpoints by deployment mode, require an authenticated HTTPS gateway for hosted access, and show connection guidance before the browser emits mixed-content requests.

- A local-first sync record is not safely synced until both the full cloud row and its private image object are readable; retention must filter by that verified state and must never use a positional write cap.

- A kiosk form should visually match the importance of its task: use a large touch field, readable label, and clear identity grouping instead of leaving small desktop controls floating in a large panel.

- “Use this color for any blue” means do not preserve a legacy navy tier: use the supplied cobalt for blue surfaces and neutral charcoal for ordinary text that previously used blue-black.

- When the user supplies a palette reference for the whole product, replace both shared tokens and direct component colors; updating only the main theme variables leaves obvious old blues behind.

- Never clean Playwright artifact directories while a browser suite is still running; wait for the process to exit, then restore or remove generated files.

- Input width calculations must include placeholder length; a two-character minimum clips the three-character `0.0` weight display.
- When asked to combine two landing sections, consolidate their unique content into one layout and remove the superseded block; wrapping both blocks in one parent is not a merge.
- Marketing CTAs must match their destination: demos open media, downloads lead to installation, and neither should reuse the grading action.

- Store image blobs in IndexedDB, not `localStorage`; persist one stable evidence ID in record metadata and avoid competing effects that overwrite the same record.
- New landing sections must reuse the established section grid, spacing, and responsive rhythm; validate a full-page desktop screenshot before calling the page fixed.
- When adding JSX to a large page, confirm every rendered component is imported or defined; a placeholder can crash the entire route at render time.
- For kiosk screens, size the content around persistent bottom actions; `height: 100%` on a panel can clip the action row when its parent also contains a footer.

- Validate every tablet layout at short 16:10 browser heights; physical screen size alone is not a CSS viewport.
- Save grading records when inference completes, not only on the final printing screen.
- Separate public-web entry from installed-kiosk entry instead of overloading one landing screen.
- Describe hardware and cloud integrations as connection contracts until real endpoints and credentials exist.
- A responsive admin rail is not the same as a collapsible sidebar. Provide an explicit, visible toggle tied to layout state; keep icons available in the collapsed state and never depend on hover for kiosk controls.
- Tablet QA must target 1024x600, 1280x800, and 1366x768 with larger touch targets, strong contrast, and no clipped bottom actions.
- Put final tablet overrides after legacy compact rules; otherwise a valid QA media query can be silently undone later in the cascade.
- When the user says an element should be removed, delete it from the render tree; styling it differently does not satisfy the request.
- Numeric limits must validate and explain the entered value, never silently rewrite it to the maximum.
- Pagination that only renders after a hidden threshold looks missing during normal QA; keep the controls visible with an explicit page and record count.
- Never auto-trigger Supabase sync on kiosk startup or reconnect; local grading records should stay pending until the user explicitly chooses Sync now, or the app will falsely mark work as in progress before the user has acted.

- VITE_DEMO_MODE=false must be an absolute gate: URL demo requests and saved browser flags must never enable simulated capture or grading when the build disables demo mode. Verify stale storage and query activation together against actual Pi request paths.

- A Pi hotspot connection does not prove internet or Supabase availability. Treat navigator.onLine as network connectivity only; keep cloud sync manual and preserve pending records when DNS or cloud authentication fails.

- Offline sync feedback must describe waiting for internet, identify captured images as saved locally until verified synced, and announce confirmed internet recovery without treating a Wi-Fi event as cloud availability.

- When a request says “demo mode,” verify whether it means a complete hardware-free product walkthrough rather than a single screen or a visual scenario selector. Keep the end-to-end entry point explicit and test it from the public landing page through completion.
