# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: kiosk.spec.ts >> completed grading session remains local and pending until cloud sync
- Location: tests\kiosk.spec.ts:606:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: /Fish weight/i })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('heading', { name: /Fish weight/i }) with timeout 5000ms
  - waiting for getByRole('heading', { name: /Fish weight/i })

```

```yaml
- iframe
```

# Test source

```ts
  522 | test('hosted deployment uses only the configured authenticated HTTPS gateway', async ({ page }) => {
  523 |   test.skip(!process.env.VITE_PI_GATEWAY_URL, 'Only runs with a hosted HTTPS gateway test URL.')
  524 |   const requests: string[] = []
  525 |   await page.route('https://gateway.test/stream**', route => { requests.push(route.request().url()); return route.fulfill({ contentType: 'image/jpeg', body: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) }) })
  526 |   await page.route('https://gateway.test/snapshot', route => { requests.push(route.request().url()); return route.fulfill({ contentType: 'image/jpeg', body: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) }) })
  527 |   await page.route('https://gateway.test/grade', route => { requests.push(route.request().url()); return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: 'secure-grade', capture_id: 'secure-capture', image_type: 'sashibocore', grade: 'GRADE_A', confidence: .96, scores: { GRADE_A: .96, GRADE_B: .02, GRADE_C: .01, INVALID: .01 } }) }) })
  528 |   await page.addInitScript(() => localStorage.setItem('tunaeye-installed', 'true'))
  529 |   await page.goto('/kiosk/camera')
  530 |   const result = await page.evaluate(async () => {
  531 |     // @ts-expect-error Vite serves this browser-only integration module during Playwright tests.
  532 |     const client = await import('/src/piClient.ts')
  533 |     const image = await client.capturePiImage('Sashibo core')
  534 |     return { settings: client.getPiSettings(), grade: await client.gradePiImage(image, 'Sashibo core') }
  535 |   })
  536 |   expect(result.settings).toEqual({ mode: 'hosted-gateway', configured: true, apiUrl: 'https://gateway.test', cameraUrl: 'https://gateway.test', streamUrl: 'https://gateway.test/stream', snapshotUrl: 'https://gateway.test/snapshot' })
  537 |   expect(result.grade).toMatchObject({ id: 'secure-grade', captureId: 'secure-capture', modelSource: 'raspberry-pi' })
  538 |   expect(requests.some(url => url.startsWith('http://10.42.0.1'))).toBe(false)
  539 |   expect(requests).toContain('https://gateway.test/snapshot')
  540 |   expect(requests).toContain('https://gateway.test/grade')
  541 | })
  542 | 
  543 | test('printing failure stays on receipt and offers retry', async ({ page }) => {
  544 |   await page.addInitScript(() => {
  545 |     localStorage.setItem('tunaeye-installed', 'true')
  546 |     window.print = () => { throw new Error('Printer unavailable') }
  547 |   })
  548 |   await page.goto('/kiosk/print')
  549 |   await page.getByRole('button', { name: 'Print receipt' }).click()
  550 |   await expect(page.getByRole('dialog', { name: 'Printing failed' })).toBeVisible()
  551 |   await expect(page).toHaveURL(/\/kiosk\/print$/)
  552 |   await expect(page.getByRole('button', { name: 'Try again' })).toBeFocused()
  553 | })
  554 | 
  555 | test('skipping a receipt requires confirmation', async ({ page }) => {
  556 |   await page.addInitScript(() => localStorage.setItem('tunaeye-installed', 'true'))
  557 |   await page.goto('/kiosk/print')
  558 |   await page.getByRole('button', { name: 'Skip printing' }).click()
  559 |   const dialog = page.getByRole('dialog', { name: 'Skip printing?' })
  560 |   await expect(dialog).toBeVisible()
  561 |   await dialog.getByRole('button', { name: 'Keep printing' }).click()
  562 |   await expect(page).toHaveURL(/\/kiosk\/print$/)
  563 | })
  564 | 
  565 | test('uploaded image uses the same saved-evidence and Pi inference flow', async ({ page }) => {
  566 |   let gradeBody = ''
  567 |   const browserErrors: string[] = []
  568 |   const failedRequests: string[] = []
  569 |   page.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()) })
  570 |   page.on('pageerror', error => browserErrors.push(error.message))
  571 |   page.on('requestfailed', request => failedRequests.push(`${request.method()} ${request.url()}`))
  572 |   await page.setViewportSize({ width: 1024, height: 600 })
  573 |   await page.route('http://10.42.0.1:8080/**', route => route.fulfill({ contentType: 'image/jpeg', body: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) }))
  574 |   await page.route('http://10.42.0.1:5000/grade', async route => {
  575 |     gradeBody = route.request().postData() ?? ''
  576 |     await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: 'upload-grade', capture_id: 'upload-capture', grade: 'GRADE_B', confidence: 0.91, scores: { GRADE_A: 0.05, GRADE_B: 0.91, GRADE_C: 0.03, INVALID: 0.01 } }) })
  577 |   })
  578 |   await page.addInitScript(() => localStorage.setItem('tunaeye-installed', 'true'))
  579 |   await page.goto('/kiosk/camera')
  580 |   await expect(page.getByRole('button', { name: 'Upload image' })).toBeInViewport()
  581 |   await page.getByLabel('Upload specimen image').setInputFiles('public/assets/sashiboCoreFull.png')
  582 |   await expect(page.getByRole('heading', { name: 'Sashibo core · Grade B' })).toBeVisible()
  583 |   expect(gradeBody).toContain('sashibocore')
  584 |   expect(gradeBody).toContain('name="image"; filename="capture.png"')
  585 |   const evidence = await page.evaluate(async () => await new Promise<{ mimeType?: string; storedHash?: string; sourceHash?: string }>((resolve, reject) => {
  586 |     const open = indexedDB.open('tunaeye-offline', 1)
  587 |     open.onerror = () => reject(open.error)
  588 |     open.onsuccess = () => {
  589 |       const get = open.result.transaction('evidence').objectStore('evidence').getAll()
  590 |       get.onerror = () => reject(get.error)
  591 |       get.onsuccess = async () => {
  592 |         const stored = get.result[0]
  593 |         const source = await fetch('/assets/sashiboCoreFull.png').then(response => response.blob())
  594 |         const digest = async (blob: Blob) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()))).map(byte => byte.toString(16).padStart(2, '0')).join('')
  595 |         resolve({ mimeType: stored?.mimeType, storedHash: stored?.blob ? await digest(stored.blob) : undefined, sourceHash: await digest(source) })
  596 |       }
  597 |     }
  598 |   }))
  599 |   expect(evidence.mimeType).toBe('image/png')
  600 |   expect(evidence.storedHash).toBe(evidence.sourceHash)
  601 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  602 |   expect(browserErrors).toEqual([])
  603 |   expect(failedRequests).toEqual([])
  604 | })
  605 | 
  606 | test('completed grading session remains local and pending until cloud sync', async ({ page }) => {
  607 |   let gradeBody = ''
  608 |   let gradeBytes: Buffer | null = null
  609 |   await page.route('http://10.42.0.1:8080/**', route => route.fulfill({ contentType: 'image/jpeg', body: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) }))
  610 |   await page.route('http://10.42.0.1:5000/grade', async route => {
  611 |     gradeBody = route.request().postData() ?? ''
  612 |     gradeBytes = route.request().postDataBuffer()
  613 |     await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: 'grade-1', capture_id: 'capture-1', image_type: 'sashibocore', grade: 'GRADE_A', confidence: 0.963, scores: { GRADE_A: 0.963, GRADE_B: 0.025, GRADE_C: 0.01, INVALID: 0.002 } }) })
  614 |   })
  615 |   await page.addInitScript(() => {
  616 |     localStorage.setItem('tunaeye-installed', 'true')
  617 |     localStorage.setItem('tunaeye-grader-name', 'Maria Santos')
  618 |   })
  619 |   
  620 |   // Complete a simulated grading flow
  621 |   await page.goto('/kiosk/weight')
