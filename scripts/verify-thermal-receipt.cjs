const { chromium, expect } = require('@playwright/test')
const { transformSync } = require('esbuild')
const fs = require('node:fs')
const assert = require('node:assert/strict')
;(async () => {
  const source = fs.readFileSync('src/thermalReceipt.ts', 'utf8')
  const code = transformSync(source, { loader: 'ts', format: 'iife', globalName: 'Thermal' }).code
  const b = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const c = await b.newContext({ viewport: { width: 1024, height: 600 } }), p = await c.newPage(), errors = [], requests = []
    p.on('pageerror', e => errors.push(e.message)); p.on('request', r => requests.push(r.url()))
    await p.setContent('<body><button id="keep">Original kiosk stays untouched</button></body>')
    await p.addScriptTag({ content: code }); await c.setOffline(true)
    const receipt = { station: 'TUNAEYE STATION 01', order: 'TE_0001', grader: 'Very Long Expert Grader Name <script>not executable</script>', timestamp: 1794974400000, weight: '200', grade: 'C', unitRatePerKg: 280, total: 56000, core: { grade: 'C', confidence: 72 }, tail: { grade: 'C', confidence: 91 }, demo: false }
    await p.evaluate(async data => {
      window.printCalls = 0
      document.addEventListener('load', e => { if (e.target instanceof HTMLIFrameElement) e.target.contentWindow.print = () => { window.printCalls++ } }, true)
      await Thermal.printThermalReceipt(window, data)
    }, receipt)
    assert.equal(await p.evaluate(() => window.printCalls), 1)
    await expect(p.locator('#keep')).toBeVisible()
    const f = p.frames().find(x => x.parentFrame())
    await f.locator('main').waitFor(); await p.emulateMedia({ media: 'print' })
    await expect(f.locator('.grade')).toHaveText('GRADE C')
    await expect(f.locator('.bold')).toContainText('PHP 56,000.00')
    await expect(f.locator('script')).toHaveCount(0)
    assert.equal(await f.locator('.barcode svg').getAttribute('viewBox'), '0 0 132 42')
    // TE_0001: Start B 104 + weighted characters = 778; checksum 57 = 312113.
    const lastSymbol = await f.locator('.barcode rect').evaluateAll(rects => rects.slice(-7, -4).map(r => +r.getAttribute('width')))
    assert.deepEqual(lastSymbol, [3, 2, 1])
    const layout = await f.locator('main').evaluate(e => {
      const bounds = e.getBoundingClientRect()
      return { width: bounds.width, height: bounds.height, overflow: e.scrollWidth > e.clientWidth, clipped: [...e.querySelectorAll('*')].some(n => n.getBoundingClientRect().right > bounds.right + .5), size: [...document.styleSheets].flatMap(s => [...s.cssRules]).filter(r => r.cssText.startsWith('@page')).at(-1).cssText }
    })
    assert.ok(Math.abs(layout.width - 58 * 96 / 25.4) < 1)
    assert.equal(layout.overflow, false); assert.equal(layout.clipped, false)
    assert.ok(layout.height < 460, JSON.stringify(layout))
    assert.match(layout.size, /size: 58mm \d+mm/)
    const paperHeight = +layout.size.match(/size: 58mm (\d+)mm/)[1]
    assert.ok(paperHeight - layout.height * 25.4 / 96 < 2, 'Receipt paper has excess trailing space')
    fs.mkdirSync('test-results/thermal-receipt', { recursive: true })
    await p.locator('iframe[data-thermal-receipt]').evaluate((e, height) => { e.style.left = '0'; e.style.height = `${height}px` }, layout.height)
    await f.locator('main').screenshot({ path: 'test-results/thermal-receipt/58mm.png' })
    await p.evaluate(() => document.querySelector('iframe[data-thermal-receipt]').contentWindow.dispatchEvent(new Event('afterprint')))
    await expect(p.locator('iframe[data-thermal-receipt]')).toHaveCount(0)
    const demoHtml = await p.evaluate(data => Thermal.thermalReceiptHtml({ ...data, demo: true }), receipt)
    assert.match(demoHtml, /SIMULATED PREDICTION/)
    assert.equal(errors.length, 0); assert.equal(requests.length, 0)
    console.log('PASS offline 58mm thermal print: compact page, no clipping, long grader escaped/wrapped, bold grade/total, Code128 checksum/quiet zones, preserved kiosk, afterprint cleanup, no requests/errors')
    await c.close()
  } finally { await b.close() }
})().catch(error => { console.error(error); process.exit(1) })
