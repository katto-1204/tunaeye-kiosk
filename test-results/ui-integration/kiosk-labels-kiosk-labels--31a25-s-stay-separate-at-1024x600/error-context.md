# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: kiosk-labels.spec.ts >> kiosk labels and actions stay separate at 1024x600
- Location: tests\kiosk-labels.spec.ts:12:3

# Error details

```
Test timeout of 45000ms exceeded.
```

```
Error: locator.click: Test timeout of 45000ms exceeded.
Call log:
  - waiting for locator('iframe[title="TunaEye"]').contentFrame().locator('#dmsw')

```

# Page snapshot

```yaml
- iframe [active] [ref=e2]:
  - generic [ref=f1e1]:
    - generic [ref=f1e2]:
      - generic [ref=f1e5]:
        - generic [ref=f1e6]:
          - generic [ref=f1e7]: Weigh the fish
          - generic [ref=f1e8]: Enter the weight shown on the scale.
        - generic [ref=f1e9]:
          - generic [ref=f1e10]:
            - generic [ref=f1e11]: Order
            - generic [ref=f1e12]: TE_0002
          - generic [ref=f1e13]:
            - generic [ref=f1e14]: Grader
            - generic [ref=f1e15]: Alexandria Socorro
        - generic [ref=f1e16]:
          - generic [ref=f1e17]: 0kg
          - generic [ref=f1e18]: 15–200 kg
        - generic [ref=f1e22]:
          - generic [ref=f1e23]: AS
          - button "Home" [ref=f1e24] [cursor=pointer]
        - generic [ref=f1e28]:
          - button "1" [ref=f1e29] [cursor=pointer]
          - button "2" [ref=f1e30] [cursor=pointer]
          - button "3" [ref=f1e31] [cursor=pointer]
          - button "4" [ref=f1e32] [cursor=pointer]
          - button "5" [ref=f1e33] [cursor=pointer]
          - button "6" [ref=f1e34] [cursor=pointer]
          - button "7" [ref=f1e35] [cursor=pointer]
          - button "8" [ref=f1e36] [cursor=pointer]
          - button "9" [ref=f1e37] [cursor=pointer]
          - button "." [ref=f1e38] [cursor=pointer]
          - button "0" [ref=f1e39] [cursor=pointer]
          - button "Action" [ref=f1e40] [cursor=pointer]
          - button "Clear" [ref=f1e43] [cursor=pointer]
        - button "Start capture" [disabled] [ref=f1e44]
        - button "Back" [ref=f1e47] [cursor=pointer]
      - dialog "Exit as Alexandria Socorro ?" [ref=f1e51]:
        - heading "Exit as Alexandria Socorro ?" [level=2] [ref=f1e52]
        - paragraph [ref=f1e53]: You will return to the grader selection screen.
        - generic [ref=f1e54]:
          - button "Cancel" [ref=f1e55] [cursor=pointer]
          - button "Yes, exit" [active] [ref=f1e56] [cursor=pointer]
    - button "View network and connection details" [ref=f1e57] [cursor=pointer]
```

# Test source

