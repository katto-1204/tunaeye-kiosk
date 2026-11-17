const { chromium, expect } = require('@playwright/test')
const fs = require('fs')
;(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    for (const expert of [false, true]) {
      const c = await b.newContext({ viewport: { width: 1024, height: 600 } }), p = await c.newPage()
      const image = fs.readFileSync('public/assets/sashiboCoreFull.png'); let calls = 0
      await p.route('http://10.42.0.1:8080/**', r => r.fulfill({ contentType: 'image/png', body: image }))
      await p.route('http://10.42.0.1:5000/grade', r => { const tail = calls++ > 0, grade = tail ? 'GRADE_B' : 'GRADE_C', confidence = tail ? expert ? .66 : .91 : .68; return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: 'i' + calls, capture_id: 'c' + calls, image_type: tail ? 'tailcut' : 'sashibocore', grade, confidence, scores: { GRADE_A: .01, GRADE_B: tail ? confidence : .02, GRADE_C: tail ? .02 : confidence, INVALID: .01 } }) }) })
      await p.goto('http://127.0.0.1:4185/'); const landing = p.frames().find(f => f.parentFrame()); await landing.locator('.hero').waitFor(); await landing.evaluate(() => window.openKiosk()); await landing.locator('#kiosk-wrap iframe').waitFor()
      const k = p.frames().find(f => f.parentFrame() === landing)
      await expect.poll(() => k.evaluate(() => Boolean(window.__tunaeyeAttached))).toBe(true)
      await k.evaluate(() => { S.name = 'Outcome QA'; S.w = '85'; go('core') })
      await k.locator('#sh').click({force:true}); await expect(k.locator('.v5h h1')).toHaveText('Tail cut needed')
      await k.locator('#go').click(); await k.locator('#sh').click({force:true})
      if (expert) {
        await expect(k.locator('.v5h h1')).toHaveText('Expert grade required')
        await k.locator('#go').click(); await k.locator('#expert-pin').fill('1234'); await k.locator('[data-grade="A"]').click(); await k.locator('#expert-save').click()
        await expect(k.locator('.rh1')).toBeVisible()
      } else { await expect(k.locator('.med5-l')).toHaveText('B') }
      const rows = await p.evaluate(() => JSON.parse(localStorage.getItem('tunaeye-records')))
      if (rows.length !== 2 || rows.some(r => r.grade !== (expert ? 'A' : 'B'))) throw Error('Final grade/persistence mismatch')
      console.log('PASS '+(expert ? 'expert PIN override preserving original predictions' : 'supplementary tail + score-vector combination')+' at 1024x600')
      await c.close()
    }
  } finally { await b.close() }
})().catch(e => { console.error(e); process.exit(1) })
