const { chromium, expect } = require('@playwright/test')
const assert = require('node:assert/strict')
;(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-gpu'] })
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }), errors = []
    page.on('pageerror', e => errors.push(e.message))
    await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: '' }))
    await page.route('**/local-api/records', r => r.fulfill({ contentType: 'application/json', body: '{"records":[]}' }))
    await page.addInitScript(() => {
      const make = (sample, confidence, scores, id) => ({ id, sessionId: 'saved-session', timestamp: 1794974400000, grader: 'Original grader', sample, fish: 'Fish 1', weight: '85 kg', grade: 'C', status: 'Complete', result: { status: 'valid', originalGrade: 'C', originalConfidence: confidence, overrideGrade: null, overrideReason: '', scores }, transaction: { currency: 'PHP', unitRatePerKg: 123, amount: 10455, syncState: 'pending' } })
      localStorage.setItem('tunaeye-records', JSON.stringify([make('Sashibo core', 61, { GRADE_A: .2, GRADE_B: .17, GRADE_C: .61, INVALID: .02 }, 'saved-core'), make('Tail cut', 91, { GRADE_A: .03, GRADE_B: .05, GRADE_C: .91, INVALID: .01 }, 'saved-tail')]))
      localStorage.setItem('tunaeye-prices', JSON.stringify({ A: 999, B: 999, C: 999 }))
    })
    await page.goto('http://127.0.0.1:4185/', { waitUntil: 'domcontentloaded' })
    const landing = page.frames().find(f => f.parentFrame()); await landing.locator('.hero').waitFor(); await landing.evaluate(() => window.openKiosk()); await landing.locator('#kiosk-wrap iframe').waitFor()
    const kiosk = page.frames().find(f => f.parentFrame() === landing)
    await expect.poll(() => kiosk.evaluate(() => Boolean(window.__tunaeyeAttached))).toBe(true)
    await kiosk.evaluate(() => {
      S.order = 999; S.name = 'Wrong active grader'; S.w = '16'; S.core = null; S.tail = null
      S.detail = { id: 'saved-core', o: 7, w: 85, g: 'C', c: 61, tl: 91, n: 'Original grader', ts: 1794974400000 }; go('detail')
      window.reprintCalls = 0
      document.addEventListener('load', e => { if (e.target instanceof HTMLIFrameElement) e.target.contentWindow.print = () => { window.reprintCalls++ } }, true)
    })
    await kiosk.locator('#go').click({ force: true })
    await expect.poll(() => kiosk.evaluate(() => window.reprintCalls)).toBe(1)
    const receipt = page.frames().find(f => f.parentFrame() === kiosk)
    await expect(receipt.locator('.row').filter({ hasText: 'Order' })).toContainText('TE_0007')
    await expect(receipt.locator('body')).toContainText('Original grader')
    await expect(receipt.locator('body')).not.toContainText('Wrong active grader')
    await expect(receipt.locator('.bold')).toContainText('PHP 10,455.00')
    await expect(receipt.locator('.row').filter({ hasText: 'Rate / kg' })).toContainText('PHP 123.00')
    await expect(receipt.locator('.row').filter({ hasText: 'Weight' })).toContainText('85 kg')
    await expect(receipt.locator('.grade')).toHaveText('GRADE C')
    const before = await page.evaluate(() => localStorage.getItem('tunaeye-records'))
    const refused = await kiosk.evaluate(async () => { S.detail.id = 'missing'; try { await window.top.TunaEyeRuntime.print(window); return false } catch { return true } })
    assert.equal(refused, true)
    assert.equal(await page.evaluate(() => localStorage.getItem('tunaeye-records')), before)
    assert.equal(errors.length, 0)
    console.log('PASS saved-session reprint with empty active session, saved grade/rate/total/grader/weight/order, missing record refused, records unchanged, no page errors')
  } finally { await browser.close() }
})().catch(error => { console.error(error); process.exit(1) })
