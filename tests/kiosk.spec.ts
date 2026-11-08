import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route('**/auth/v1/health', route => route.fulfill({ contentType: 'application/json', body: '{"name":"GoTrue"}' }))
})

test('uninstalled visitors see the public landing after loading and can scroll', async ({ page }) => {
  const browserErrors: string[] = []
  const failedRequests: string[] = []
  page.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()) })
  page.on('pageerror', error => browserErrors.push(error.message))
  page.on('requestfailed', request => failedRequests.push(`${request.method()} ${request.url()}`))

  await page.goto('/')
  await expect(page.locator('.pdial')).toBeVisible()
  await expect(page.getByRole('heading', { name: /Sea Beyond the Cut/i })).toBeVisible({ timeout: 5000 })
  await expect(page.getByRole('button', { name: 'Install kiosk app' })).toBeVisible()
  
  // Verify landing page scrollability
  const isScrollable = await page.evaluate(() => {
    const siteShell = document.querySelector('.site-shell')
    return document.documentElement.scrollHeight > window.innerHeight || (siteShell && siteShell.scrollHeight > window.innerHeight)
  })
  expect(isScrollable).toBe(true)

  const iphone = page.locator('.iphone-16-pro')
  await iphone.scrollIntoViewIfNeeded()
  await expect(iphone).toBeVisible()
  await expect(iphone).toHaveAttribute('viewBox', '0 0 200 400')
  const phoneImage = iphone.locator('image')
  await expect(phoneImage).toHaveAttribute('href', /\/app-screens\/.+\.jpg$/)
  const firstPhoneImage = await phoneImage.getAttribute('href')
  await expect.poll(() => phoneImage.getAttribute('href'), { timeout: 3000 }).not.toBe(firstPhoneImage)
  await iphone.screenshot({ path: 'test-results/iphone-mockup.png' })
  const macbook = page.locator('.demo-macbook')
  await expect(macbook).toBeVisible()
  await expect(macbook).toHaveAttribute('viewBox', '0 0 650 400')
  await page.getByRole('button', { name: /View Demo/ }).first().click()
  await expect(page.getByRole('dialog', { name: 'TunaEye demo video' })).toBeVisible()
  await page.getByRole('button', { name: 'Close demo video' }).click()
  await expect(page.getByRole('dialog', { name: 'TunaEye demo video' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: /Install the station app/ })).toBeVisible()
  const landingLayout = await page.evaluate(() => ({
    demoColumns: getComputedStyle(document.querySelector('.site-demo-video')!).gridTemplateColumns.split(' ').length,
    mobileColumns: getComputedStyle(document.querySelector('.mobile-experience-grid')!).gridTemplateColumns.split(' ').length,
  }))
  expect(landingLayout).toEqual({ demoColumns: 2, mobileColumns: 2 })
  for (const [name, selector] of [['demo', '.site-demo-video'], ['mobile', '.site-mobile-experience']] as const) {
    const section = page.locator(selector)
    await section.scrollIntoViewIfNeeded()
    await expect(section).toBeVisible()
    await section.screenshot({ path: `test-results/landing-${name}-1280x800.png` })
  }
  const footer = page.locator('.site-footer')
  await footer.scrollIntoViewIfNeeded()
  await expect(footer.locator('.site-footer__brand')).toBeVisible()
  await expect(footer.locator('.site-footer__links')).toBeVisible()
  await footer.screenshot({ path: 'test-results/landing-footer-1280x800.png' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.locator('.site-mobile-experience').scrollIntoViewIfNeeded()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(await page.locator('.mobile-experience-grid').evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(1)
  await footer.scrollIntoViewIfNeeded()
  expect(await footer.evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(1)
  await page.screenshot({ path: 'test-results/landing-mobile-390x844.png' })
  expect(browserErrors).toEqual([])
  expect(failedRequests).toEqual([])
})

test('installed tablet opens kiosk welcome screen and enters tight workflow screens', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('tunaeye-installed', 'true'))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /TUNAEYE/i })).toBeVisible({ timeout: 5000 })
  await expect(page.getByRole('button', { name: 'Install' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Go to main page' })).toBeVisible()
  await page.getByRole('button', { name: 'Go to main page' }).click()
  await expect(page.getByRole('heading', { name: /Sea Beyond the Cut/i })).toBeVisible()
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /TUNAEYE/i })).toBeVisible()
  
  // Navigate into kiosk workflow (select-role)
  await page.getByRole('button', { name: /Get started/i }).click()
  await expect(page.getByRole('heading', { name: "Who's grading?" })).toBeVisible()
  
  // Verify interactive kiosk workflow is tight (overflow: hidden, fits viewport)
  const isTight = await page.evaluate(() => {
    const appShell = document.querySelector('.app-shell')
    const htmlOverflow = window.getComputedStyle(document.documentElement).overflowY
    const bodyOverflow = window.getComputedStyle(document.body).overflowY
    return (htmlOverflow === 'hidden' || bodyOverflow === 'hidden') && appShell !== null
  })
  expect(isTight).toBe(true)
})

test('stale kiosk refresh returns to the kiosk landing route', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('tunaeye-installed', 'true')
    localStorage.setItem('tunaeye-last-activity', String(Date.now() - 31 * 60 * 1000))
  })
  await page.goto('/kiosk/review')
  await page.reload()
  await expect(page).toHaveURL(/\/kiosk\/$/)
  await expect(page.getByRole('heading', { name: /TUNAEYE/i })).toBeVisible({ timeout: 5000 })
})

