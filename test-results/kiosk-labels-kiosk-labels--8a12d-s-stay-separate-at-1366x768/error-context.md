# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: kiosk-labels.spec.ts >> kiosk labels and actions stay separate at 1366x768
- Location: tests\kiosk-labels.spec.ts:12:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.boundingBox: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('iframe[title="TunaEye"]').contentFrame().locator('.lt-controls')

```

# Page snapshot

```yaml
- iframe [active] [ref=e2]:
  - generic [active] [ref=f1e1]:
    - generic [ref=f1e3]:
      - generic [ref=f1e4]:
        - generic [ref=f1e5]: Weight
        - generic [ref=f1e10]: Core
        - generic [ref=f1e14]: Tail
        - generic [ref=f1e17]: Grade
      - generic [ref=f1e19]:
        - generic [ref=f1e20]: AS
        - button "Home" [ref=f1e21] [cursor=pointer]
      - generic [ref=f1e24]:
        - img "Live DroidCam stream" [ref=f1e26]
        - generic [ref=f1e27]:
          - generic [ref=f1e29]: Live camera
          - emphasis [ref=f1e30]: DroidCam (192.168.1.2:4747)
      - generic [ref=f1e31]:
        - generic [ref=f1e32]: Step 2 of 4
        - heading [level=1] [ref=f1e33]:
          - text: Place the
          - emphasis [ref=f1e34]: core
          - text: in the frame
        - paragraph [ref=f1e35]: Lay it flat and centered, in even light.
        - generic [ref=f1e36]:
          - generic [ref=f1e37]:
            - generic [ref=f1e38]: Order
            - text: TE_0001
          - generic [ref=f1e39]:
            - generic [ref=f1e40]: Weight
            - text: 85 kg
        - generic [ref=f1e41]:
          - generic [ref=f1e42]:
            - generic [ref=f1e43]: Camera source
            - generic [ref=f1e44]:
              - button "Refresh ↻" [ref=f1e45] [cursor=pointer]
              - button "Trigger" [ref=f1e46] [cursor=pointer]
          - combobox "Available cameras" [ref=f1e47]:
            - option "Pi camera (:8080)"
            - option "DroidCam URL (:4747)" [selected]
            - option "Browser / DroidCam Webcam"
          - textbox "DroidCam URL" [ref=f1e48]:
            - /placeholder: http://192.168.1.2:4747
            - text: http://192.168.1.2:4747
        - button "Scan sample" [ref=f1e49] [cursor=pointer]
        - button "Upload an image instead" [ref=f1e52] [cursor=pointer]
      - generic [ref=f1e55]:
        - button "Back" [ref=f1e56] [cursor=pointer]
        - button "Help" [ref=f1e59] [cursor=pointer]
    - button "View network and connection details" [ref=f1e62] [cursor=pointer]
