import { readFileSync } from 'node:fs'
import { expect, test, type Locator } from '@playwright/test'

async function separate(a: Locator, b: Locator) {
  const first = await a.boundingBox(), second = await b.boundingBox()
  expect(first).not.toBeNull(); expect(second).not.toBeNull()
  expect(first!.x + first!.width <= second!.x || second!.x + second!.width <= first!.x ||
    first!.y + first!.height <= second!.y || second!.y + second!.height <= first!.y).toBe(true)
}

for (const viewport of [{ width: 1024, height: 600 }, { width: 1280, height: 800 }, { width: 1366, height: 768 }]) {
  test(`kiosk labels and actions stay separate at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    const errors: string[] = [], failed: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => {
      if (['error', 'warning'].includes(message.type()) && !message.text().includes('was preloaded using link preload but not used')) errors.push(message.text())
    })
    page.on('requestfailed', request => { if (request.failure()?.errorText !== 'net::ERR_ABORTED') failed.push(request.url()) })
    await page.setViewportSize(viewport)
    await page.addInitScript(() => {
      Element.prototype.requestFullscreen = async () => {}
      Object.defineProperty(navigator, 'mediaDevices', { value: {
        enumerateDevices: async () => [], addEventListener: () => {},
        getUserMedia: async () => { throw new DOMException('Camera permission denied. Select another source or upload an image.', 'NotAllowedError') },
      } })
    })
    const image = readFileSync('public/assets/sashiboCoreFull.png')
    await page.route(/^https:\/\/[^/]+\.supabase\.co\//, route => route.fulfill({ contentType: 'application/json', body: '[]' }))
    await page.route('**/local-api/**', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(
      route.request().method() === 'POST' ? { saved: route.request().postDataJSON().record.id } : { records: [], sqlite: 'ready', writable: true },
    ) }))
    await page.route('**/status', route => route.fulfill({ contentType: 'application/json', body: '{"models":{"sashibocore":true,"tailcut":true}}' }))
    await page.route(/\/(?:stream|snapshot|video)(?:\?|$)/, route => route.fulfill({ contentType: 'image/png', body: image }))
    let samples = 0
    await page.route('**/grade', route => {
      const tail = samples++ > 0, confidence = tail ? .91 : .74
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({
        id: `layout-${samples}`, capture_id: `layout-capture-${samples}`, image_type: tail ? 'tailcut' : 'sashibocore',
        grade: 'GRADE_B', confidence, scores: { GRADE_A: .02, GRADE_B: confidence, GRADE_C: .02, INVALID: .01 },
      }) })
    })
    await page.goto('/?kiosk=1')
    const kiosk = page.frameLocator('iframe[title="TunaEye"]')
    await kiosk.locator('#gs').click()
    await kiosk.locator('#in').fill('Alexandria Socorro')
    await separate(kiosk.locator('#dmc'), kiosk.locator('#te-test-print-btn'))
    await kiosk.locator('#te-test-print-btn').click()
    await expect(kiosk.getByRole('dialog', { name: 'Connect & Print Test Receipt' })).toBeVisible()
    await kiosk.locator('#tp-cancel').click()
    await kiosk.locator('#go').click()
    await kiosk.getByRole('button', { name: 'Start live grading', exact: true }).click()
    await kiosk.locator('[data-k="8"]').click(); await kiosk.locator('[data-k="5"]').click()
    await kiosk.locator('#go').click()
    if (await kiosk.locator('#tps').isVisible()) await kiosk.locator('#tps').click()
    await expect(kiosk.locator('#cam-select option').first()).toBeAttached()

    for (const source of ['droidcam', 'device', 'pi']) {
      await kiosk.locator('#cam-select').selectOption(source)
      if (source === 'droidcam') await expect(kiosk.locator('#cam-droid-url')).toBeVisible()
      if (source === 'device') {
        await expect(kiosk.locator('#cam-hint')).toContainText('Camera permission denied')
        await kiosk.locator('#cam-hint').scrollIntoViewIfNeeded()
      }
      await separate(kiosk.locator('.lt-controls'), kiosk.locator('#sh'))
      await separate(kiosk.locator('#sh'), kiosk.locator('#up'))
      expect((await kiosk.locator('#sh').boundingBox())!.height).toBeGreaterThan(60)
      expect((await kiosk.locator('#up').boundingBox())!.height).toBeGreaterThan(42)
    }
    await page.screenshot({ path: `test-results/label-layout/capture-${viewport.width}.png` })
    await kiosk.locator('#sh').click()
    await expect(kiosk.getByRole('heading', { name: 'Tail cut needed' })).toBeVisible()
    await separate(kiosk.locator('.ph5 .v5c'), kiosk.locator('.ph5 .v5sc'))
    await page.screenshot({ path: `test-results/label-layout/tail-needed-${viewport.width}.png` })
    await kiosk.locator('#go').click()
    await kiosk.getByRole('button', { name: 'Scan Tail-Cut', exact: true }).click()
    await kiosk.locator('#sh').click()
    await expect(kiosk.locator('.med5-l')).toHaveText('B')
    const photos = kiosk.locator('.ph5')
    for (let index = 0; index < await photos.count(); index++) {
      await separate(photos.nth(index).locator('.v5c'), photos.nth(index).locator('.v5sc'))
    }
    await kiosk.locator('#go').click()
    await expect(kiosk.locator('.rh1')).toBeVisible()
    await separate(kiosk.locator('.rcr'), kiosk.locator('.rcv .ow'))
    await page.screenshot({ path: `test-results/label-layout/receipt-${viewport.width}.png` })
    await kiosk.locator('#sk').click(); await kiosk.locator('#mk').click()
    await expect(kiosk.getByText('Results recorded.', { exact: true })).toBeVisible()
    await expect(kiosk.locator('#bw')).toBeVisible({ timeout: 12000 })
    await kiosk.locator('#bk').click()
    await kiosk.getByRole('button', { name: 'Yes, exit', exact: true }).click()
    await kiosk.locator('#dmsw').click()
    await expect(kiosk.getByRole('combobox', { name: 'Demo scenario' })).toBeVisible()
    await separate(kiosk.getByRole('combobox', { name: 'Demo scenario' }), kiosk.locator('#dmc'))
    await separate(kiosk.locator('#dmc'), kiosk.locator('#te-test-print-btn'))
    await page.screenshot({ path: `test-results/label-layout/identity-${viewport.width}.png` })
    expect(samples).toBe(2)
    expect(failed).toEqual([]); expect(errors).toEqual([])
  })
}