test('kiosk landing fullscreen button forces Chrome fullscreen', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.addInitScript(() => localStorage.setItem('tunaeye-installed', 'true'))
  await page.goto('/')
  const enter = page.getByRole('button', { name: 'Enter fullscreen' })
  await expect(enter).toBeVisible()
  await page.evaluate(() => {
    HTMLElement.prototype.requestFullscreen = async function (options?: FullscreenOptions) {
      ;(window as Window & { __fullscreenOptions?: FullscreenOptions }).__fullscreenOptions = options
      Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => this })
      document.dispatchEvent(new Event('fullscreenchange'))
    }
  })
  await enter.click()
  await expect.poll(() => page.evaluate(() => (window as Window & { __fullscreenOptions?: FullscreenOptions }).__fullscreenOptions)).toEqual({ navigationUI: 'hide' })
  await expect(page.getByRole('button', { name: 'Exit fullscreen' })).toBeVisible()
})

test('role selector uses distinct role icons, focus states, and destinations', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 600 })
  await page.addInitScript(() => localStorage.setItem('tunaeye-installed', 'true'))
  await page.goto('/select-role')
  const admin = page.getByRole('button', { name: /Admin/ })
  const grader = page.getByRole('button', { name: /Expert Grader/ })
  await expect(admin).toBeVisible()
  await expect(grader).toBeVisible()
  expect(await admin.locator('.role-card-v2__icon').innerHTML()).not.toBe(await grader.locator('.role-card-v2__icon').innerHTML())
  await admin.focus()
  await expect(admin).toBeFocused()
  expect(await grader.evaluate(element => getComputedStyle(element).backgroundImage)).toContain('linear-gradient')
  await page.screenshot({ path: 'test-results/role-selector-1024x600.png' })
  await grader.click()
  await expect(page).toHaveURL(/\/kiosk\/grader$/)
  await page.goto('/select-role')
  await page.getByRole('button', { name: /Admin/ }).click()
  await expect(page).toHaveURL(/\/admin$/)
})

test('admin OTP opens diagnostics, audit logs, and logout', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('tunaeye-installed', 'true'))
  await page.goto('/')
  await page.getByRole('button', { name: 'Get started' }).click()
  await page.getByRole('button', { name: /Admin/ }).click()
  for (const [index, digit] of ['1', '2', '3', '4'].entries()) await page.getByLabel(`PIN digit ${index + 1}`).fill(digit)
  await page.getByRole('button', { name: 'Verify and continue' }).click()
  await expect(page.getByText('Good day, Admin.')).toBeVisible()
  await page.getByRole('button', { name: /Settings/ }).click()
  await expect(page.getByText('Raspberry Pi API URL')).toBeVisible()
  await expect(page.getByText('AI model identifier')).toBeVisible()
  await page.getByRole('button', { name: /Audit logs/ }).click()
  await expect(page.getByRole('heading', { name: 'Audit logs' }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible()
})

test('admin dashboard scrolls, graph interacts, and records paginate', async ({ page }) => {
  const browserErrors: string[] = []
  page.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()) })
  page.on('pageerror', error => browserErrors.push(error.message))
  await page.setViewportSize({ width: 1024, height: 600 })
  await page.addInitScript(() => {
    localStorage.setItem('tunaeye-installed', 'true')
    const now = Date.now()
    localStorage.setItem('tunaeye-records', JSON.stringify(Array.from({ length: 19 }, (_, index) => ({
      id: `TE-QA-${String(index + 1).padStart(3, '0')}`,
      sessionId: `QA-${index + 1}`,
      timestamp: now - (index % 7) * 86_400_000,
      time: 'Today, 10:00 AM',
      grader: index % 2 ? 'Maria Santos' : 'Jose Dela Cruz',
      sample: index % 2 ? 'Sashibo core' : 'Tail cut',
      fish: 'Fish 1', weight: `${20 + index} kg`, grade: index % 3 === 0 ? 'A' : 'B', status: 'Model result',
      transaction: { currency: 'PHP', amount: null, syncState: 'synced' },
    }))))
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Get started' }).click()
  await page.getByRole('button', { name: /Admin/ }).click()
  for (const [index, digit] of ['1', '2', '3', '4'].entries()) await page.getByLabel(`PIN digit ${index + 1}`).fill(digit)
  await page.getByRole('button', { name: 'Verify and continue' }).click()

  const adminContent = page.locator('.admin-content')
  await expect(page.getByTestId('admin-simple-graph')).toBeVisible()
  await page.getByRole('button', { name: /samples/ }).last().focus()
  await expect(page.locator('.admin-trend__tooltip')).toBeVisible()
  expect(await adminContent.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true)
  await page.screenshot({ path: 'test-results/admin-graph-1024x600.png', fullPage: false })

  await page.getByRole('button', { name: /Records/ }).click()
  await expect(page.getByText('Showing 1–8 of 19')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Previous' })).toBeDisabled()
  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByText('Showing 9–16 of 19')).toBeVisible()
  await expect(page.getByText('TE-QA-009')).toBeVisible()
  await adminContent.evaluate(element => { element.scrollTop = element.scrollHeight })
  expect(await adminContent.evaluate(element => element.scrollTop)).toBeGreaterThan(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(browserErrors).toEqual([])
  await page.screenshot({ path: 'test-results/admin-records-pagination-1024x600.png', fullPage: false })
})

test('weight numpad entry and touch keypad interaction', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('tunaeye-installed', 'true'))
  await page.goto('/kiosk/weight')
  await expect(page.getByRole('heading', { name: /Fish weight/i })).toBeVisible({ timeout: 5000 })
  await expect(page.locator('.numpad-container')).toBeVisible()
  
  // Tap numpad buttons 3, 5, ., 4
  await page.getByRole('button', { name: '3', exact: true }).click()
  await page.getByRole('button', { name: '5', exact: true }).click()
  await page.getByRole('button', { name: '.', exact: true }).click()
  await page.getByRole('button', { name: '4', exact: true }).click()
  
  // Verify weight input has 35.4
  const input = page.locator('.weight-input input').first()
  await expect(input).toHaveValue('35.4')
  const inputBox = await input.boundingBox()
  const displayBox = await page.locator('.weight-input-display').first().boundingBox()
  expect(inputBox!.x - displayBox!.x).toBeLessThanOrEqual(32)
})

