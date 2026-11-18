const { chromium, expect } = require('@playwright/test')
const scenarios = [
  ['confident', 'A'], ['grade-b', 'B'], ['grade-c', 'C'],
  ['needs-tail', 'B'], ['needs-expert', 'B'], ['invalid-core', null], ['invalid-tail', null],
]
;(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-gpu', '--disable-software-rasterizer'] })
  try {
    for (const [scenario, grade] of scenarios) {
      const context = await browser.newContext({ viewport: { width: 1024, height: 600 }, screen: { width: 1024, height: 600 }, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (Linux; Android 13; Tablet) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' })
      const page = await context.newPage(), errors = [], samples = []
      let piCalls = 0, writes = 0, reloads = 0
      page.on('pageerror', error => errors.push(error.message))
      page.on('request', request => {
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) writes++
        if (request.url().includes('/DEMO_SAMPLES/')) samples.push(request.url())
      })
      await page.route('**/local-api/records', route => route.fulfill({ contentType: 'application/json', body: '{"records":[]}' }))
      await page.route(/\/(?:status|grade|snapshot|stream)(?:\?|$)/, route => { piCalls++; return route.abort() })
      await page.goto('http://127.0.0.1:4185/', { waitUntil: 'domcontentloaded' })
      await page.locator('iframe[title="TunaEye"]').waitFor()
      const landing = page.frames().find(frame => frame.parentFrame())
      await landing.locator('#kiosk-wrap iframe').waitFor()
      const kiosk = page.frames().find(frame => frame.parentFrame() === landing)
      await expect.poll(() => kiosk.evaluate(() => Boolean(window.__tunaeyeAttached))).toBe(true)
      expect(await kiosk.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true)
      page.on('framenavigated', frame => { if (frame === kiosk || frame === page.mainFrame()) reloads++ })
      await kiosk.locator('#gs').click()
      await kiosk.locator('#dmsw').click()
      await expect(kiosk.locator('#dmsw')).toHaveAttribute('aria-checked', 'true')
      await kiosk.getByRole('combobox', { name: 'Demo scenario' }).selectOption(scenario)
      await kiosk.locator('#in').fill(`Demo ${scenario}`)
      await kiosk.locator('#go').click()
      await kiosk.locator('[data-k="8"]').click(); await kiosk.locator('[data-k="5"]').click()
      await kiosk.locator('#go').click()
      if (await kiosk.locator('#tps').isVisible()) await kiosk.locator('#tps').click()
      await expect(kiosk.locator('#sh')).toBeVisible()
      await kiosk.locator('#sh').click()
      const needsTail = ['needs-tail', 'needs-expert', 'invalid-tail'].includes(scenario)
      if (needsTail) {
        await expect(kiosk.getByRole('heading', { name: 'Tail cut needed' })).toBeVisible()
        await kiosk.locator('#go').click(); await kiosk.locator('#sh').click()
      }
      if (!grade) {
        await expect(kiosk.getByRole('alert')).toContainText('This image cannot be graded')
        await expect(kiosk.locator('#sh')).toBeVisible()
        expect(await kiosk.evaluate(() => S.scr)).toBe(scenario === 'invalid-tail' ? 'tail' : 'core')
      } else {
        if (scenario === 'needs-expert') {
          await expect(kiosk.getByRole('heading', { name: 'Expert grade required' })).toBeVisible()
          await kiosk.locator('#go').click()
          await kiosk.locator('#expert-pin').fill('1234')
          await kiosk.locator('[data-grade="B"]').click()
          await kiosk.locator('#expert-reason').fill('Simulated expert assessment')
          await kiosk.locator('#expert-save').click()
        } else {
          await expect(kiosk.locator('.med5-l')).toHaveText(grade)
          await expect(kiosk.locator('.lg5').first()).toContainText('Simulated prediction')
          await kiosk.locator('#go').click()
        }
        await expect(kiosk.locator('.rh1')).toBeVisible()
        // Leave before the auto-print delay; physical/iframe print behavior is covered separately.
        await kiosk.evaluate(() => go('name'))
      }
      expect(samples.some(url => url.includes('SASHIBOCORE_'))).toBe(true)
      if (needsTail) expect(samples.some(url => url.includes('TAILCUT_'))).toBe(true)
      expect(await page.evaluate(() => JSON.parse(localStorage.getItem('tunaeye-records') || '[]'))).toEqual([])
      expect(piCalls).toBe(0); expect(writes).toBe(0); expect(reloads).toBe(0); expect(errors).toEqual([])
      // Prove PIN digits update the existing keypad rather than replacing it and replaying entrance animations.
      await kiosk.evaluate(() => { S.pin = ''; go('pin'); window.qaKeypad = document.querySelector('.kp') })
      for (const digit of ['1', '2', '3']) {
        await kiosk.locator(`[data-k="${digit}"]`).click()
        expect(await kiosk.evaluate(() => document.querySelector('.kp') === window.qaKeypad)).toBe(true)
      }
      await kiosk.locator('[data-k="4"]').click()
      await expect(kiosk.locator('.ad')).toBeVisible()
      expect(await page.evaluate(() => JSON.parse(localStorage.getItem('tunaeye-records') || '[]'))).toEqual([])
      expect(writes).toBe(0)
      console.log(`PASS Android 1024x600 ${scenario}: expected grade/retake/override; sample assets; receipt when accepted; no Pi calls, operational writes or reloads; stable PIN keypad and admin access`)
      await context.close()
    }
  } finally { await browser.close() }
})().catch(error => { console.error(error); process.exit(1) })
