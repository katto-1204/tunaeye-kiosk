# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: kiosk.spec.ts >> uninstalled visitors see the public landing after loading and can scroll
- Location: tests\kiosk.spec.ts:7:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.pdial')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('.pdial') with timeout 5000ms
  - waiting for locator('.pdial')

```

```yaml
- iframe
```

# Test source

```ts
  1   | import { expect, test } from '@playwright/test'
  2   | 
  3   | test.beforeEach(async ({ page }) => {
  4   |   await page.route('**/auth/v1/health', route => route.fulfill({ contentType: 'application/json', body: '{"name":"GoTrue"}' }))
  5   | })
  6   | 
  7   | test('uninstalled visitors see the public landing after loading and can scroll', async ({ page }) => {
  8   |   const browserErrors: string[] = []
  9   |   const failedRequests: string[] = []
  10  |   page.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()) })
  11  |   page.on('pageerror', error => browserErrors.push(error.message))
  12  |   page.on('requestfailed', request => failedRequests.push(`${request.method()} ${request.url()}`))
  13  | 
  14  |   await page.goto('/')
> 15  |   await expect(page.locator('.pdial')).toBeVisible()
      |                                        ^ Error: expect(locator).toBeVisible() failed
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
  111 |   await expect(enter).toBeVisible()
  112 |   await page.evaluate(() => {
  113 |     HTMLElement.prototype.requestFullscreen = async function (options?: FullscreenOptions) {
  114 |       ;(window as Window & { __fullscreenOptions?: FullscreenOptions }).__fullscreenOptions = options
  115 |       Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => this })
```