```

# Test source

```ts
  1   | import { readFileSync } from 'node:fs'
  2   | import { expect, test, type Locator } from '@playwright/test'
  3   | 
  4   | async function separate(a: Locator, b: Locator) {
> 5   |   const first = await a.boundingBox(), second = await b.boundingBox()
      |                         ^ Error: locator.boundingBox: Test timeout of 30000ms exceeded.
  6   |   expect(first).not.toBeNull(); expect(second).not.toBeNull()
  7   |   expect(first!.x + first!.width <= second!.x || second!.x + second!.width <= first!.x ||
  8   |     first!.y + first!.height <= second!.y || second!.y + second!.height <= first!.y).toBe(true)
  9   | }
  10  | 
  11  | for (const viewport of [{ width: 1024, height: 600 }, { width: 1280, height: 800 }, { width: 1366, height: 768 }]) {
  12  |   test(`kiosk labels and actions stay separate at ${viewport.width}x${viewport.height}`, async ({ page }) => {
  13  |     const errors: string[] = [], failed: string[] = []
  14  |     page.on('pageerror', error => errors.push(error.message))
  15  |     page.on('console', message => {
  16  |       if (['error', 'warning'].includes(message.type()) && !message.text().includes('was preloaded using link preload but not used')) errors.push(message.text())
  17  |     })
  18  |     page.on('requestfailed', request => { if (request.failure()?.errorText !== 'net::ERR_ABORTED') failed.push(request.url()) })
  19  |     await page.setViewportSize(viewport)
  20  |     await page.addInitScript(() => {
  21  |       Element.prototype.requestFullscreen = async () => {}
  22  |       Object.defineProperty(navigator, 'mediaDevices', { value: {
  23  |         enumerateDevices: async () => [], addEventListener: () => {},
  24  |         getUserMedia: async () => { throw new DOMException('Camera permission denied. Select another source or upload an image.', 'NotAllowedError') },
  25  |       } })
  26  |     })
  27  |     const image = readFileSync('public/assets/sashiboCoreFull.png')
  28  |     await page.route(/^https:\/\/[^/]+\.supabase\.co\//, route => route.fulfill({ contentType: 'application/json', body: '[]' }))
  29  |     await page.route('**/local-api/**', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(
  30  |       route.request().method() === 'POST' ? { saved: route.request().postDataJSON().record.id } : { records: [], sqlite: 'ready', writable: true },
  31  |     ) }))
  32  |     await page.route('**/status', route => route.fulfill({ contentType: 'application/json', body: '{"models":{"sashibocore":true,"tailcut":true}}' }))
  33  |     await page.route(/\/(?:stream|snapshot|video)(?:\?|$)/, route => route.fulfill({ contentType: 'image/png', body: image }))
  34  |     let samples = 0
  35  |     await page.route('**/grade', route => {
  36  |       const tail = samples++ > 0, confidence = tail ? .91 : .74
  37  |       return route.fulfill({ contentType: 'application/json', body: JSON.stringify({
  38  |         id: `layout-${samples}`, capture_id: `layout-capture-${samples}`, image_type: tail ? 'tailcut' : 'sashibocore',
  39  |         grade: 'GRADE_B', confidence, scores: { GRADE_A: .02, GRADE_B: confidence, GRADE_C: .02, INVALID: .01 },
  40  |       }) })
  41  |     })
  42  |     await page.goto('/?kiosk=1')
  43  |     const kiosk = page.frameLocator('iframe[title="TunaEye"]')
  44  |     await kiosk.locator('#gs').click()
  45  |     await kiosk.locator('#in').fill('Alexandria Socorro')
  46  |     await separate(kiosk.locator('#dmc'), kiosk.locator('#te-test-print-btn'))
  47  |     await kiosk.locator('#te-test-print-btn').click()
  48  |     await expect(kiosk.getByRole('dialog', { name: 'Connect & Print Test Receipt' })).toBeVisible()
  49  |     await kiosk.locator('#tp-cancel').click()
  50  |     await kiosk.locator('#go').click()
  51  |     await kiosk.getByRole('button', { name: 'Start live grading', exact: true }).click()
  52  |     await kiosk.locator('[data-k="8"]').click(); await kiosk.locator('[data-k="5"]').click()
  53  |     await kiosk.locator('#go').click()
  54  |     if (await kiosk.locator('#tps').isVisible()) await kiosk.locator('#tps').click()
  55  |     await expect(kiosk.locator('#cam-select option').first()).toBeAttached()
  56  | 
  57  |     for (const source of ['droidcam', 'device', 'pi']) {
  58  |       await kiosk.locator('#cam-select').selectOption(source)
  59  |       if (source === 'droidcam') await expect(kiosk.locator('#cam-droid-url')).toBeVisible()
  60  |       if (source === 'device') {
  61  |         await expect(kiosk.locator('#cam-hint')).toContainText('Camera permission denied')
  62  |         await kiosk.locator('#cam-hint').scrollIntoViewIfNeeded()
  63  |       }
  64  |       await separate(kiosk.locator('.lt-controls'), kiosk.locator('#sh'))
  65  |       await separate(kiosk.locator('#sh'), kiosk.locator('#up'))
  66  |       expect((await kiosk.locator('#sh').boundingBox())!.height).toBeGreaterThan(60)
  67  |       expect((await kiosk.locator('#up').boundingBox())!.height).toBeGreaterThan(42)
  68  |     }
  69  |     await page.screenshot({ path: `test-results/label-layout/capture-${viewport.width}.png` })
  70  |     await kiosk.locator('#sh').click()
  71  |     await expect(kiosk.getByRole('heading', { name: 'Tail cut needed' })).toBeVisible()
  72  |     await separate(kiosk.locator('.ph5 .v5c'), kiosk.locator('.ph5 .v5sc'))
  73  |     await page.screenshot({ path: `test-results/label-layout/tail-needed-${viewport.width}.png` })
  74  |     await kiosk.locator('#go').click()
  75  |     await kiosk.getByRole('button', { name: 'Scan Tail-Cut', exact: true }).click()
  76  |     await kiosk.locator('#sh').click()
  77  |     await expect(kiosk.locator('.med5-l')).toHaveText('B')
  78  |     const photos = kiosk.locator('.ph5')
  79  |     for (let index = 0; index < await photos.count(); index++) {
  80  |       await separate(photos.nth(index).locator('.v5c'), photos.nth(index).locator('.v5sc'))
  81  |     }
  82  |     await kiosk.locator('#go').click()
  83  |     await expect(kiosk.locator('.rh1')).toBeVisible()
  84  |     await separate(kiosk.locator('.rcr'), kiosk.locator('.rcv .ow'))
  85  |     await page.screenshot({ path: `test-results/label-layout/receipt-${viewport.width}.png` })
  86  |     await kiosk.locator('#sk').click(); await kiosk.locator('#mk').click()
  87  |     await expect(kiosk.getByText('Results recorded.', { exact: true })).toBeVisible()
  88  |     await expect(kiosk.locator('#bw')).toBeVisible({ timeout: 12000 })
  89  |     await kiosk.locator('#bk').click()
  90  |     await kiosk.getByRole('button', { name: 'Yes, exit', exact: true }).click()
  91  |     await kiosk.locator('#dmsw').click()
  92  |     await expect(kiosk.getByRole('combobox', { name: 'Demo scenario' })).toBeVisible()
  93  |     await separate(kiosk.getByRole('combobox', { name: 'Demo scenario' }), kiosk.locator('#dmc'))
  94  |     await separate(kiosk.locator('#dmc'), kiosk.locator('#te-test-print-btn'))
  95  |     await page.screenshot({ path: `test-results/label-layout/identity-${viewport.width}.png` })
  96  |     expect(samples).toBe(2)
  97  |     expect(failed).toEqual([]); expect(errors).toEqual([])
  98  |   })
  99  | }
  100 | 
```