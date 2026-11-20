# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: kiosk.spec.ts >> expert grader identity form is touch-sized and responsive
- Location: tests\kiosk.spec.ts:336:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByLabel('Your name')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByLabel('Your name') with timeout 5000ms
  - waiting for getByLabel('Your name')

```

```yaml
- iframe
```

# Test source

```ts
  245 |   await expect(page.getByRole('heading', { name: "Who's grading?" })).toBeVisible({ timeout: 5000 })
  246 |   await expect(page.locator('.topbar, .topbar-wrapper')).toHaveCount(0)
  247 |   await expect(page.getByRole('button', { name: 'Back' })).toBeVisible()
  248 |   expect((await page.locator('.app-main').boundingBox())!.y).toBe(0)
  249 | })
  250 | 
  251 | test('refresh clears unfinished session, preserves completed records, and returns to role selection', async ({ page }) => {
  252 |   await page.setViewportSize({ width: 1024, height: 600 })
  253 |   await page.addInitScript(() => {
  254 |     localStorage.setItem('tunaeye-installed', 'true')
  255 |     localStorage.setItem('tunaeye-records', JSON.stringify([{ id: 'saved-record', sessionId: 'saved-session', timestamp: Date.now(), time: 'Now', grader: 'Maria Santos', sample: 'Sashibo core', fish: 'Fish 1', weight: '42 kg', grade: 'A', status: 'Complete' }]))
  256 |   })
  257 |   await page.goto('/kiosk/weight')
  258 |   await expect(page.getByRole('heading', { name: /Fish weight/i })).toBeVisible()
  259 |   await page.reload()
  260 | 
  261 |   await expect(page).toHaveURL(/\/select-role$/)
  262 |   await expect(page.getByRole('heading', { name: "Who's grading?" })).toBeVisible({ timeout: 5000 })
  263 |   const dialog = page.getByRole('dialog', { name: "Session wasn't saved" })
  264 |   await expect(dialog).toBeVisible()
  265 |   await expect(dialog).toContainText('unfinished grading session was cleared')
  266 |   const modalBox = await dialog.locator('.modal-card--notice').boundingBox()
  267 |   expect(modalBox!.x).toBeGreaterThanOrEqual(16)
  268 |   expect(modalBox!.y).toBeGreaterThanOrEqual(16)
  269 |   expect(modalBox!.x + modalBox!.width).toBeLessThanOrEqual(1008)
  270 |   expect(modalBox!.y + modalBox!.height).toBeLessThanOrEqual(584)
  271 |   const action = dialog.getByRole('button', { name: 'Choose a role' })
  272 |   await expect(action).toBeFocused()
  273 |   await action.click()
  274 |   await expect(dialog).toHaveCount(0)
  275 |   expect(await page.evaluate(() => JSON.parse(localStorage.getItem('tunaeye-records') ?? '[]')[0]?.id)).toBe('saved-record')
  276 | })
  277 | 
  278 | test('refresh always returns to role selection but only unfinished work shows the warning', async ({ page }) => {
  279 |   await page.addInitScript(() => localStorage.setItem('tunaeye-installed', 'true'))
  280 |   await page.goto('/kiosk/complete')
  281 |   await page.reload()
  282 |   await expect(page).toHaveURL(/\/select-role$/)
  283 |   await expect(page.getByRole('heading', { name: "Who's grading?" })).toBeVisible({ timeout: 5000 })
  284 |   await expect(page.getByRole('dialog')).toHaveCount(0)
  285 | })
  286 | 
  287 | for (const viewport of [{ width: 1024, height: 600 }, { width: 800, height: 1280 }]) {
  288 |   test(`critical kiosk panels never overlap contextual actions at ${viewport.width}x${viewport.height}`, async ({ page }) => {
  289 |     await page.setViewportSize(viewport)
  290 |     await page.route('http://10.42.0.1:8080/**', route => route.fulfill({ contentType: 'image/jpeg', body: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) }))
  291 |     await page.addInitScript(() => localStorage.setItem('tunaeye-installed', 'true'))
  292 | 
  293 |     const cases = [
  294 |       ['/kiosk/sample', '.sample-options'],
  295 |       ['/kiosk/association', '.association-options, .single-fish-card'],
  296 |       ['/kiosk/tutorial', '.tutorial-stage'],
  297 |       ['/kiosk/weight', '.weight-split'],
  298 |       ['/kiosk/camera', '.camera-layout'],
  299 |       ['/kiosk/review', '.review-layout'],
  300 |       ['/kiosk/print', '.print-layout'],
  301 |     ] as const
  302 | 
  303 |     for (const [route, contentSelector] of cases) {
  304 |       await page.goto(route)
  305 |       const content = page.locator(contentSelector)
  306 |       const actions = page.locator('.screen-stack > .bottom-bar')
  307 |       await expect(content).toBeVisible()
  308 |       await expect(actions).toBeVisible()
  309 |       const [contentBox, actionsBox] = await Promise.all([content.boundingBox(), actions.boundingBox()])
  310 |       expect(contentBox!.y + contentBox!.height, `${route} content overlaps actions`).toBeLessThanOrEqual(actionsBox!.y + 1)
  311 |       expect(actionsBox!.y + actionsBox!.height, `${route} actions leave viewport`).toBeLessThanOrEqual(viewport.height)
  312 |       expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route} overflows horizontally`).toBe(true)
  313 |     }
  314 |   })
  315 | }
  316 | 
  317 | test('legal dialogs share safe tablet sizing and visible actions', async ({ page }) => {
  318 |   await page.setViewportSize({ width: 1024, height: 600 })
  319 |   await page.addInitScript(() => localStorage.setItem('tunaeye-installed', 'true'))
  320 |   await page.goto('/kiosk/grader')
  321 |   for (const name of ['Terms and Conditions', 'Privacy Policy']) {
  322 |     await page.getByRole('button', { name }).click()
  323 |     const dialog = page.getByRole('dialog')
  324 |     await expect(dialog).toBeVisible()
  325 |     const box = await dialog.locator('.legal-modal').boundingBox()
  326 |     expect(box!.x).toBeGreaterThanOrEqual(16)
  327 |     expect(box!.y).toBeGreaterThanOrEqual(16)
  328 |     expect(box!.x + box!.width).toBeLessThanOrEqual(1008)
  329 |     expect(box!.y + box!.height).toBeLessThanOrEqual(584)
  330 |     const closeAction = dialog.locator('.legal-modal__actions').getByRole('button', { name: 'Close' })
  331 |     await expect(closeAction).toBeInViewport()
  332 |     await closeAction.click()
  333 |   }
  334 | })
  335 | 
  336 | test('expert grader identity form is touch-sized and responsive', async ({ page }) => {
  337 |   await page.addInitScript(() => localStorage.setItem('tunaeye-installed', 'true'))
  338 | 
  339 |   for (const viewport of [{ width: 1024, height: 600 }, { width: 800, height: 1280 }]) {
  340 |     await page.setViewportSize(viewport)
  341 |     await page.goto('/kiosk/grader')
  342 |     const input = page.getByLabel('Your name')
  343 |     const checkbox = page.getByRole('checkbox', { name: 'Remember my name' })
  344 |     const form = page.locator('.grader-entry__form')
> 345 |     await expect(input).toBeVisible()
      |                         ^ Error: expect(locator).toBeVisible() failed
  346 |     await expect(form).toBeInViewport()
  347 |     expect((await input.boundingBox())!.height).toBeGreaterThanOrEqual(64)
  348 |     expect((await checkbox.boundingBox())!.width).toBeGreaterThanOrEqual(26)
  349 |     expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  350 |   }
  351 | 
  352 |   await page.getByLabel('Your name').fill('Maria Santos')
  353 |   await page.getByRole('button', { name: 'Start grading' }).click()
  354 |   await expect(page).toHaveURL(/\/kiosk\/sample$/)
  355 | })
  356 | 
  357 | test('tablet viewport renders expert grader dashboard in bento layout', async ({ page }) => {
  358 |   await page.setViewportSize({ width: 1024, height: 768 })
  359 |   await page.addInitScript(() => {
  360 |     localStorage.setItem('tunaeye-installed', 'true')
  361 |     localStorage.setItem('tunaeye-grader-name', 'Maria Santos')
  362 |   })
  363 |   await page.goto('/kiosk/grader-dashboard')
  364 |   await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible({ timeout: 5000 })
  365 |   
  366 |   // Verify bento layout container
  367 |   const bento = page.locator('.grader-bento')
  368 |   await expect(bento).toBeVisible()
  369 |   
  370 |   // Left 4 info boxes
  371 |   const infoBoxes = page.locator('.grader-bento__info-grid .grader-info-card')
  372 |   await expect(infoBoxes).toHaveCount(4)
  373 |   
  374 |   // Right hello card
  375 |   const helloCard = page.locator('.grader-bento__hello-card')
  376 |   await expect(helloCard).toBeVisible()
  377 | })
  378 | 
  379 | test('1000x650 grader records and review modal do not overlap', async ({ page }) => {
  380 |   await page.setViewportSize({ width: 1000, height: 650 })
  381 |   await page.addInitScript(() => {
  382 |     localStorage.setItem('tunaeye-installed', 'true')
  383 |     localStorage.setItem('tunaeye-grader-name', 'Owen Pilongo')
  384 |     localStorage.setItem('tunaeye-records', JSON.stringify(Array.from({ length: 3 }, (_, index) => ({
  385 |       id: `record-with-a-long-identifier-${index + 1}`, sessionId: `session-${index}`, timestamp: Date.now() - index * 60000, time: '12:13 AM', grader: 'Owen Pilongo', sample: 'Sashibo core', fish: 'Fish 1', weight: '96 kg', grade: 'A', status: index ? 'Complete' : 'Override', capturedImageId: `missing-${index}`, result: { status: 'valid', originalGrade: 'A', originalConfidence: 96.3, overrideGrade: null, overrideReason: '' }, transaction: { currency: 'PHP', unitRatePerKg: 420, amount: 40320, syncState: 'synced' },
  386 |     }))))
  387 |   })
  388 |   await page.goto('/kiosk/grader-dashboard')
  389 |   const rows = page.locator('.grader-record-item')
  390 |   await expect(rows).toHaveCount(3)
  391 |   for (const row of await rows.all()) expect((await row.boundingBox())!.height).toBeLessThanOrEqual(64)
  392 |   await page.screenshot({ path: 'test-results/grader-dashboard-1000x650.png', fullPage: false })
  393 |   await rows.first().click()
  394 |   const modal = page.locator('.record-review')
  395 |   await expect(modal).toBeVisible()
  396 |   await expect(modal.getByText('₱40,320.00')).toBeVisible()
  397 |   expect(await modal.evaluate(element => element.scrollHeight <= element.clientHeight)).toBe(true)
  398 |   await expect(modal.getByRole('button', { name: 'Close record' })).toBeInViewport()
  399 |   await page.screenshot({ path: 'test-results/record-modal-1000x650.png', fullPage: false })
  400 | })
  401 | 
  402 | test('camera help triggers custom notice modal instead of alert', async ({ page }) => {
  403 |   await page.addInitScript(() => localStorage.setItem('tunaeye-installed', 'true'))
  404 |   await page.goto('/kiosk/camera')
  405 |   await expect(page.getByRole('heading', { name: /Align the sample/i })).toBeVisible({ timeout: 5000 })
  406 |   
  407 |   // Click Help button
  408 |   await page.getByRole('button', { name: 'Help' }).click()
  409 |   
  410 |   // Verify custom notice modal appears
  411 |   const modal = page.locator('.modal-card--notice')
  412 |   await expect(modal).toBeVisible()
  413 |   await expect(modal.getByRole('heading', { name: 'Camera Alignment Guide' })).toBeVisible()
  414 |   
  415 |   // Close modal
  416 |   await page.getByRole('button', { name: 'Understood' }).click()
  417 |   await expect(modal).not.toBeVisible()
  418 | })
  419 | 
  420 | test('camera capture shows progress and recovers from Pi failure', async ({ page }) => {
  421 |   await page.addInitScript(() => localStorage.setItem('tunaeye-installed', 'true'))
  422 |   await page.route('http://10.42.0.1:8080/**', async route => {
  423 |     await new Promise(resolve => setTimeout(resolve, 250))
  424 |     await route.fulfill({ status: 503, body: 'Camera unavailable' })
  425 |   })
  426 |   await page.goto('/kiosk/camera')
  427 |   await page.getByRole('button', { name: 'Capture' }).click()
  428 |   await expect(page.getByRole('button', { name: 'Capturing…' })).toBeDisabled()
  429 |   await expect(page.getByRole('alert')).toContainText('Snapshot failed: HTTP 503')
  430 |   await expect(page.getByRole('button', { name: 'Capture' })).toBeEnabled()
  431 | })
  432 | 
  433 | test('Pi client validates status, model selection, four classes, and malformed predictions', async ({ page }) => {
  434 |   let response = { id: 'result-A', capture_id: 'capture-A', image_type: 'sashibocore', grade: 'GRADE_A', confidence: 0.963, scores: { GRADE_A: 0.963, GRADE_B: 0.02, GRADE_C: 0.01, INVALID: 0.007 } }
  435 |   let gradeStatus = 200
  436 |   await page.route('http://10.42.0.1:5000/status', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ status: 'ok', service: 'TunaEye V2 Inference API', version: '2.0', models: { sashibocore: true, tailcut: true }, classes: ['GRADE_A', 'GRADE_B', 'GRADE_C', 'INVALID'] }) }))
  437 |   await page.route('http://10.42.0.1:5000/grade', route => route.fulfill({ status: gradeStatus, contentType: 'application/json', body: JSON.stringify(response) }))
  438 |   await page.goto('/')
  439 | 
  440 |   const callClient = async (sample: 'Sashibo core' | 'Tail cut') => page.evaluate(async selected => {
  441 |     // @ts-expect-error Vite serves this browser-only integration module during Playwright tests.
  442 |     const client = await import('/src/piClient.ts')
  443 |     return client.gradePiImage(new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: 'image/jpeg' }), selected)
  444 |   }, sample)
  445 |   const status = await page.evaluate(async () => {
```