const { chromium, expect } = require('@playwright/test')
const fs = require('fs')
;(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    for (const viewport of [{ width: 1280, height: 800 }, { width: 1024, height: 600 }]) {
      const context = await browser.newContext({ viewport }), page = await context.newPage(), errors = []
      page.on('pageerror', error => errors.push(error.message))
      await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ contentType: 'text/css', body: '' }))
      let statusCalls = 0, snapshotCalls = 0, ready = false
      await page.route('**/status', route => { statusCalls++; return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ service: 'Fixture Flask', models: { sashibocore: true, tailcut: ready } }) }) })
      await page.route('**/snapshot', route => { snapshotCalls++; return route.fulfill({ contentType: 'image/png', body: fs.readFileSync('public/assets/sashiboCoreFull.png') }) })
      await page.route('**/local-api/records', route => route.fulfill({ contentType: 'application/json', body: '{"records":[]}' }))
      await page.route('**/local-api/health', route => route.fulfill({ contentType: 'application/json', body: '{"sqlite":"ready","writable":true}' }))
      await page.goto('http://127.0.0.1:4185/')
      await page.locator('iframe[title="TunaEye"]').waitFor()
      const landing = page.frames().find(frame => frame.parentFrame()); await landing.locator('.hero').waitFor()
      await landing.evaluate(() => window.openKiosk()); await landing.locator('#kiosk-wrap iframe').waitFor()
      const kiosk = page.frames().find(frame => frame.parentFrame() === landing)
      await expect.poll(() => kiosk.evaluate(() => Boolean(window.__tunaeyeAttached))).toBe(true)
      expect(statusCalls).toBe(0); expect(snapshotCalls).toBe(0)
      await kiosk.evaluate(async () => { const m = await import('/src/liveReadiness.ts'); window.readinessResult = undefined; m.showLiveReadiness(window).then(result => window.readinessResult = result) })
      const dialog = kiosk.getByRole('dialog', { name: 'Ready for live grading?' })
      await expect(dialog.locator('[data-live-check=tailcut]')).toContainText('not loaded')
      await expect(dialog.getByRole('button', { name: 'Start live grading', exact: true })).toBeDisabled()
      await expect(dialog.locator('[data-live-check=camera]')).toContainText('decodable')
      expect(statusCalls).toBe(1); expect(snapshotCalls).toBe(1)
      ready = true
      await dialog.getByRole('button', { name: 'Retry checks', exact: true }).click({ force: true })
      await expect(dialog.getByRole('button', { name: 'Start live grading', exact: true })).toBeEnabled()
      await expect(page.getByRole('status', { name: 'Opening grading kiosk' })).toHaveCount(0)
      await page.waitForTimeout(500)
      fs.mkdirSync('test-results/live-readiness', { recursive: true }); await page.screenshot({ path: `test-results/live-readiness/${viewport.width}.png` })
      await dialog.getByRole('button', { name: 'Start live grading', exact: true }).click({ force: true })
      await expect.poll(() => kiosk.evaluate(() => window.readinessResult)).toBe(true)
      const pin = await page.evaluate(async () => {
        const m = await import('/src/adminPin.ts')
        localStorage.removeItem('tunaeye-admin-pin-v1'); localStorage.removeItem('tunaeye-admin-pin-attempts')
        const dev = await m.verifyAdminPin('1234')
        await m.changeAdminPin('1234', '2468')
        const old = await m.verifyAdminPin('1234'), updated = await m.verifyAdminPin('2468')
        const saved = JSON.parse(localStorage.getItem('tunaeye-admin-pin-v1'))
        for (let i = 0; i < 5; i++) await m.verifyAdminPin('0000')
        let locked = false
        try { await m.verifyAdminPin('2468') } catch (error) { locked = error.message.includes('Too many') }
        return { dev, old, updated, hash: saved.hash.length, plaintext: JSON.stringify(saved).includes('2468'), locked }
      })
      expect(pin).toEqual({ dev: true, old: false, updated: true, hash: 64, plaintext: false, locked: true })
      expect(errors).toEqual([])
      console.log(`PASS ${viewport.width}: no automatic probes; blocked missing tail model; retry and ready-only start; dev PIN, salted rotation, wrong-PIN rejection and cooldown`)
      await context.close()
    }
  } finally { await browser.close() }
})().catch(error => { console.error(error); process.exit(1) })
