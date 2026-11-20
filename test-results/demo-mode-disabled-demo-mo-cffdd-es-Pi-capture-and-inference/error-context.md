# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: demo-mode.spec.ts >> disabled demo mode ignores demo URL and uses Pi capture and inference
- Location: tests\demo-mode.spec.ts:29:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('img', { name: 'Live Raspberry Pi USB camera preview' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('img', { name: 'Live Raspberry Pi USB camera preview' }) with timeout 5000ms
  - waiting for getByRole('img', { name: 'Live Raspberry Pi USB camera preview' })

```

```yaml
- iframe
```

# Test source

```ts
  1  | import {readFileSync} from 'node:fs'
  2  | import {expect, test} from '@playwright/test'
  3  | 
  4  | test.beforeEach(async ({page}) => {
  5  |   await page.route('**/auth/v1/health', route => route.fulfill({contentType: 'application/json', body: '{"name":"GoTrue"}'}))
  6  | })
  7  | 
  8  | test('public full demo runs capture and inference without the Pi', async ({page}) => {
  9  |   test.skip(process.env.VITE_DEMO_MODE === 'true', 'The demo build starts in demo mode and uses a different entry state.')
  10 |   await page.goto('/')
  11 |   await page.getByRole('button', {name: 'Try full demo · no Pi'}).first().click()
  12 |   await expect(page.getByRole('heading', {name: 'Fish weight'})).toBeVisible()
  13 |   await page.getByRole('button', {name: '3', exact: true}).click()
  14 |   await page.getByRole('button', {name: '0', exact: true}).click()
  15 |   await page.getByRole('button', {name: 'Start capture'}).click()
  16 |   await expect(page.getByRole('img', {name: 'Demo specimen preview'})).toBeVisible()
  17 |   await page.getByRole('button', {name: 'Capture', exact: true}).click()
  18 |   await expect(page.getByRole('heading', {name: 'Sashibo core · Grade A'})).toBeVisible()
  19 |   await expect(page.getByText('96.3%', {exact: true})).toBeVisible()
  20 |   await page.getByRole('button', {name: 'Print receipt'}).click()
  21 |   await expect(page.getByRole('heading', {name: 'Print the receipt.'})).toBeVisible()
  22 | })
  23 | 
  24 | for (const setup of [
  25 |   {name: 'saved demo flag', stored: true, query: ''},
  26 |   {name: 'demo URL', stored: false, query: '?demo=1'},
  27 |   {name: 'saved flag and demo URL', stored: true, query: '?demo=1'},
  28 | ]) {
  29 |   test(`disabled demo mode ignores ${setup.name} and uses Pi capture and inference`, async ({page}) => {
  30 |     test.skip(process.env.VITE_DEMO_MODE === 'true', 'Regression targets demo-disabled builds.')
  31 |     const errors: string[] = []
  32 |     const failures: string[] = []
  33 |     const calls: string[] = []
  34 |     const image = readFileSync('public/DEMO_SAMPLES/SASHIBOCORE_A.png')
  35 |     page.on('pageerror', error => errors.push(error.message))
  36 |     page.on('console', message => {if (message.type() === 'error') errors.push(message.text())})
  37 |     page.on('requestfailed', request => failures.push(request.url()))
  38 |     await page.addInitScript(stored => {
  39 |       localStorage.setItem('tunaeye-installed', 'true')
  40 |       if (stored) localStorage.setItem('tunaeye-demo-mode', '1')
  41 |     }, setup.stored)
  42 |     await page.route('**/stream', route => route.fulfill({contentType: 'image/png', body: image}))
  43 |     await page.route('**/snapshot', route => {
  44 |       calls.push('snapshot')
  45 |       return route.fulfill({contentType: 'image/png', body: image})
  46 |     })
  47 |     await page.route('**/grade', route => {
  48 |       calls.push('grade')
  49 |       expect(route.request().method()).toBe('POST')
  50 |       expect(route.request().postData()).toContain('sashibocore')
  51 |       return route.fulfill({contentType: 'application/json', body: JSON.stringify({id: 'pi-regression-result', capture_id: 'pi-regression-capture', image_type: 'sashibocore', grade: 'GRADE_C', confidence: .882, scores: {GRADE_A: .04, GRADE_B: .07, GRADE_C: .882, INVALID: .008}})})
  52 |     })
  53 |     await page.goto(`/kiosk/camera${setup.query}`)
> 54 |     await expect(page.getByRole('img', {name: 'Live Raspberry Pi USB camera preview'})).toBeVisible()
     |                                                                                         ^ Error: expect(locator).toBeVisible() failed
  55 |     await expect(page.locator('.camera-demo-badge')).toHaveCount(0)
  56 |     expect(await page.evaluate(() => localStorage.getItem('tunaeye-demo-mode'))).toBeNull()
  57 |     await page.getByRole('button', {name: 'Capture', exact: true}).click()
  58 |     await expect(page.getByRole('heading', {name: 'Sashibo core · Grade C'})).toBeVisible()
  59 |     await expect(page.locator('.confidence')).toContainText('88.2%')
  60 |     expect(calls).toEqual(['snapshot', 'grade'])
  61 |     expect(errors).toEqual([])
  62 |     expect(failures).toEqual([])
  63 |   })
  64 | }
  65 | 
```