test('grader workflow has a small history shortcut', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('tunaeye-installed', 'true'))
  await page.goto('/kiosk/select-role')
  await page.getByRole('button', { name: /Grader/ }).click()
  await page.getByLabel('Your name').fill('Maria Santos')
  await page.getByRole('button', { name: 'Start grading' }).click()
  const shortcut = page.getByRole('button', { name: 'View grading history' })
  await expect(shortcut).toBeVisible()
  expect((await shortcut.boundingBox())!.width).toBeLessThanOrEqual(44)
  await shortcut.click()
  await expect(page.getByRole('dialog', { name: 'Leave grading session?' })).toBeVisible()
  await expect(page.getByRole('dialog').getByText('Continue grading?')).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: 'Leave session' }).click()
  await expect(page).toHaveURL(/\/kiosk\/grader-dashboard$/)
  await expect(page.getByRole('heading', { name: /Welcome back/ })).toBeVisible()
})

test('kiosk navbar is removed and contextual navigation remains', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('tunaeye-installed', 'true'))
  await page.goto('/kiosk/select-role')
  await expect(page.getByRole('heading', { name: "Who's grading?" })).toBeVisible({ timeout: 5000 })
  await expect(page.locator('.topbar, .topbar-wrapper')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Back' })).toBeVisible()
  expect((await page.locator('.app-main').boundingBox())!.y).toBe(0)
})

test('refresh clears unfinished session, preserves completed records, and returns to role selection', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 600 })
  await page.addInitScript(() => {
    localStorage.setItem('tunaeye-installed', 'true')
    localStorage.setItem('tunaeye-records', JSON.stringify([{ id: 'saved-record', sessionId: 'saved-session', timestamp: Date.now(), time: 'Now', grader: 'Maria Santos', sample: 'Sashibo core', fish: 'Fish 1', weight: '42 kg', grade: 'A', status: 'Complete' }]))
  })
  await page.goto('/kiosk/weight')
  await expect(page.getByRole('heading', { name: /Fish weight/i })).toBeVisible()
  await page.reload()

  await expect(page).toHaveURL(/\/select-role$/)
  await expect(page.getByRole('heading', { name: "Who's grading?" })).toBeVisible({ timeout: 5000 })
  const dialog = page.getByRole('dialog', { name: "Session wasn't saved" })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('unfinished grading session was cleared')
  const modalBox = await dialog.locator('.modal-card--notice').boundingBox()
  expect(modalBox!.x).toBeGreaterThanOrEqual(16)
  expect(modalBox!.y).toBeGreaterThanOrEqual(16)
  expect(modalBox!.x + modalBox!.width).toBeLessThanOrEqual(1008)
  expect(modalBox!.y + modalBox!.height).toBeLessThanOrEqual(584)
  const action = dialog.getByRole('button', { name: 'Choose a role' })
  await expect(action).toBeFocused()
  await action.click()
  await expect(dialog).toHaveCount(0)
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('tunaeye-records') ?? '[]')[0]?.id)).toBe('saved-record')
})

test('refresh always returns to role selection but only unfinished work shows the warning', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('tunaeye-installed', 'true'))
  await page.goto('/kiosk/complete')
  await page.reload()
  await expect(page).toHaveURL(/\/select-role$/)
  await expect(page.getByRole('heading', { name: "Who's grading?" })).toBeVisible({ timeout: 5000 })
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

for (const viewport of [{ width: 1024, height: 600 }, { width: 800, height: 1280 }]) {
  test(`critical kiosk panels never overlap contextual actions at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.route('http://10.42.0.1:8080/**', route => route.fulfill({ contentType: 'image/jpeg', body: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) }))
    await page.addInitScript(() => localStorage.setItem('tunaeye-installed', 'true'))

    const cases = [
      ['/kiosk/sample', '.sample-options'],
      ['/kiosk/association', '.association-options, .single-fish-card'],
      ['/kiosk/tutorial', '.tutorial-stage'],
      ['/kiosk/weight', '.weight-split'],
      ['/kiosk/camera', '.camera-layout'],
      ['/kiosk/review', '.review-layout'],
      ['/kiosk/print', '.print-layout'],
    ] as const

    for (const [route, contentSelector] of cases) {
      await page.goto(route)
      const content = page.locator(contentSelector)
      const actions = page.locator('.screen-stack > .bottom-bar')
      await expect(content).toBeVisible()
      await expect(actions).toBeVisible()
      const [contentBox, actionsBox] = await Promise.all([content.boundingBox(), actions.boundingBox()])
      expect(contentBox!.y + contentBox!.height, `${route} content overlaps actions`).toBeLessThanOrEqual(actionsBox!.y + 1)
      expect(actionsBox!.y + actionsBox!.height, `${route} actions leave viewport`).toBeLessThanOrEqual(viewport.height)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route} overflows horizontally`).toBe(true)
    }
  })
}

test('legal dialogs share safe tablet sizing and visible actions', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 600 })
  await page.addInitScript(() => localStorage.setItem('tunaeye-installed', 'true'))
  await page.goto('/kiosk/grader')
  for (const name of ['Terms and Conditions', 'Privacy Policy']) {
    await page.getByRole('button', { name }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    const box = await dialog.locator('.legal-modal').boundingBox()
    expect(box!.x).toBeGreaterThanOrEqual(16)
    expect(box!.y).toBeGreaterThanOrEqual(16)
    expect(box!.x + box!.width).toBeLessThanOrEqual(1008)
    expect(box!.y + box!.height).toBeLessThanOrEqual(584)
    const closeAction = dialog.locator('.legal-modal__actions').getByRole('button', { name: 'Close' })
    await expect(closeAction).toBeInViewport()
    await closeAction.click()
  }
})

