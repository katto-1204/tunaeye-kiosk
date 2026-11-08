import {readFileSync} from 'node:fs'
import {expect, test} from '@playwright/test'

test.beforeEach(async ({page}) => {
  await page.route('**/auth/v1/health', route => route.fulfill({contentType: 'application/json', body: '{"name":"GoTrue"}'}))
})

test('public full demo runs capture and inference without the Pi', async ({page}) => {
  test.skip(process.env.VITE_DEMO_MODE === 'true', 'The demo build starts in demo mode and uses a different entry state.')
  await page.goto('/')
  await page.getByRole('button', {name: 'Try full demo · no Pi'}).first().click()
  await expect(page.getByRole('heading', {name: 'Fish weight'})).toBeVisible()
  await page.getByRole('button', {name: '3', exact: true}).click()
  await page.getByRole('button', {name: '0', exact: true}).click()
  await page.getByRole('button', {name: 'Start capture'}).click()
  await expect(page.getByRole('img', {name: 'Demo specimen preview'})).toBeVisible()
  await page.getByRole('button', {name: 'Capture', exact: true}).click()
  await expect(page.getByRole('heading', {name: 'Sashibo core · Grade A'})).toBeVisible()
  await expect(page.getByText('96.3%', {exact: true})).toBeVisible()
  await page.getByRole('button', {name: 'Print receipt'}).click()
  await expect(page.getByRole('heading', {name: 'Print the receipt.'})).toBeVisible()
})

for (const setup of [
  {name: 'saved demo flag', stored: true, query: ''},
  {name: 'demo URL', stored: false, query: '?demo=1'},
  {name: 'saved flag and demo URL', stored: true, query: '?demo=1'},
]) {
  test(`disabled demo mode ignores ${setup.name} and uses Pi capture and inference`, async ({page}) => {
    test.skip(process.env.VITE_DEMO_MODE === 'true', 'Regression targets demo-disabled builds.')
    const errors: string[] = []
    const failures: string[] = []
    const calls: string[] = []
    const image = readFileSync('public/DEMO_SAMPLES/SASHIBOCORE_A.png')
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => {if (message.type() === 'error') errors.push(message.text())})
    page.on('requestfailed', request => failures.push(request.url()))
    await page.addInitScript(stored => {
      localStorage.setItem('tunaeye-installed', 'true')
      if (stored) localStorage.setItem('tunaeye-demo-mode', '1')
    }, setup.stored)
    await page.route('**/stream', route => route.fulfill({contentType: 'image/png', body: image}))
    await page.route('**/snapshot', route => {
      calls.push('snapshot')
      return route.fulfill({contentType: 'image/png', body: image})
    })
    await page.route('**/grade', route => {
      calls.push('grade')
      expect(route.request().method()).toBe('POST')
      expect(route.request().postData()).toContain('sashibocore')
      return route.fulfill({contentType: 'application/json', body: JSON.stringify({id: 'pi-regression-result', capture_id: 'pi-regression-capture', image_type: 'sashibocore', grade: 'GRADE_C', confidence: .882, scores: {GRADE_A: .04, GRADE_B: .07, GRADE_C: .882, INVALID: .008}})})
    })
    await page.goto(`/kiosk/camera${setup.query}`)
    await expect(page.getByRole('img', {name: 'Live Raspberry Pi USB camera preview'})).toBeVisible()
    await expect(page.locator('.camera-demo-badge')).toHaveCount(0)
    expect(await page.evaluate(() => localStorage.getItem('tunaeye-demo-mode'))).toBeNull()
    await page.getByRole('button', {name: 'Capture', exact: true}).click()
    await expect(page.getByRole('heading', {name: 'Sashibo core · Grade C'})).toBeVisible()
    await expect(page.locator('.confidence')).toContainText('88.2%')
    expect(calls).toEqual(['snapshot', 'grade'])
    expect(errors).toEqual([])
    expect(failures).toEqual([])
  })
}
