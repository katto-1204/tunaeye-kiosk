const { chromium, expect } = require('@playwright/test')
const http = require('http')
const fs = require('fs')
const path = require('path')
const root = path.resolve('dist'), port = 4196
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' }
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, `http://127.0.0.1:${port}`).pathname)
  if (pathname === '/local-api/records') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end('{"records":[]}') }
  if (pathname === '/status') { res.writeHead(503, { 'Content-Type': 'application/json' }); return res.end('{"error":"Pi test unavailable"}') }
  const file = pathname === '/sw.js' ? path.resolve('public/sw.js') : pathname.startsWith('/fonts/') ? path.resolve('public', '.' + pathname) : path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname))
  if ((file !== path.resolve('public/sw.js') && !file.startsWith(root + path.sep) && !file.startsWith(path.resolve('public/fonts') + path.sep)) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { console.log('Missing test-server file:', pathname); res.writeHead(404); return res.end('Missing file') }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'Vary': 'Origin' }); fs.createReadStream(file).pipe(res)
})
;(async () => {
  await new Promise(resolve => server.listen(port, '127.0.0.1', resolve))
  const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-gpu', '--disable-software-rasterizer'] })
  try {
    const context = await b.newContext({ viewport: { width: 1024, height: 600 } }), page = await context.newPage(), errors = []
    page.on('pageerror', e => errors.push(e.message))
    await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' }))
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' })
    try { await page.evaluate(() => Promise.race([navigator.serviceWorker.ready, new Promise((_, reject) => setTimeout(() => reject(Error('Offline worker did not activate within 15 seconds')), 15000))])) }
    catch (error) { console.log('Worker diagnostic', await page.evaluate(async () => ({ registrations: (await navigator.serviceWorker.getRegistrations()).map(r => ({ active: r.active?.state, installing: r.installing?.state, waiting: r.waiting?.state })), body: document.body.innerText })), errors); throw error }
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller))
    console.log('PWA check: worker controlling production shell')
    const keys = await page.evaluate(async () => { const cache = await caches.open((await caches.keys()).find(x => x.startsWith('tunaeye-'))); return (await cache.keys()).map(x => new URL(x.url).pathname) })
    expect(keys.filter(x => x.endsWith('.woff2'))).toHaveLength(4)
    expect(keys.filter(x => x.endsWith('.ttf'))).toHaveLength(9)
    expect(keys.includes('/fonts/exact-ui.css')).toBe(true)
    expect(keys.some(x => x.includes('vendor-'))).toBe(true)
    expect(keys.some(x => x === '/local-api/records' || x === '/status')).toBe(false)
    expect(await page.evaluate(async () => (await fetch('/status')).status)).toBe(503)
    await context.setOffline(true)
    await page.reload({ waitUntil: 'domcontentloaded' })
    console.log('PWA check: offline reload returned')
    await page.locator('iframe[title="TunaEye"]').waitFor({ timeout: 15000 })
    const landing = page.frames().find(x => x.parentFrame())
    await expect(landing.locator('.hero')).toBeVisible()
    await expect(page.getByRole('status')).toHaveCount(0)
    const loadedFonts = await page.evaluate(async () => {
      const stylesheet = document.createElement('link'); stylesheet.rel = 'stylesheet'; stylesheet.href = '/fonts/exact-ui.css'
      await new Promise((resolve, reject) => { stylesheet.onload = resolve; stylesheet.onerror = reject; document.head.append(stylesheet) })
      for (const weight of [300, 400, 500, 600, 700, 800, 900]) await document.fonts.load(`${weight} 18px Inter`, 'TunaEye ₱123')
      await document.fonts.load('400 18px "Instrument Serif"', 'TunaEye ₱123')
      await document.fonts.load('italic 400 18px "Instrument Serif"', 'TunaEye ₱123')
      return [...document.fonts].filter(font => ['Inter', 'Instrument Serif'].includes(font.family.replaceAll('"', '')) && font.status === 'loaded').length
    })
    expect(loadedFonts).toBe(9)
    console.log('PWA check: all nine exact font faces loaded offline')
    expect(await page.evaluate(async () => { try { await fetch('/status'); return 'unexpected response' } catch { return 'network failure' } })).toBe('network failure')
    console.log('PWA check: offline API failed without cached response')
    expect(await page.evaluate(async () => { try { await fetch('/assets/missing-test.js'); return 'unexpected response' } catch { return 'network failure' } })).toBe('network failure')
    console.log('PWA check: missing asset failed without HTML fallback')
    await context.setOffline(false)
    console.log('PWA check: reconnected')
    expect(await page.evaluate(async () => { const r = await fetch('/assets/missing-test.js'); return { status: r.status, text: await r.text() } })).toEqual({ status: 404, text: 'Missing file' })
    await landing.locator('[data-act="start"]').first().click()
    await landing.locator('#kiosk-wrap iframe').waitFor()
    const kiosk = page.frames().find(x => x.parentFrame() === landing)
    await expect.poll(() => kiosk.evaluate(() => Boolean(window.__tunaeyeAttached))).toBe(true)
    let navigations = 0; page.on('framenavigated', () => navigations++)
    await kiosk.locator('#gs').click()
    await kiosk.locator('#dmsw').click()
    await expect(kiosk.locator('#dmsw')).toHaveAttribute('aria-checked', 'true')
    await kiosk.locator('#in').fill('Tablet stability QA')
    await kiosk.locator('#go').click()
    for (const digit of ['8', '5']) await kiosk.locator(`[data-k="${digit}"]`).click()
    expect(navigations).toBe(0)
    if (errors.length) throw Error(errors.join('\n'))
    console.log('PASS localhost production offline launch; fonts/vendor precached; APIs never cached; missing assets never HTML; reconnection; tablet-sized input navigation without document reload or page errors')
    await context.close()
  } finally { await b.close(); await new Promise(resolve => server.close(resolve)) }
})().catch(e => { console.error(e); server.close(); process.exitCode = 1 })