test('expert grader identity form is touch-sized and responsive', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('tunaeye-installed', 'true'))

  for (const viewport of [{ width: 1024, height: 600 }, { width: 800, height: 1280 }]) {
    await page.setViewportSize(viewport)
    await page.goto('/kiosk/grader')
    const input = page.getByLabel('Your name')
    const checkbox = page.getByRole('checkbox', { name: 'Remember my name' })
    const form = page.locator('.grader-entry__form')
    await expect(input).toBeVisible()
    await expect(form).toBeInViewport()
    expect((await input.boundingBox())!.height).toBeGreaterThanOrEqual(64)
    expect((await checkbox.boundingBox())!.width).toBeGreaterThanOrEqual(26)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }

  await page.getByLabel('Your name').fill('Maria Santos')
  await page.getByRole('button', { name: 'Start grading' }).click()
  await expect(page).toHaveURL(/\/kiosk\/sample$/)
})

test('tablet viewport renders expert grader dashboard in bento layout', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 })
  await page.addInitScript(() => {
    localStorage.setItem('tunaeye-installed', 'true')
    localStorage.setItem('tunaeye-grader-name', 'Maria Santos')
  })
  await page.goto('/kiosk/grader-dashboard')
  await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible({ timeout: 5000 })
  
  // Verify bento layout container
  const bento = page.locator('.grader-bento')
  await expect(bento).toBeVisible()
  
  // Left 4 info boxes
  const infoBoxes = page.locator('.grader-bento__info-grid .grader-info-card')
  await expect(infoBoxes).toHaveCount(4)
  
  // Right hello card
  const helloCard = page.locator('.grader-bento__hello-card')
  await expect(helloCard).toBeVisible()
})

test('1000x650 grader records and review modal do not overlap', async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 650 })
  await page.addInitScript(() => {
    localStorage.setItem('tunaeye-installed', 'true')
    localStorage.setItem('tunaeye-grader-name', 'Owen Pilongo')
    localStorage.setItem('tunaeye-records', JSON.stringify(Array.from({ length: 3 }, (_, index) => ({
      id: `record-with-a-long-identifier-${index + 1}`, sessionId: `session-${index}`, timestamp: Date.now() - index * 60000, time: '12:13 AM', grader: 'Owen Pilongo', sample: 'Sashibo core', fish: 'Fish 1', weight: '96 kg', grade: 'A', status: index ? 'Complete' : 'Override', capturedImageId: `missing-${index}`, result: { status: 'valid', originalGrade: 'A', originalConfidence: 96.3, overrideGrade: null, overrideReason: '' }, transaction: { currency: 'PHP', unitRatePerKg: 420, amount: 40320, syncState: 'synced' },
    }))))
  })
  await page.goto('/kiosk/grader-dashboard')
  const rows = page.locator('.grader-record-item')
  await expect(rows).toHaveCount(3)
  for (const row of await rows.all()) expect((await row.boundingBox())!.height).toBeLessThanOrEqual(64)
  await page.screenshot({ path: 'test-results/grader-dashboard-1000x650.png', fullPage: false })
  await rows.first().click()
  const modal = page.locator('.record-review')
  await expect(modal).toBeVisible()
  await expect(modal.getByText('₱40,320.00')).toBeVisible()
  expect(await modal.evaluate(element => element.scrollHeight <= element.clientHeight)).toBe(true)
  await expect(modal.getByRole('button', { name: 'Close record' })).toBeInViewport()
  await page.screenshot({ path: 'test-results/record-modal-1000x650.png', fullPage: false })
})

test('camera help triggers custom notice modal instead of alert', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('tunaeye-installed', 'true'))
  await page.goto('/kiosk/camera')
  await expect(page.getByRole('heading', { name: /Align the sample/i })).toBeVisible({ timeout: 5000 })
  
  // Click Help button
  await page.getByRole('button', { name: 'Help' }).click()
  
  // Verify custom notice modal appears
  const modal = page.locator('.modal-card--notice')
  await expect(modal).toBeVisible()
  await expect(modal.getByRole('heading', { name: 'Camera Alignment Guide' })).toBeVisible()
  
  // Close modal
  await page.getByRole('button', { name: 'Understood' }).click()
  await expect(modal).not.toBeVisible()
})

test('camera capture shows progress and recovers from Pi failure', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('tunaeye-installed', 'true'))
  await page.route('http://10.42.0.1:8080/**', async route => {
    await new Promise(resolve => setTimeout(resolve, 250))
    await route.fulfill({ status: 503, body: 'Camera unavailable' })
  })
  await page.goto('/kiosk/camera')
  await page.getByRole('button', { name: 'Capture' }).click()
  await expect(page.getByRole('button', { name: 'Capturing…' })).toBeDisabled()
  await expect(page.getByRole('alert')).toContainText('Snapshot failed: HTTP 503')
  await expect(page.getByRole('button', { name: 'Capture' })).toBeEnabled()
})

