# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: kiosk.spec.ts >> kiosk landing fullscreen button forces Chrome fullscreen
- Location: tests\kiosk.spec.ts:106:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: 'Enter fullscreen' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('button', { name: 'Enter fullscreen' }) with timeout 5000ms
  - waiting for getByRole('button', { name: 'Enter fullscreen' })

```

```yaml
- iframe
```

# Test source

```ts
  11  |   page.on('pageerror', error => browserErrors.push(error.message))
  12  |   page.on('requestfailed', request => failedRequests.push(`${request.method()} ${request.url()}`))
  13  | 
  14  |   await page.goto('/')
  15  |   await expect(page.locator('.pdial')).toBeVisible()
  16  |   await expect(page.getByRole('heading', { name: /Sea Beyond the Cut/i })).toBeVisible({ timeout: 5000 })
  17  |   await expect(page.getByRole('button', { name: 'Install kiosk app' })).toBeVisible()
  18  |   
  19  |   // Verify landing page scrollability
  20  |   const isScrollable = await page.evaluate(() => {
  21  |     const siteShell = document.querySelector('.site-shell')
  22  |     return document.documentElement.scrollHeight > window.innerHeight || (siteShell && siteShell.scrollHeight > window.innerHeight)
  23  |   })
  24  |   expect(isScrollable).toBe(true)
  25  | 
  26  |   const iphone = page.locator('.iphone-16-pro')
  27  |   await iphone.scrollIntoViewIfNeeded()
  28  |   await expect(iphone).toBeVisible()
  29  |   await expect(iphone).toHaveAttribute('viewBox', '0 0 200 400')
  30  |   const phoneImage = iphone.locator('image')
  31  |   await expect(phoneImage).toHaveAttribute('href', /\/app-screens\/.+\.jpg$/)
  32  |   const firstPhoneImage = await phoneImage.getAttribute('href')
  33  |   await expect.poll(() => phoneImage.getAttribute('href'), { timeout: 3000 }).not.toBe(firstPhoneImage)
  34  |   await iphone.screenshot({ path: 'test-results/iphone-mockup.png' })
  35  |   const macbook = page.locator('.demo-macbook')
  36  |   await expect(macbook).toBeVisible()
  37  |   await expect(macbook).toHaveAttribute('viewBox', '0 0 650 400')
  38  |   await page.getByRole('button', { name: /View Demo/ }).first().click()
  39  |   await expect(page.getByRole('dialog', { name: 'TunaEye demo video' })).toBeVisible()
  40  |   await page.getByRole('button', { name: 'Close demo video' }).click()
  41  |   await expect(page.getByRole('dialog', { name: 'TunaEye demo video' })).toHaveCount(0)
  42  |   await expect(page.getByRole('heading', { name: /Install the station app/ })).toBeVisible()
  43  |   const landingLayout = await page.evaluate(() => ({
  44  |     demoColumns: getComputedStyle(document.querySelector('.site-demo-video')!).gridTemplateColumns.split(' ').length,
  45  |     mobileColumns: getComputedStyle(document.querySelector('.mobile-experience-grid')!).gridTemplateColumns.split(' ').length,
  46  |   }))
  47  |   expect(landingLayout).toEqual({ demoColumns: 2, mobileColumns: 2 })
  48  |   for (const [name, selector] of [['demo', '.site-demo-video'], ['mobile', '.site-mobile-experience']] as const) {
  49  |     const section = page.locator(selector)
  50  |     await section.scrollIntoViewIfNeeded()
  51  |     await expect(section).toBeVisible()
  52  |     await section.screenshot({ path: `test-results/landing-${name}-1280x800.png` })
  53  |   }
  54  |   const footer = page.locator('.site-footer')
  55  |   await footer.scrollIntoViewIfNeeded()
  56  |   await expect(footer.locator('.site-footer__brand')).toBeVisible()
  57  |   await expect(footer.locator('.site-footer__links')).toBeVisible()
  58  |   await footer.screenshot({ path: 'test-results/landing-footer-1280x800.png' })
  59  |   await page.setViewportSize({ width: 390, height: 844 })
  60  |   await page.locator('.site-mobile-experience').scrollIntoViewIfNeeded()
  61  |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  62  |   expect(await page.locator('.mobile-experience-grid').evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(1)
  63  |   await footer.scrollIntoViewIfNeeded()
  64  |   expect(await footer.evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(1)
  65  |   await page.screenshot({ path: 'test-results/landing-mobile-390x844.png' })
  66  |   expect(browserErrors).toEqual([])
  67  |   expect(failedRequests).toEqual([])
  68  | })
  69  | 
  70  | test('installed tablet opens kiosk welcome screen and enters tight workflow screens', async ({ page }) => {
  71  |   await page.addInitScript(() => localStorage.setItem('tunaeye-installed', 'true'))
  72  |   await page.goto('/')
  73  |   await expect(page.getByRole('heading', { name: /TUNAEYE/i })).toBeVisible({ timeout: 5000 })
  74  |   await expect(page.getByRole('button', { name: 'Install' })).toHaveCount(0)
  75  |   await expect(page.getByRole('button', { name: 'Go to main page' })).toBeVisible()
  76  |   await page.getByRole('button', { name: 'Go to main page' }).click()
  77  |   await expect(page.getByRole('heading', { name: /Sea Beyond the Cut/i })).toBeVisible()
  78  |   await page.goto('/')
  79  |   await expect(page.getByRole('heading', { name: /TUNAEYE/i })).toBeVisible()
  80  |   
  81  |   // Navigate into kiosk workflow (select-role)
  82  |   await page.getByRole('button', { name: /Get started/i }).click()
  83  |   await expect(page.getByRole('heading', { name: "Who's grading?" })).toBeVisible()
  84  |   
  85  |   // Verify interactive kiosk workflow is tight (overflow: hidden, fits viewport)
  86  |   const isTight = await page.evaluate(() => {
  87  |     const appShell = document.querySelector('.app-shell')
  88  |     const htmlOverflow = window.getComputedStyle(document.documentElement).overflowY
  89  |     const bodyOverflow = window.getComputedStyle(document.body).overflowY
  90  |     return (htmlOverflow === 'hidden' || bodyOverflow === 'hidden') && appShell !== null
  91  |   })
  92  |   expect(isTight).toBe(true)
  93  | })
  94  | 
  95  | test('stale kiosk refresh returns to the kiosk landing route', async ({ page }) => {
  96  |   await page.addInitScript(() => {
  97  |     localStorage.setItem('tunaeye-installed', 'true')
  98  |     localStorage.setItem('tunaeye-last-activity', String(Date.now() - 31 * 60 * 1000))
  99  |   })
  100 |   await page.goto('/kiosk/review')
  101 |   await page.reload()
  102 |   await expect(page).toHaveURL(/\/kiosk\/$/)
  103 |   await expect(page.getByRole('heading', { name: /TUNAEYE/i })).toBeVisible({ timeout: 5000 })
  104 | })
  105 | 
  106 | test('kiosk landing fullscreen button forces Chrome fullscreen', async ({ page }) => {
  107 |   await page.setViewportSize({ width: 1280, height: 800 })
  108 |   await page.addInitScript(() => localStorage.setItem('tunaeye-installed', 'true'))
  109 |   await page.goto('/')
  110 |   const enter = page.getByRole('button', { name: 'Enter fullscreen' })
> 111 |   await expect(enter).toBeVisible()
      |                       ^ Error: expect(locator).toBeVisible() failed
  112 |   await page.evaluate(() => {
  113 |     HTMLElement.prototype.requestFullscreen = async function (options?: FullscreenOptions) {
  114 |       ;(window as Window & { __fullscreenOptions?: FullscreenOptions }).__fullscreenOptions = options
  115 |       Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => this })
  116 |       document.dispatchEvent(new Event('fullscreenchange'))
  117 |     }
  118 |   })
  119 |   await enter.click()
  120 |   await expect.poll(() => page.evaluate(() => (window as Window & { __fullscreenOptions?: FullscreenOptions }).__fullscreenOptions)).toEqual({ navigationUI: 'hide' })
  121 |   await expect(page.getByRole('button', { name: 'Exit fullscreen' })).toBeVisible()
  122 | })
  123 | 
  124 | test('role selector uses distinct role icons, focus states, and destinations', async ({ page }) => {
  125 |   await page.setViewportSize({ width: 1024, height: 600 })
  126 |   await page.addInitScript(() => localStorage.setItem('tunaeye-installed', 'true'))
  127 |   await page.goto('/select-role')
  128 |   const admin = page.getByRole('button', { name: /Admin/ })
  129 |   const grader = page.getByRole('button', { name: /Expert Grader/ })
  130 |   await expect(admin).toBeVisible()
  131 |   await expect(grader).toBeVisible()
  132 |   expect(await admin.locator('.role-card-v2__icon').innerHTML()).not.toBe(await grader.locator('.role-card-v2__icon').innerHTML())
  133 |   await admin.focus()
  134 |   await expect(admin).toBeFocused()
  135 |   expect(await grader.evaluate(element => getComputedStyle(element).backgroundImage)).toContain('linear-gradient')
  136 |   await page.screenshot({ path: 'test-results/role-selector-1024x600.png' })
  137 |   await grader.click()
  138 |   await expect(page).toHaveURL(/\/kiosk\/grader$/)
  139 |   await page.goto('/select-role')
  140 |   await page.getByRole('button', { name: /Admin/ }).click()
  141 |   await expect(page).toHaveURL(/\/admin$/)
  142 | })
  143 | 
  144 | test('admin OTP opens diagnostics, audit logs, and logout', async ({ page }) => {
  145 |   await page.addInitScript(() => localStorage.setItem('tunaeye-installed', 'true'))
  146 |   await page.goto('/')
  147 |   await page.getByRole('button', { name: 'Get started' }).click()
  148 |   await page.getByRole('button', { name: /Admin/ }).click()
  149 |   for (const [index, digit] of ['1', '2', '3', '4'].entries()) await page.getByLabel(`PIN digit ${index + 1}`).fill(digit)
  150 |   await page.getByRole('button', { name: 'Verify and continue' }).click()
  151 |   await expect(page.getByText('Good day, Admin.')).toBeVisible()
  152 |   await page.getByRole('button', { name: /Settings/ }).click()
  153 |   await expect(page.getByText('Raspberry Pi API URL')).toBeVisible()
  154 |   await expect(page.getByText('AI model identifier')).toBeVisible()
  155 |   await page.getByRole('button', { name: /Audit logs/ }).click()
  156 |   await expect(page.getByRole('heading', { name: 'Audit logs' }).first()).toBeVisible()
  157 |   await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible()
  158 | })
  159 | 
  160 | test('admin dashboard scrolls, graph interacts, and records paginate', async ({ page }) => {
  161 |   const browserErrors: string[] = []
  162 |   page.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()) })
  163 |   page.on('pageerror', error => browserErrors.push(error.message))
  164 |   await page.setViewportSize({ width: 1024, height: 600 })
  165 |   await page.addInitScript(() => {
  166 |     localStorage.setItem('tunaeye-installed', 'true')
  167 |     const now = Date.now()
  168 |     localStorage.setItem('tunaeye-records', JSON.stringify(Array.from({ length: 19 }, (_, index) => ({
  169 |       id: `TE-QA-${String(index + 1).padStart(3, '0')}`,
  170 |       sessionId: `QA-${index + 1}`,
  171 |       timestamp: now - (index % 7) * 86_400_000,
  172 |       time: 'Today, 10:00 AM',
  173 |       grader: index % 2 ? 'Maria Santos' : 'Jose Dela Cruz',
  174 |       sample: index % 2 ? 'Sashibo core' : 'Tail cut',
  175 |       fish: 'Fish 1', weight: `${20 + index} kg`, grade: index % 3 === 0 ? 'A' : 'B', status: 'Model result',
  176 |       transaction: { currency: 'PHP', amount: null, syncState: 'synced' },
  177 |     }))))
  178 |   })
  179 |   await page.goto('/')
  180 |   await page.getByRole('button', { name: 'Get started' }).click()
  181 |   await page.getByRole('button', { name: /Admin/ }).click()
  182 |   for (const [index, digit] of ['1', '2', '3', '4'].entries()) await page.getByLabel(`PIN digit ${index + 1}`).fill(digit)
  183 |   await page.getByRole('button', { name: 'Verify and continue' }).click()
  184 | 
  185 |   const adminContent = page.locator('.admin-content')
  186 |   await expect(page.getByTestId('admin-simple-graph')).toBeVisible()
  187 |   await page.getByRole('button', { name: /samples/ }).last().focus()
  188 |   await expect(page.locator('.admin-trend__tooltip')).toBeVisible()
  189 |   expect(await adminContent.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true)
  190 |   await page.screenshot({ path: 'test-results/admin-graph-1024x600.png', fullPage: false })
  191 | 
  192 |   await page.getByRole('button', { name: /Records/ }).click()
  193 |   await expect(page.getByText('Showing 1–8 of 19')).toBeVisible()
  194 |   await expect(page.getByRole('button', { name: 'Previous' })).toBeDisabled()
  195 |   await page.getByRole('button', { name: 'Next' }).click()
  196 |   await expect(page.getByText('Showing 9–16 of 19')).toBeVisible()
  197 |   await expect(page.getByText('TE-QA-009')).toBeVisible()
  198 |   await adminContent.evaluate(element => { element.scrollTop = element.scrollHeight })
  199 |   expect(await adminContent.evaluate(element => element.scrollTop)).toBeGreaterThan(0)
  200 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  201 |   expect(browserErrors).toEqual([])
  202 |   await page.screenshot({ path: 'test-results/admin-records-pagination-1024x600.png', fullPage: false })
  203 | })
  204 | 
  205 | test('weight numpad entry and touch keypad interaction', async ({ page }) => {
  206 |   await page.addInitScript(() => localStorage.setItem('tunaeye-installed', 'true'))
  207 |   await page.goto('/kiosk/weight')
  208 |   await expect(page.getByRole('heading', { name: /Fish weight/i })).toBeVisible({ timeout: 5000 })
  209 |   await expect(page.locator('.numpad-container')).toBeVisible()
  210 |   
  211 |   // Tap numpad buttons 3, 5, ., 4
```