```ts
  1  | import { readFileSync } from 'node:fs'
  2  | import { expect, test, type Locator } from '@playwright/test'
  3  | 
  4  | async function separate(a: Locator, b: Locator) {
  5  |   const first = await a.boundingBox(), second = await b.boundingBox()
  6  |   expect(first).not.toBeNull(); expect(second).not.toBeNull()
  7  |   expect(first!.x + first!.width <= second!.x || second!.x + second!.width <= first!.x ||
  8  |     first!.y + first!.height <= second!.y || second!.y + second!.height <= first!.y).toBe(true)
  9  | }
  10 | 
  11 | for (const viewport of [{ width: 1024, height: 600 }, { width: 1280, height: 800 }, { width: 1366, height: 768 }]) {
  12 |   test(`kiosk labels and actions stay separate at ${viewport.width}x${viewport.height}`, async ({ page }) => {
  13 |     const errors: string[] = [], failed: string[] = []
  14 |     page.on('pageerror', error => errors.push(error.message))
  15 |     page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()) })
  16 |     page.on('requestfailed', request => { if (request.failure()?.errorText !== 'net::ERR_ABORTED') failed.push(request.url()) })
  17 |     await page.setViewportSize(viewport)
  18 |     await page.addInitScript(() => {
  19 |       Object.defineProperty(navigator, 'mediaDevices', { value: {
  20 |         enumerateDevices: async () => [], addEventListener: () => {},
  21 |         getUserMedia: async () => { throw new DOMException('Camera permission denied. Select another source or upload an image.', 'NotAllowedError') },
  22 |       } })
  23 |     })
  24 |     const image = readFileSync('public/assets/sashiboCoreFull.png')
  25 |     await page.route('**/local-api/**', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(
  26 |       route.request().method() === 'POST' ? { saved: route.request().postDataJSON().record.id } : { records: [], sqlite: 'ready', writable: true },
  27 |     ) }))
  28 |     await page.route('**/status', route => route.fulfill({ contentType: 'application/json', body: '{"models":{"sashibocore":true,"tailcut":true}}' }))
  29 |     await page.route(/\/(?:stream|snapshot|video)(?:\?|$)/, route => route.fulfill({ contentType: 'image/png', body: image }))
  30 |     let samples = 0
  31 |     await page.route('**/grade', route => {
  32 |       const tail = samples++ > 0, confidence = tail ? .91 : .74
  33 |       return route.fulfill({ contentType: 'application/json', body: JSON.stringify({
  34 |         id: `layout-${samples}`, capture_id: `layout-capture-${samples}`, image_type: tail ? 'tailcut' : 'sashibocore',
  35 |         grade: 'GRADE_B', confidence, scores: { GRADE_A: .02, GRADE_B: confidence, GRADE_C: .02, INVALID: .01 },
  36 |       }) })
  37 |     })
  38 |     await page.goto('/?kiosk=1')
  39 |     const kiosk = page.frameLocator('iframe[title="TunaEye"]')
  40 |     await kiosk.locator('#gs').click()
  41 |     await kiosk.locator('#in').fill('Alexandria Socorro')
  42 |     await separate(kiosk.locator('#dmc'), kiosk.locator('#te-test-print-btn'))
  43 |     await kiosk.locator('#te-test-print-btn').click()
  44 |     await expect(kiosk.getByRole('dialog', { name: 'Connect & Print Test Receipt' })).toBeVisible()
  45 |     await kiosk.locator('#tp-cancel').click()
  46 |     await kiosk.locator('#go').click()
  47 |     await kiosk.getByRole('button', { name: 'Start live grading', exact: true }).click()
  48 |     await kiosk.locator('[data-k="8"]').click(); await kiosk.locator('[data-k="5"]').click()
  49 |     await kiosk.locator('#go').click()
  50 |     if (await kiosk.locator('#tps').isVisible()) await kiosk.locator('#tps').click()
  51 |     await expect(kiosk.locator('#cam-select option').first()).toBeAttached()
  52 | 
  53 |     for (const source of ['droidcam', 'device', 'pi']) {
  54 |       await kiosk.locator('#cam-select').selectOption(source)
  55 |       if (source === 'droidcam') await expect(kiosk.locator('#cam-droid-url')).toBeVisible()
  56 |       if (source === 'device') {
  57 |         await expect(kiosk.locator('#cam-hint')).toContainText('Camera permission denied')
  58 |         await kiosk.locator('#cam-hint').scrollIntoViewIfNeeded()
  59 |       }
  60 |       await separate(kiosk.locator('.lt-controls'), kiosk.locator('#sh'))
  61 |       await separate(kiosk.locator('#sh'), kiosk.locator('#up'))
  62 |       expect((await kiosk.locator('#sh').boundingBox())!.height).toBeGreaterThan(60)
  63 |       expect((await kiosk.locator('#up').boundingBox())!.height).toBeGreaterThan(42)
  64 |     }
  65 |     await page.screenshot({ path: `test-results/label-layout/capture-${viewport.width}.png` })
  66 |     await kiosk.locator('#sh').click()
  67 |     await expect(kiosk.getByRole('heading', { name: 'Tail cut needed' })).toBeVisible()
  68 |     await separate(kiosk.locator('.ph5 .v5c'), kiosk.locator('.ph5 .v5sc'))
  69 |     await page.screenshot({ path: `test-results/label-layout/tail-needed-${viewport.width}.png` })
  70 |     await kiosk.locator('#go').click()
  71 |     await kiosk.getByRole('button', { name: 'Scan Tail-Cut', exact: true }).click()
  72 |     await kiosk.locator('#sh').click()
  73 |     await expect(kiosk.locator('.med5-l')).toHaveText('B')
  74 |     const photos = kiosk.locator('.ph5')
  75 |     for (let index = 0; index < await photos.count(); index++) {
  76 |       await separate(photos.nth(index).locator('.v5c'), photos.nth(index).locator('.v5sc'))
  77 |     }
  78 |     await kiosk.locator('#go').click()
  79 |     await expect(kiosk.locator('.rh1')).toBeVisible()
  80 |     await separate(kiosk.locator('.rcr'), kiosk.locator('.rcv .ow'))
  81 |     await page.screenshot({ path: `test-results/label-layout/receipt-${viewport.width}.png` })
  82 |     await kiosk.locator('#sk').click(); await kiosk.locator('#mk').click()
  83 |     await expect(kiosk.getByText('Results recorded.', { exact: true })).toBeVisible()
  84 |     await expect(kiosk.locator('#bw')).toBeVisible({ timeout: 12000 })
  85 |     await kiosk.locator('#bk').click()
> 86 |     await kiosk.locator('#dmsw').click()
     |                                  ^ Error: locator.click: Test timeout of 45000ms exceeded.
  87 |     await expect(kiosk.getByRole('combobox', { name: 'Demo scenario' })).toBeVisible()
  88 |     await separate(kiosk.getByRole('combobox', { name: 'Demo scenario' }), kiosk.locator('#dmc'))
  89 |     await separate(kiosk.locator('#dmc'), kiosk.locator('#te-test-print-btn'))
  90 |     await page.screenshot({ path: `test-results/label-layout/identity-${viewport.width}.png` })
  91 |     expect(samples).toBe(2)
  92 |     expect(errors).toEqual([]); expect(failed).toEqual([])
  93 |   })
  94 | }
  95 | 
```