test('Pi client validates status, model selection, four classes, and malformed predictions', async ({ page }) => {
  let response = { id: 'result-A', capture_id: 'capture-A', image_type: 'sashibocore', grade: 'GRADE_A', confidence: 0.963, scores: { GRADE_A: 0.963, GRADE_B: 0.02, GRADE_C: 0.01, INVALID: 0.007 } }
  let gradeStatus = 200
  await page.route('http://10.42.0.1:5000/status', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ status: 'ok', service: 'TunaEye V2 Inference API', version: '2.0', models: { sashibocore: true, tailcut: true }, classes: ['GRADE_A', 'GRADE_B', 'GRADE_C', 'INVALID'] }) }))
  await page.route('http://10.42.0.1:5000/grade', route => route.fulfill({ status: gradeStatus, contentType: 'application/json', body: JSON.stringify(response) }))
  await page.goto('/')

  const callClient = async (sample: 'Sashibo core' | 'Tail cut') => page.evaluate(async selected => {
    // @ts-expect-error Vite serves this browser-only integration module during Playwright tests.
    const client = await import('/src/piClient.ts')
    return client.gradePiImage(new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: 'image/jpeg' }), selected)
  }, sample)
  const status = await page.evaluate(async () => {
    // @ts-expect-error Vite serves this browser-only integration module during Playwright tests.
    const client = await import('/src/piClient.ts')
    return client.checkPiHealth()
  })
  expect(status).toMatchObject({ status: 'ok', models: { sashibocore: true, tailcut: true } })

  const cases = [
    ['GRADE_A', 'A', 'valid', 96.3],
    ['GRADE_B', 'B', 'valid', 91],
    ['GRADE_C', 'C', 'valid', 78],
    ['INVALID', null, 'invalid', 12],
  ] as const
  for (const [backendGrade, grade, outcome, confidence] of cases) {
    response = { id: `result-${backendGrade}`, capture_id: `capture-${backendGrade}`, image_type: 'sashibocore', grade: backendGrade, confidence: confidence / 100, scores: { GRADE_A: .01, GRADE_B: .02, GRADE_C: .03, INVALID: .94 } }
    await expect(callClient('Sashibo core')).resolves.toMatchObject({ grade, outcome, confidence, rawConfidence: confidence / 100, imageType: 'sashibocore', modelSource: 'raspberry-pi', scores: response.scores })
  }

  response = { ...response, id: 'tail-result', capture_id: 'tail-capture', image_type: 'tailcut', grade: 'GRADE_C', confidence: .78 }
  await expect(callClient('Tail cut')).resolves.toMatchObject({ grade: 'C', imageType: 'tailcut' })

  response = { ...response, scores: { GRADE_A: .1, GRADE_B: .2, GRADE_C: .7 } } as typeof response
  await expect(callClient('Tail cut')).rejects.toThrow('Inference failed: malformed prediction response.')

  gradeStatus = 503
  await expect(callClient('Tail cut')).rejects.toThrow('Inference failed: HTTP 503.')

  const overridden = await page.evaluate(async () => {
    // @ts-expect-error Vite serves this browser-only state module during Playwright tests.
    const state = await import('/src/kioskState.ts')
    let session = state.reducer(state.initialSession, { type: 'finishAnalysis', outcome: 'valid', grade: 'A', confidence: 96.3, rawConfidence: .963, inferenceId: 'result-A', captureId: 'capture-A', scores: { GRADE_A: .963, GRADE_B: .02, GRADE_C: .01, INVALID: .007 }, imageType: 'sashibocore', modelSource: 'raspberry-pi' })
    session = state.reducer(session, { type: 'setOverride', sample: 'Sashibo core', grade: 'C', reason: 'Expert visual inspection' })
    return session.results['Sashibo core']
  })
  expect(overridden).toMatchObject({ originalGrade: 'A', originalConfidence: 96.3, rawConfidence: .963, inferenceId: 'result-A', captureId: 'capture-A', overrideGrade: 'C', overrideReason: 'Expert visual inspection' })
})

test('local record storage does not silently truncate unsynced records', async ({ page }) => {
  await page.goto('/')
  const count = await page.evaluate(async () => {
    // @ts-expect-error Vite serves this browser-only storage module during Playwright tests.
    const records = await import('/src/gradingRecords.ts')
    records.saveRecords(Array.from({ length: 250 }, (_, index) => ({
      id: `pending-${index}`, sessionId: `session-${index}`, timestamp: index, time: 'Now', grader: 'Tester', sample: 'Sashibo core', fish: 'Fish 1', weight: '1 kg', grade: 'A', status: 'Complete',
      transaction: { currency: 'PHP', amount: null, syncState: 'pending' },
    })))
    return records.loadRecords().length
  })
  expect(count).toBe(250)
})

test('local Raspberry Pi hosting uses same-origin API and camera routes', async ({ page }) => {
  test.skip(process.env.VITE_PI_LOCAL_HOSTED !== 'true', 'Only runs for the Raspberry Pi local-hosted build mode.')
  const requests: string[] = []
  await page.route('**/snapshot', route => { requests.push(route.request().url()); return route.fulfill({ contentType: 'image/jpeg', body: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) }) })
  await page.route('**/grade', route => { requests.push(route.request().url()); return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: 'local-result', capture_id: 'local-capture', image_type: 'sashibocore', grade: 'GRADE_A', confidence: .96, scores: { GRADE_A: .96, GRADE_B: .02, GRADE_C: .01, INVALID: .01 } }) }) })
  await page.goto('/')
  const result = await page.evaluate(async () => {
    // @ts-expect-error Vite serves this browser-only integration module during Playwright tests.
    const client = await import('/src/piClient.ts')
    const settings = client.getPiSettings()
    const image = await client.capturePiImage('Sashibo core')
    const grade = await client.gradePiImage(image, 'Sashibo core')
    return { settings, grade }
  })
  const fallbackId = await page.evaluate(async () => {
    // @ts-expect-error Vite serves this browser-only utility during Playwright tests.
    const { createId } = await import('/src/id.ts')
    Object.defineProperty(crypto, 'randomUUID', { configurable: true, value: undefined })
    return createId()
  })
  expect(result.settings).toEqual({ mode: 'pi-local', configured: true, apiUrl: '', cameraUrl: '', streamUrl: '/stream', snapshotUrl: '/snapshot' })
  expect(result.grade).toMatchObject({ grade: 'A', imageType: 'sashibocore' })
  expect(fallbackId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  expect(requests).toEqual(['http://127.0.0.1:4178/snapshot', 'http://127.0.0.1:4178/grade'])
})

