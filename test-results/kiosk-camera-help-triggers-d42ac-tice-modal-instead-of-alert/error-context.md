# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: kiosk.spec.ts >> camera help triggers custom notice modal instead of alert
- Location: tests\kiosk.spec.ts:402:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: /Align the sample/i })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('heading', { name: /Align the sample/i }) with timeout 5000ms
  - waiting for getByRole('heading', { name: /Align the sample/i })

```

```yaml
- iframe
```

# Test source

```ts
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
  345 |     await expect(input).toBeVisible()
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
> 405 |   await expect(page.getByRole('heading', { name: /Align the sample/i })).toBeVisible({ timeout: 5000 })
      |                                                                          ^ Error: expect(locator).toBeVisible() failed
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
  446 |     // @ts-expect-error Vite serves this browser-only integration module during Playwright tests.
  447 |     const client = await import('/src/piClient.ts')
  448 |     return client.checkPiHealth()
  449 |   })
  450 |   expect(status).toMatchObject({ status: 'ok', models: { sashibocore: true, tailcut: true } })
  451 | 
  452 |   const cases = [
  453 |     ['GRADE_A', 'A', 'valid', 96.3],
  454 |     ['GRADE_B', 'B', 'valid', 91],
  455 |     ['GRADE_C', 'C', 'valid', 78],
  456 |     ['INVALID', null, 'invalid', 12],
  457 |   ] as const
  458 |   for (const [backendGrade, grade, outcome, confidence] of cases) {
  459 |     response = { id: `result-${backendGrade}`, capture_id: `capture-${backendGrade}`, image_type: 'sashibocore', grade: backendGrade, confidence: confidence / 100, scores: { GRADE_A: .01, GRADE_B: .02, GRADE_C: .03, INVALID: .94 } }
  460 |     await expect(callClient('Sashibo core')).resolves.toMatchObject({ grade, outcome, confidence, rawConfidence: confidence / 100, imageType: 'sashibocore', modelSource: 'raspberry-pi', scores: response.scores })
  461 |   }
  462 | 
  463 |   response = { ...response, id: 'tail-result', capture_id: 'tail-capture', image_type: 'tailcut', grade: 'GRADE_C', confidence: .78 }
  464 |   await expect(callClient('Tail cut')).resolves.toMatchObject({ grade: 'C', imageType: 'tailcut' })
  465 | 
  466 |   response = { ...response, scores: { GRADE_A: .1, GRADE_B: .2, GRADE_C: .7 } } as typeof response
  467 |   await expect(callClient('Tail cut')).rejects.toThrow('Inference failed: malformed prediction response.')
  468 | 
  469 |   gradeStatus = 503
  470 |   await expect(callClient('Tail cut')).rejects.toThrow('Inference failed: HTTP 503.')
  471 | 
  472 |   const overridden = await page.evaluate(async () => {
  473 |     // @ts-expect-error Vite serves this browser-only state module during Playwright tests.
  474 |     const state = await import('/src/kioskState.ts')
  475 |     let session = state.reducer(state.initialSession, { type: 'finishAnalysis', outcome: 'valid', grade: 'A', confidence: 96.3, rawConfidence: .963, inferenceId: 'result-A', captureId: 'capture-A', scores: { GRADE_A: .963, GRADE_B: .02, GRADE_C: .01, INVALID: .007 }, imageType: 'sashibocore', modelSource: 'raspberry-pi' })
  476 |     session = state.reducer(session, { type: 'setOverride', sample: 'Sashibo core', grade: 'C', reason: 'Expert visual inspection' })
  477 |     return session.results['Sashibo core']
  478 |   })
  479 |   expect(overridden).toMatchObject({ originalGrade: 'A', originalConfidence: 96.3, rawConfidence: .963, inferenceId: 'result-A', captureId: 'capture-A', overrideGrade: 'C', overrideReason: 'Expert visual inspection' })
  480 | })
  481 | 
  482 | test('local record storage does not silently truncate unsynced records', async ({ page }) => {
  483 |   await page.goto('/')
  484 |   const count = await page.evaluate(async () => {
  485 |     // @ts-expect-error Vite serves this browser-only storage module during Playwright tests.
  486 |     const records = await import('/src/gradingRecords.ts')
  487 |     records.saveRecords(Array.from({ length: 250 }, (_, index) => ({
  488 |       id: `pending-${index}`, sessionId: `session-${index}`, timestamp: index, time: 'Now', grader: 'Tester', sample: 'Sashibo core', fish: 'Fish 1', weight: '1 kg', grade: 'A', status: 'Complete',
  489 |       transaction: { currency: 'PHP', amount: null, syncState: 'pending' },
  490 |     })))
  491 |     return records.loadRecords().length
  492 |   })
  493 |   expect(count).toBe(250)
  494 | })
  495 | 
  496 | test('local Raspberry Pi hosting uses same-origin API and camera routes', async ({ page }) => {
  497 |   test.skip(process.env.VITE_PI_LOCAL_HOSTED !== 'true', 'Only runs for the Raspberry Pi local-hosted build mode.')
  498 |   const requests: string[] = []
  499 |   await page.route('**/snapshot', route => { requests.push(route.request().url()); return route.fulfill({ contentType: 'image/jpeg', body: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) }) })
  500 |   await page.route('**/grade', route => { requests.push(route.request().url()); return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: 'local-result', capture_id: 'local-capture', image_type: 'sashibocore', grade: 'GRADE_A', confidence: .96, scores: { GRADE_A: .96, GRADE_B: .02, GRADE_C: .01, INVALID: .01 } }) }) })
  501 |   await page.goto('/')
  502 |   const result = await page.evaluate(async () => {
  503 |     // @ts-expect-error Vite serves this browser-only integration module during Playwright tests.
  504 |     const client = await import('/src/piClient.ts')
  505 |     const settings = client.getPiSettings()
```