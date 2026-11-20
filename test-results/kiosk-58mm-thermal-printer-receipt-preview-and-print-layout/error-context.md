# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: kiosk.spec.ts >> 58mm thermal printer receipt preview and print layout
- Location: tests\kiosk.spec.ts:694:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Print the receipt.' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('heading', { name: 'Print the receipt.' }) with timeout 5000ms
  - waiting for getByRole('heading', { name: 'Print the receipt.' })

```

```yaml
- iframe
```

# Test source

```ts
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
  622 |   await expect(page.getByRole('heading', { name: /Fish weight/i })).toBeVisible({ timeout: 5000 })
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
> 700 |   await expect(page.getByRole('heading', { name: 'Print the receipt.' })).toBeVisible({ timeout: 5000 })
      |                                                                           ^ Error: expect(locator).toBeVisible() failed
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
  723 |       position: computed.position
  724 |     }
  725 |   })
  726 |   expect(slipStyle.visibility).toBe('visible')
  727 |   expect(slipStyle.display).toBe('block')
  728 | })
  729 | 
  730 | test('weight entry enforces the 15 to 200 kg range', async ({ page }) => {
  731 |   await page.addInitScript(() => localStorage.setItem('tunaeye-installed', 'true'))
  732 |   await page.goto('/kiosk/weight')
  733 |   const input = page.locator('.weight-input input').first()
  734 | 
  735 |   await page.getByRole('button', { name: '0', exact: true }).click()
  736 |   await page.getByRole('button', { name: '8', exact: true }).click()
  737 |   await expect(input).toHaveValue('8')
  738 |   await expect(page.locator('.weight-limit-dialog')).toContainText('minimum is 15 kg')
  739 |   await expect(page.getByRole('button', { name: 'Start capture' })).toBeDisabled()
  740 | 
  741 |   await page.getByRole('button', { name: 'Clear' }).click()
  742 |   for (const digit of ['8', '9', '9']) await page.getByRole('button', { name: digit, exact: true }).click()
  743 |   await expect(input).toHaveValue('899')
  744 |   await expect(page.locator('.weight-limit-dialog')).toContainText('maximum is 200 kg')
  745 |   await expect(page.getByRole('button', { name: 'Start capture' })).toBeDisabled()
  746 |   await expect(page.locator('.weight-input-display')).toHaveClass(/is-error/)
  747 |   await page.screenshot({ path: 'test-results/weight-limit-1280x800.png', fullPage: false })
  748 | 
  749 |   const inputBox = await input.boundingBox()
  750 |   const unitBox = await page.locator('.weight-input-display b').first().boundingBox()
  751 |   expect(unitBox!.x - (inputBox!.x + inputBox!.width)).toBeLessThanOrEqual(12)
  752 | })
  753 | 
  754 | test('completion actions and grader logout return to the kiosk landing', async ({ page }) => {
  755 |   await page.addInitScript(() => {
  756 |     localStorage.setItem('tunaeye-installed', 'true')
  757 |     localStorage.setItem('tunaeye-grader-name', 'Maria Santos')
  758 |   })
  759 |   await page.goto('/kiosk/complete')
  760 |   await expect(page.getByRole('button', { name: 'Grade another' })).toBeVisible()
  761 |   await expect(page.getByRole('button', { name: 'Dashboard' })).toBeVisible()
  762 |   await page.screenshot({ path: 'test-results/completion-actions-1280x800.png', fullPage: false })
  763 |   await page.getByRole('button', { name: 'Logout' }).click()
  764 |   await expect(page.getByRole('button', { name: 'Get started' })).toBeVisible()
  765 |   await expect(page.locator('.welcome-brand-hero__mark')).toHaveCount(0)
  766 |   await expect(page.locator('.welcome-brand-hero__title')).toContainText('TUNAEYE')
  767 |   expect(await page.evaluate(() => localStorage.getItem('tunaeye-grader-name'))).toBeNull()
  768 | })
  769 | 
  770 | for (const viewport of [
  771 |   { width: 1000, height: 650 },
  772 |   { width: 1024, height: 600 },
  773 |   { width: 1280, height: 800 },
  774 |   { width: 1024, height: 768 },
  775 |   { width: 800, height: 1280 },
  776 |   { width: 1366, height: 768 },
  777 | ]) {
  778 |   test(`QA tablet surfaces fit and remain readable at ${viewport.width}x${viewport.height}`, async ({ page }) => {
  779 |     const browserErrors: string[] = []
  780 |     const failedRequests: string[] = []
  781 |     page.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()) })
  782 |     page.on('pageerror', error => browserErrors.push(error.message))
  783 |     page.on('requestfailed', request => failedRequests.push(`${request.method()} ${request.url()}`))
  784 |     await page.setViewportSize(viewport)
  785 |     await page.addInitScript(() => localStorage.setItem('tunaeye-installed', 'true'))
  786 | 
  787 |     const expectNoHorizontalOverflow = async () => {
  788 |       expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  789 |     }
  790 | 
  791 |     await page.goto('/kiosk/select-role')
  792 |     const roleCards = page.locator('.role-card-v2')
  793 |     await expect(roleCards).toHaveCount(2)
  794 |     expect((await roleCards.first().boundingBox())!.height).toBeGreaterThanOrEqual(200)
  795 |     expect((await roleCards.first().boundingBox())!.width).toBeGreaterThanOrEqual(viewport.width < 900 ? 260 : 300)
  796 |     await expectNoHorizontalOverflow()
  797 | 
  798 |     await page.goto('/kiosk/tutorial')
  799 |     await expect(page.locator('.tutorial-stage__number')).toHaveText('01')
  800 |     await expect(page.locator('.tutorial-stage__number')).toBeVisible()
```