test('hosted deployment uses only the configured authenticated HTTPS gateway', async ({ page }) => {
  test.skip(!process.env.VITE_PI_GATEWAY_URL, 'Only runs with a hosted HTTPS gateway test URL.')
  const requests: string[] = []
  await page.route('https://gateway.test/stream**', route => { requests.push(route.request().url()); return route.fulfill({ contentType: 'image/jpeg', body: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) }) })
  await page.route('https://gateway.test/snapshot', route => { requests.push(route.request().url()); return route.fulfill({ contentType: 'image/jpeg', body: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) }) })
  await page.route('https://gateway.test/grade', route => { requests.push(route.request().url()); return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: 'secure-grade', capture_id: 'secure-capture', image_type: 'sashibocore', grade: 'GRADE_A', confidence: .96, scores: { GRADE_A: .96, GRADE_B: .02, GRADE_C: .01, INVALID: .01 } }) }) })
  await page.addInitScript(() => localStorage.setItem('tunaeye-installed', 'true'))
  await page.goto('/kiosk/camera')
  const result = await page.evaluate(async () => {
    // @ts-expect-error Vite serves this browser-only integration module during Playwright tests.
    const client = await import('/src/piClient.ts')
    const image = await client.capturePiImage('Sashibo core')
    return { settings: client.getPiSettings(), grade: await client.gradePiImage(image, 'Sashibo core') }
  })
  expect(result.settings).toEqual({ mode: 'hosted-gateway', configured: true, apiUrl: 'https://gateway.test', cameraUrl: 'https://gateway.test', streamUrl: 'https://gateway.test/stream', snapshotUrl: 'https://gateway.test/snapshot' })
  expect(result.grade).toMatchObject({ id: 'secure-grade', captureId: 'secure-capture', modelSource: 'raspberry-pi' })
  expect(requests.some(url => url.startsWith('http://10.42.0.1'))).toBe(false)
  expect(requests).toContain('https://gateway.test/snapshot')
  expect(requests).toContain('https://gateway.test/grade')
})

test('printing failure stays on receipt and offers retry', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('tunaeye-installed', 'true')
    window.print = () => { throw new Error('Printer unavailable') }
  })
  await page.goto('/kiosk/print')
  await page.getByRole('button', { name: 'Print receipt' }).click()
  await expect(page.getByRole('dialog', { name: 'Printing failed' })).toBeVisible()
  await expect(page).toHaveURL(/\/kiosk\/print$/)
  await expect(page.getByRole('button', { name: 'Try again' })).toBeFocused()
})

test('skipping a receipt requires confirmation', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('tunaeye-installed', 'true'))
  await page.goto('/kiosk/print')
  await page.getByRole('button', { name: 'Skip printing' }).click()
  const dialog = page.getByRole('dialog', { name: 'Skip printing?' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Keep printing' }).click()
  await expect(page).toHaveURL(/\/kiosk\/print$/)
})

test('uploaded image uses the same saved-evidence and Pi inference flow', async ({ page }) => {
  let gradeBody = ''
  const browserErrors: string[] = []
  const failedRequests: string[] = []
  page.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()) })
  page.on('pageerror', error => browserErrors.push(error.message))
  page.on('requestfailed', request => failedRequests.push(`${request.method()} ${request.url()}`))
  await page.setViewportSize({ width: 1024, height: 600 })
  await page.route('http://10.42.0.1:8080/**', route => route.fulfill({ contentType: 'image/jpeg', body: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) }))
  await page.route('http://10.42.0.1:5000/grade', async route => {
    gradeBody = route.request().postData() ?? ''
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: 'upload-grade', capture_id: 'upload-capture', grade: 'GRADE_B', confidence: 0.91, scores: { GRADE_A: 0.05, GRADE_B: 0.91, GRADE_C: 0.03, INVALID: 0.01 } }) })
  })
  await page.addInitScript(() => localStorage.setItem('tunaeye-installed', 'true'))
  await page.goto('/kiosk/camera')
  await expect(page.getByRole('button', { name: 'Upload image' })).toBeInViewport()
  await page.getByLabel('Upload specimen image').setInputFiles('public/assets/sashiboCoreFull.png')
  await expect(page.getByRole('heading', { name: 'Sashibo core · Grade B' })).toBeVisible()
  expect(gradeBody).toContain('sashibocore')
  expect(gradeBody).toContain('name="image"; filename="capture.png"')
  const evidence = await page.evaluate(async () => await new Promise<{ mimeType?: string; storedHash?: string; sourceHash?: string }>((resolve, reject) => {
    const open = indexedDB.open('tunaeye-offline', 1)
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const get = open.result.transaction('evidence').objectStore('evidence').getAll()
      get.onerror = () => reject(get.error)
      get.onsuccess = async () => {
        const stored = get.result[0]
        const source = await fetch('/assets/sashiboCoreFull.png').then(response => response.blob())
        const digest = async (blob: Blob) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()))).map(byte => byte.toString(16).padStart(2, '0')).join('')
        resolve({ mimeType: stored?.mimeType, storedHash: stored?.blob ? await digest(stored.blob) : undefined, sourceHash: await digest(source) })
      }
    }
  }))
  expect(evidence.mimeType).toBe('image/png')
  expect(evidence.storedHash).toBe(evidence.sourceHash)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(browserErrors).toEqual([])
  expect(failedRequests).toEqual([])
})