> 622 |   await expect(page.getByRole('heading', { name: /Fish weight/i })).toBeVisible({ timeout: 5000 })
      |                                                                     ^ Error: expect(locator).toBeVisible() failed
  623 |   await page.getByRole('button', { name: '4', exact: true }).click()
  624 |   await page.getByRole('button', { name: '2', exact: true }).click()
  625 |   await page.getByRole('button', { name: 'Start capture' }).click()
  626 |   
  627 |   // Camera screen
  628 |   await expect(page.getByRole('heading', { name: /Align the sample/i })).toBeVisible()
  629 |   await page.getByRole('button', { name: 'Capture' }).click()
  630 |   await expect(page.getByRole('heading', { name: /Sashibo core · Grade/i })).toBeVisible({ timeout: 10000 })
  631 | 
  632 |   const evidence = await page.evaluate(async () => {
  633 |     const database = await new Promise<IDBDatabase>((resolve, reject) => {
  634 |       const request = indexedDB.open('tunaeye-offline', 1)
  635 |       request.onsuccess = () => resolve(request.result)
  636 |       request.onerror = () => reject(request.error)
  637 |     })
  638 |     const records = await new Promise<unknown[]>((resolve, reject) => {
  639 |       const request = database.transaction('evidence').objectStore('evidence').getAll()
  640 |       request.onsuccess = () => resolve(request.result)
  641 |       request.onerror = () => reject(request.error)
  642 |     })
  643 |     database.close()
  644 |     return records
  645 |   })
  646 |   expect(evidence).toHaveLength(1)
  647 |   expect(evidence[0]).toMatchObject({ sample: 'Sashibo core', fishId: 'Fish 1', syncState: 'pending' })
  648 |   await page.getByRole('button', { name: 'Manual override' }).click()
  649 |   const override = page.getByRole('dialog', { name: 'Manual override' })
  650 |   await expect(override).toBeVisible()
  651 |   await expect(override.locator('.otp-inputs input')).toHaveCount(4)
  652 |   await expect(override.locator('.pin-key-btn')).toHaveCount(12)
  653 |   const overrideBox = await override.locator('.override-modal').boundingBox()
  654 |   expect(overrideBox!.y + overrideBox!.height).toBeLessThanOrEqual(800)
  655 |   await expect(override.getByRole('button', { name: 'Unlock override' })).toBeInViewport()
  656 |   await override.getByRole('button', { name: 'Cancel' }).click()
  657 |   await page.getByRole('button', { name: 'Print receipt' }).click()
  658 |   
  659 |   // Print screen -> Skip printing to complete
  660 |   await expect(page.getByRole('button', { name: 'Skip printing' })).toBeVisible({ timeout: 5000 })
  661 |   await page.getByRole('button', { name: 'Skip printing' }).click()
  662 |   await page.getByRole('dialog', { name: 'Skip printing?' }).getByRole('button', { name: 'Skip receipt' }).click()
  663 |   
  664 |   // Complete screen
  665 |   await expect(page.getByRole('heading', { name: 'Results printed.' })).toBeVisible()
  666 |   
  667 |   // Return to grader dashboard
  668 |   await page.getByRole('button', { name: 'Dashboard' }).click()
  669 |   await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible()
  670 |   
  671 |   // Verify recent grading records contains the newly completed session
  672 |   const records = page.locator('.grader-record-item')
  673 |   expect(await records.count()).toBeGreaterThanOrEqual(1)
  674 |   await expect(records.first()).toContainText('Sashibo core')
  675 |   await expect(records.first().locator('img')).toBeVisible()
  676 |   const savedRecords = await page.evaluate(() => JSON.parse(localStorage.getItem('tunaeye-records') ?? '[]'))
  677 |   expect(savedRecords[0].capturedImageId).toBeTruthy()
  678 |   expect(savedRecords[0].result).toMatchObject({ inferenceId: 'grade-1', captureId: 'capture-1', originalGrade: 'A', originalConfidence: 96.3, rawConfidence: 0.963, imageType: 'sashibocore', modelSource: 'raspberry-pi' })
  679 |   expect(gradeBody).toContain('name="image_type"')
  680 |   expect(gradeBody).toContain('sashibocore')
  681 |   expect(gradeBody).toContain('name="image"; filename="capture.jpg"')
  682 |   expect(gradeBytes?.includes(Buffer.from([0xff, 0xd8, 0xff, 0xd9]))).toBe(true)
  683 |   expect(savedRecords[0].transaction.syncState).toBe('pending')
  684 |   expect(JSON.stringify(savedRecords)).not.toContain('data:image')
  685 | 
  686 |   await page.context().setOffline(true)
  687 |   await page.getByRole('button', { name: 'Sync now' }).click()
  688 |   await expect(page.getByRole('heading', { name: /Waiting for internet|Sync unavailable/ })).toBeVisible()
  689 |   const afterFailedSync = await page.evaluate(() => JSON.parse(localStorage.getItem('tunaeye-records') ?? '[]'))
  690 |   expect(afterFailedSync[0].transaction.syncState).toBe('pending')
  691 |   await page.context().setOffline(false)
  692 | })
  693 | 
  694 | test('58mm thermal printer receipt preview and print layout', async ({ page }) => {
  695 |   await page.addInitScript(() => {
  696 |     localStorage.setItem('tunaeye-installed', 'true')
  697 |     localStorage.setItem('tunaeye-grader-name', 'Maria Santos')
  698 |   })
  699 |   await page.goto('/kiosk/print')
  700 |   await expect(page.getByRole('heading', { name: 'Print the receipt.' })).toBeVisible({ timeout: 5000 })
  701 | 
  702 |   // Verify 58mm thermal receipt preview & POS-58 chassis indicator
  703 |   const printerChassis = page.locator('.receipt-container-v2')
  704 |   await expect(printerChassis).toBeVisible()
  705 |   await expect(page.getByText('POS-58')).toBeVisible()
  706 | 
  707 |   // Verify physical 58mm thermal slip exists in DOM with ESC/POS 58MM metadata
  708 |   const thermalSlip = page.locator('.thermal-print-slip')
  709 |   await expect(thermalSlip).toHaveCount(1)
  710 |   await expect(thermalSlip).toContainText('TUNAEYE')
  711 |   await expect(thermalSlip).toContainText('QUALITY INSPECTION SLIP')
  712 |   await expect(thermalSlip).toContainText('ESC/POS 58MM')
  713 | 
  714 |   // Verify print media emulation displays the physical 58mm slip cleanly
  715 |   await page.emulateMedia({ media: 'print' })
  716 |   await expect(thermalSlip).toBeVisible()
  717 | 
  718 |   const slipStyle = await thermalSlip.evaluate((el) => {
  719 |     const computed = window.getComputedStyle(el)
  720 |     return {
  721 |       display: computed.display,
  722 |       visibility: computed.visibility,
```