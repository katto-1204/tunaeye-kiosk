const { chromium, expect } = require('@playwright/test')
;(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-gpu', '--disable-software-rasterizer'] })
  try {
    const c = await b.newContext(), p = await c.newPage(), errors = []
    p.on('pageerror', e => errors.push(e.message))
    await p.goto('http://127.0.0.2:4187/')
    await p.evaluate(() => navigator.serviceWorker.ready)
    await p.waitForFunction(() => Boolean(navigator.serviceWorker.controller))
    await c.setOffline(true)
    await p.reload({ waitUntil: 'domcontentloaded' })
    try { await p.locator('iframe[title="TunaEye"]').waitFor({ timeout: 10000 }) }
    catch (e) { console.log('Page errors', errors); console.log('Cache', await p.evaluate(async () => { const cache = await caches.open((await caches.keys())[0]); return (await cache.keys()).map(x => x.url) })); throw e }
    const f = p.frames().find(x => x.parentFrame())
    await expect(f.locator('.hero')).toBeVisible()
    await expect(p.getByRole('status')).toHaveCount(0)
    if (errors.length) throw Error(errors.join('\n'))
    console.log('PASS production offline shell reload with dial/vendor/CSS and no page errors')
  } finally { await b.close() }
})().catch(e => { console.error(e); process.exit(1) })