test('completed grading session remains local and pending until cloud sync', async ({ page }) => {
  let gradeBody = ''
  let gradeBytes: Buffer | null = null
  await page.route('http://10.42.0.1:8080/**', route => route.fulfill({ contentType: 'image/jpeg', body: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) }))
  await page.route('http://10.42.0.1:5000/grade', async route => {
    gradeBody = route.request().postData() ?? ''
    gradeBytes = route.request().postDataBuffer()
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: 'grade-1', capture_id: 'capture-1', image_type: 'sashibocore', grade: 'GRADE_A', confidence: 0.963, scores: { GRADE_A: 0.963, GRADE_B: 0.025, GRADE_C: 0.01, INVALID: 0.002 } }) })
  })
  await page.addInitScript(() => {
    localStorage.setItem('tunaeye-installed', 'true')
    localStorage.setItem('tunaeye-grader-name', 'Maria Santos')
  })
  
  // Complete a simulated grading flow
  await page.goto('/kiosk/weight')
  await expect(page.getByRole('heading', { name: /Fish weight/i })).toBeVisible({ timeout: 5000 })
  await page.getByRole('button', { name: '4', exact: true }).click()
  await page.getByRole('button', { name: '2', exact: true }).click()
  await page.getByRole('button', { name: 'Start capture' }).click()
  
  // Camera screen
  await expect(page.getByRole('heading', { name: /Align the sample/i })).toBeVisible()
  await page.getByRole('button', { name: 'Capture' }).click()
  await expect(page.getByRole('heading', { name: /Sashibo core · Grade/i })).toBeVisible({ timeout: 10000 })

  const evidence = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('tunaeye-offline', 1)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const records = await new Promise<unknown[]>((resolve, reject) => {
      const request = database.transaction('evidence').objectStore('evidence').getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    database.close()
    return records
  })
  expect(evidence).toHaveLength(1)
  expect(evidence[0]).toMatchObject({ sample: 'Sashibo core', fishId: 'Fish 1', syncState: 'pending' })
  await page.getByRole('button', { name: 'Manual override' }).click()
  const override = page.getByRole('dialog', { name: 'Manual override' })
  await expect(override).toBeVisible()
  await expect(override.locator('.otp-inputs input')).toHaveCount(4)
  await expect(override.locator('.pin-key-btn')).toHaveCount(12)
  const overrideBox = await override.locator('.override-modal').boundingBox()
  expect(overrideBox!.y + overrideBox!.height).toBeLessThanOrEqual(800)
  await expect(override.getByRole('button', { name: 'Unlock override' })).toBeInViewport()
  await override.getByRole('button', { name: 'Cancel' }).click()
  await page.getByRole('button', { name: 'Print receipt' }).click()
  
  // Print screen -> Skip printing to complete
  await expect(page.getByRole('button', { name: 'Skip printing' })).toBeVisible({ timeout: 5000 })
  await page.getByRole('button', { name: 'Skip printing' }).click()
  await page.getByRole('dialog', { name: 'Skip printing?' }).getByRole('button', { name: 'Skip receipt' }).click()
  
  // Complete screen
  await expect(page.getByRole('heading', { name: 'Results printed.' })).toBeVisible()
  
  // Return to grader dashboard
  await page.getByRole('button', { name: 'Dashboard' }).click()
  await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible()
  
  // Verify recent grading records contains the newly completed session
  const records = page.locator('.grader-record-item')
  expect(await records.count()).toBeGreaterThanOrEqual(1)
  await expect(records.first()).toContainText('Sashibo core')
  await expect(records.first().locator('img')).toBeVisible()
  const savedRecords = await page.evaluate(() => JSON.parse(localStorage.getItem('tunaeye-records') ?? '[]'))
  expect(savedRecords[0].capturedImageId).toBeTruthy()
  expect(savedRecords[0].result).toMatchObject({ inferenceId: 'grade-1', captureId: 'capture-1', originalGrade: 'A', originalConfidence: 96.3, rawConfidence: 0.963, imageType: 'sashibocore', modelSource: 'raspberry-pi' })
  expect(gradeBody).toContain('name="image_type"')
  expect(gradeBody).toContain('sashibocore')
  expect(gradeBody).toContain('name="image"; filename="capture.jpg"')
  expect(gradeBytes?.includes(Buffer.from([0xff, 0xd8, 0xff, 0xd9]))).toBe(true)
  expect(savedRecords[0].transaction.syncState).toBe('pending')
  expect(JSON.stringify(savedRecords)).not.toContain('data:image')

  await page.context().setOffline(true)
  await page.getByRole('button', { name: 'Sync now' }).click()
  await expect(page.getByRole('heading', { name: /Waiting for internet|Sync unavailable/ })).toBeVisible()
  const afterFailedSync = await page.evaluate(() => JSON.parse(localStorage.getItem('tunaeye-records') ?? '[]'))
  expect(afterFailedSync[0].transaction.syncState).toBe('pending')
  await page.context().setOffline(false)
})

test('58mm thermal printer receipt preview and print layout', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('tunaeye-installed', 'true')
    localStorage.setItem('tunaeye-grader-name', 'Maria Santos')
  })
  await page.goto('/kiosk/print')
  await expect(page.getByRole('heading', { name: 'Print the receipt.' })).toBeVisible({ timeout: 5000 })

  // Verify 58mm thermal receipt preview & POS-58 chassis indicator
  const printerChassis = page.locator('.receipt-container-v2')
  await expect(printerChassis).toBeVisible()
  await expect(page.getByText('POS-58')).toBeVisible()

  // Verify physical 58mm thermal slip exists in DOM with ESC/POS 58MM metadata
  const thermalSlip = page.locator('.thermal-print-slip')
  await expect(thermalSlip).toHaveCount(1)
  await expect(thermalSlip).toContainText('TUNAEYE')
  await expect(thermalSlip).toContainText('QUALITY INSPECTION SLIP')
  await expect(thermalSlip).toContainText('ESC/POS 58MM')

  // Verify print media emulation displays the physical 58mm slip cleanly
  await page.emulateMedia({ media: 'print' })
  await expect(thermalSlip).toBeVisible()

  const slipStyle = await thermalSlip.evaluate((el) => {
    const computed = window.getComputedStyle(el)
    return {
      display: computed.display,
      visibility: computed.visibility,
      position: computed.position
    }
  })
  expect(slipStyle.visibility).toBe('visible')
  expect(slipStyle.display).toBe('block')
})

