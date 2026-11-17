import { expect, test } from '@playwright/test'

test('hotspot DNS failure preserves pending records and syncs only on request', async ({ page }) => {
  test.setTimeout(45000)
  test.skip(!process.env.VITE_SUPABASE_URL, 'Run with mock Supabase Vite environment variables.')
  let requests = 0
  let probes = 0
  let internet = false
  const errors: string[] = []
  const failures: string[] = []
  const consoleErrors: string[] = []
  await page.setViewportSize({ width: 1024, height: 600 })
  page.on('pageerror', error => errors.push(error.message))
  page.on('requestfailed', request => failures.push(request.url()))
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()) })
  await page.route('**/status', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) }))
  await page.route('http://supabase.test/**', route => {
    if (new URL(route.request().url()).pathname === '/auth/v1/health') {
      probes += 1
      return internet ? route.fulfill({ contentType: 'application/json', body: '{"name":"GoTrue"}' }) : route.abort('namenotresolved')
    }
    requests += 1
    if (internet && new URL(route.request().url()).pathname === '/auth/v1/signup') return route.fulfill({ status: 400, contentType: 'application/json', body: '{"message":"Anonymous sign-ins are disabled"}' })
    return route.abort('namenotresolved')
  })
  await page.addInitScript(() => {
    localStorage.setItem('tunaeye-installed', 'true')
    localStorage.setItem('tunaeye-grader-name', 'Maria Santos')
    localStorage.setItem('tunaeye-records', JSON.stringify([{
      id: 'hotspot-record', sessionId: 'hotspot-session', timestamp: Date.now(), time: 'Now', grader: 'Maria Santos', sample: 'Sashibo core', fish: 'Fish 1', weight: '42 kg', grade: 'A', status: 'Complete', capturedImage: '/assets/sashiboCoreFull.png',
      transaction: { currency: 'PHP', unitRatePerKg: 420, amount: 17640, syncState: 'pending' },
    }]))
  })
  await page.goto('/kiosk/grader-dashboard')
  await expect(page.getByRole('button', { name: 'Sync now' })).toBeVisible()
  await expect.poll(() => probes).toBeGreaterThan(0)
  await expect(page.getByText('Internet is back', { exact: true })).toHaveCount(0)
  const original = await page.evaluate(() => localStorage.getItem('tunaeye-records'))
  await page.evaluate(() => window.dispatchEvent(new Event('online')))
  await expect.poll(() => probes).toBeGreaterThan(1)
  expect(requests).toBe(0)
  await expect(page.getByText('Internet is back', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Sync now' }).click()
  await expect(page.getByRole('heading', { name: 'Waiting for internet' })).toBeVisible()
  await expect(page.getByText(/Use Sync now when internet is available/)).toBeVisible()
  await expect(page.locator('.image-sync-label')).toHaveText('Saved locally')
  expect(requests).toBe(0)
  expect(await page.evaluate(() => localStorage.getItem('tunaeye-records'))).toBe(original)
  await page.getByRole('button', { name: 'Understood' }).click()
  internet = true
  // Internet can return while the hotspot Wi-Fi stays connected: no online event.
  await expect(page.getByText('Internet is back', { exact: true })).toBeVisible({ timeout: 20000 })
  await expect(page.getByText('You can sync your saved images now.')).toBeVisible()
  await expect(page.locator('.internet-toast')).toBeInViewport()
  await page.screenshot({ path: 'test-results/internet-recovery-1024x600.png' })
  expect(requests).toBe(0)
  await page.getByRole('button', { name: 'Dismiss internet message' }).click()
  const previousProbes = probes
  await page.evaluate(() => window.dispatchEvent(new Event('online')))
  await expect.poll(() => probes).toBeGreaterThan(previousProbes)
  await expect(page.getByText('Internet is back', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Sync now' }).click()
  await expect(page.getByRole('heading', { name: 'Sync unavailable' })).toBeVisible()
  await expect(page.getByText('Anonymous sign-ins are disabled', { exact: true })).toBeVisible()
  expect(requests).toBe(1)
  expect(await page.evaluate(() => localStorage.getItem('tunaeye-records'))).toBe(original)
  await page.getByRole('button', { name: 'Understood' }).click()
  await page.getByRole('button', { name: 'Start grading', exact: true }).click()
  await expect(page.getByRole('heading', { name: /Fish weight/i })).toBeVisible()
  await page.goto('/admin')
  for (const [index, digit] of ['1', '2', '3', '4'].entries()) await page.getByLabel(`PIN digit ${index + 1}`).fill(digit)
  await page.getByRole('button', { name: 'Verify and continue' }).click()
  await page.getByRole('button', { name: 'Devices', exact: true }).click()
  await page.getByRole('button', { name: 'Check network' }).click()
  await expect(page.getByText('Internet available · Ready to sync')).toBeVisible()
  await expect(page.getByText('Station cloud sync ready')).toHaveCount(0)
  expect(errors).toEqual([])
  expect(failures.every(url => url === 'http://supabase.test/auth/v1/health')).toBe(true)
  expect(consoleErrors.every(message => message.includes('ERR_NAME_NOT_RESOLVED') || message.includes('400 (Bad Request)'))).toBe(true)
})
