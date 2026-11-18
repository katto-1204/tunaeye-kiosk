const { chromium, expect } = require('@playwright/test')
const fs = require('fs')
;(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-gpu', '--disable-software-rasterizer'] })
  try {
    for (const viewport of [{ width: 1280, height: 800 }, { width: 1024, height: 600 }]) {
      const c = await b.newContext({ viewport }), p = await c.newPage(), errors = [], network = []
      await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '@font-face{font-family:Inter;src:url(http://127.0.0.1:4185/fonts/OpenRunde-Regular.woff2)}' }))
      p.on('pageerror', e => errors.push(e.message))
      p.on('requestfailed', r => network.push(`${r.url()}: ${r.failure()?.errorText}`))
      p.on('response', r => { if (r.status() >= 400) network.push(`${r.status()} ${r.url()}`) })
      await p.goto('http://127.0.0.1:4185/', { waitUntil: 'domcontentloaded' }); await p.locator('iframe[title="TunaEye"]').waitFor()
      const landing = p.frames().find(f => f.parentFrame()); await landing.locator('.hero').waitFor(); await landing.evaluate(() => window.openKiosk()); await landing.locator('#kiosk-wrap iframe').waitFor()
      const k = p.frames().find(f => f.parentFrame() === landing)
      await expect.poll(() => k.evaluate(() => Boolean(window.__tunaeyeAttached))).toBe(true)
      await k.evaluate(() => { S.tab = 'overview'; go('admin') })
      await k.locator('#lo').click()
      const dialog = k.getByRole('dialog', { name: 'Log out?' }), confirm = dialog.getByRole('button', { name: 'Log out', exact: true })
      await expect(dialog).toBeVisible()
      const styles = await confirm.evaluate(e => { const s = getComputedStyle(e), r = document.createRange(); r.selectNodeContents(e); return { display: s.display, color: s.color, lines: r.getClientRects().length, width: e.getBoundingClientRect().width, height: e.getBoundingClientRect().height } })
      if (!['flex', 'inline-flex'].includes(styles.display) || styles.color !== 'rgb(255, 255, 255)' || styles.lines !== 1) throw Error('Broken logout button: '+JSON.stringify(styles))
      fs.mkdirSync('test-results/logout', { recursive: true }); await p.waitForTimeout(500); await p.screenshot({ path: `test-results/logout/${viewport.width}.png` })
      await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
      await expect(dialog).toHaveCount(0); await expect(k.locator('.ad')).toBeVisible()
      await k.locator('#lo').click(); await confirm.click()
      await expect(k.locator('#gs')).toBeVisible(); await expect(k.locator('.ad')).toHaveCount(0)
      if (errors.length) throw Error(errors.join('\n'))
      if (network.length) throw Error(network.join('\n'))
      console.log(`PASS logout ${viewport.width}x${viewport.height}: readable button, Cancel retains admin, confirmation returns welcome, no page errors or failed requests`)
      await c.close()
    }
  } finally { await b.close() }
})().catch(e => { console.error(e); process.exit(1) })