test('weight entry enforces the 15 to 200 kg range', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('tunaeye-installed', 'true'))
  await page.goto('/kiosk/weight')
  const input = page.locator('.weight-input input').first()

  await page.getByRole('button', { name: '0', exact: true }).click()
  await page.getByRole('button', { name: '8', exact: true }).click()
  await expect(input).toHaveValue('8')
  await expect(page.locator('.weight-limit-dialog')).toContainText('minimum is 15 kg')
  await expect(page.getByRole('button', { name: 'Start capture' })).toBeDisabled()

  await page.getByRole('button', { name: 'Clear' }).click()
  for (const digit of ['8', '9', '9']) await page.getByRole('button', { name: digit, exact: true }).click()
  await expect(input).toHaveValue('899')
  await expect(page.locator('.weight-limit-dialog')).toContainText('maximum is 200 kg')
  await expect(page.getByRole('button', { name: 'Start capture' })).toBeDisabled()
  await expect(page.locator('.weight-input-display')).toHaveClass(/is-error/)
  await page.screenshot({ path: 'test-results/weight-limit-1280x800.png', fullPage: false })

  const inputBox = await input.boundingBox()
  const unitBox = await page.locator('.weight-input-display b').first().boundingBox()
  expect(unitBox!.x - (inputBox!.x + inputBox!.width)).toBeLessThanOrEqual(12)
})

test('completion actions and grader logout return to the kiosk landing', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('tunaeye-installed', 'true')
    localStorage.setItem('tunaeye-grader-name', 'Maria Santos')
  })
  await page.goto('/kiosk/complete')
  await expect(page.getByRole('button', { name: 'Grade another' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Dashboard' })).toBeVisible()
  await page.screenshot({ path: 'test-results/completion-actions-1280x800.png', fullPage: false })
  await page.getByRole('button', { name: 'Logout' }).click()
  await expect(page.getByRole('button', { name: 'Get started' })).toBeVisible()
  await expect(page.locator('.welcome-brand-hero__mark')).toHaveCount(0)
  await expect(page.locator('.welcome-brand-hero__title')).toContainText('TUNAEYE')
  expect(await page.evaluate(() => localStorage.getItem('tunaeye-grader-name'))).toBeNull()
})

for (const viewport of [
  { width: 1000, height: 650 },
  { width: 1024, height: 600 },
  { width: 1280, height: 800 },
  { width: 1024, height: 768 },
  { width: 800, height: 1280 },
  { width: 1366, height: 768 },
]) {
  test(`QA tablet surfaces fit and remain readable at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    const browserErrors: string[] = []
    const failedRequests: string[] = []
    page.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()) })
    page.on('pageerror', error => browserErrors.push(error.message))
    page.on('requestfailed', request => failedRequests.push(`${request.method()} ${request.url()}`))
    await page.setViewportSize(viewport)
    await page.addInitScript(() => localStorage.setItem('tunaeye-installed', 'true'))

    const expectNoHorizontalOverflow = async () => {
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    }

    await page.goto('/kiosk/select-role')
    const roleCards = page.locator('.role-card-v2')
    await expect(roleCards).toHaveCount(2)
    expect((await roleCards.first().boundingBox())!.height).toBeGreaterThanOrEqual(200)
    expect((await roleCards.first().boundingBox())!.width).toBeGreaterThanOrEqual(viewport.width < 900 ? 260 : 300)
    await expectNoHorizontalOverflow()

    await page.goto('/kiosk/tutorial')
    await expect(page.locator('.tutorial-stage__number')).toHaveText('01')
    await expect(page.locator('.tutorial-stage__number')).toBeVisible()
    await expectNoHorizontalOverflow()

    await page.goto('/kiosk/sample')
    await page.getByRole('button', { name: /Tail cut/ }).click()
    await page.getByRole('button', { name: 'Continue' }).click()
    const associationCards = page.locator('.association-options button')
    await expect(associationCards).toHaveCount(2)
    const [firstCard, secondCard] = await Promise.all([associationCards.nth(0).boundingBox(), associationCards.nth(1).boundingBox()])
    expect(Math.abs(firstCard!.height - secondCard!.height)).toBeLessThanOrEqual(1)
    expect(Math.abs((firstCard!.x + secondCard!.x + secondCard!.width) / 2 - viewport.width / 2)).toBeLessThan(28)
    await expect(page.getByRole('button', { name: 'Continue' })).toBeInViewport()
    await expectNoHorizontalOverflow()

    await page.goto('/kiosk/print')
    expect((await page.locator('.print-queue > div').first().boundingBox())!.height).toBeGreaterThanOrEqual(viewport.height > viewport.width ? 60 : 68)
    await expect(page.getByRole('button', { name: 'Skip printing' })).toBeInViewport()
    const receipt = await page.locator('.receipt-container-v2').boundingBox()
    const printActions = await page.locator('.screen-stack--print > .bottom-bar').boundingBox()
    expect(receipt!.y + receipt!.height).toBeLessThanOrEqual(printActions!.y)
    await expectNoHorizontalOverflow()
    await page.screenshot({ path: `test-results/print-${viewport.width}x${viewport.height}.png`, fullPage: false })

    await page.goto('/kiosk/complete')
    const gradeAnother = await page.getByRole('button', { name: 'Grade another' }).boundingBox()
    expect(Math.abs(gradeAnother!.x + gradeAnother!.width / 2 - viewport.width / 2)).toBeLessThan(8)
    const dashboard = await page.getByRole('button', { name: 'Dashboard' }).boundingBox()
    const logout = await page.getByRole('button', { name: 'Logout' }).boundingBox()
    expect(Math.abs(dashboard!.y - logout!.y)).toBeLessThanOrEqual(1)
    await expectNoHorizontalOverflow()

    await page.goto('/kiosk/admin-dashboard')
    await expect(page.getByRole('heading', { name: 'Good day, Admin.' })).toBeVisible()
    expect((await page.getByRole('heading', { name: 'Good day, Admin.' }).boundingBox())!.height).toBeGreaterThanOrEqual(36)
    await expectNoHorizontalOverflow()

    await page.screenshot({ path: `test-results/tablet-${viewport.width}x${viewport.height}.png`, fullPage: false })
    expect(browserErrors).toEqual([])
    expect(failedRequests).toEqual([])
  })
}
