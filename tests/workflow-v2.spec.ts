import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('tunaeye-installed', 'true'))
  await page.route('http://10.42.0.1:8080/**', route => route.fulfill({ contentType: 'image/jpeg', body: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) }))
})

function gradeBody(id: string, imageType: string, grade: string, confidence: number) {
  const scores = { GRADE_A: 0.02, GRADE_B: 0.03, GRADE_C: 0.04, INVALID: 0.01, [grade]: confidence }
  return JSON.stringify({ id, capture_id: `${id}-capture`, image_type: imageType, grade, confidence, scores })
}

test('sashibo confidence at 80% or above goes straight to the receipt', async ({ page }) => {
  await page.route('http://10.42.0.1:5000/grade', route => route.fulfill({ contentType: 'application/json', body: gradeBody('high', 'sashibocore', 'GRADE_A', 0.91) }))
  await page.goto('/kiosk/camera')
  await page.getByRole('button', { name: 'Capture', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Sashibo core · Grade A' })).toBeVisible()
  await expect(page.getByText(/above 80%/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Capture tail cut' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Print receipt' }).click()
  await expect(page.getByRole('heading', { name: 'Print the receipt.' })).toBeVisible()
  await expect(page.locator('.grade-letter--print')).toHaveText('A')
})

test('sashibo below 80% asks for a tail cut and blends the two results', async ({ page }) => {
  let calls = 0
  await page.route('http://10.42.0.1:5000/grade', route => {
    calls += 1
    const tail = calls > 1
    return route.fulfill({ contentType: 'application/json', body: gradeBody(tail ? 'tail' : 'core', tail ? 'tailcut' : 'sashibocore', tail ? 'GRADE_B' : 'GRADE_C', tail ? 0.91 : 0.74) })
  })
  await page.goto('/kiosk/camera')
  await page.getByRole('button', { name: 'Capture', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Tail cut needed' })).toBeVisible()
  await page.getByRole('button', { name: 'Capture tail cut' }).click()
  await expect(page.getByText('Supplementary sample')).toBeVisible()
  await page.getByRole('button', { name: 'Capture', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Final grade B' })).toBeVisible()
  await expect(page.getByText('Sashibo core', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('74%', { exact: true })).toBeVisible()
  await expect(page.getByText('91%', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Print receipt' }).click()
  await expect(page.getByRole('heading', { name: 'Print the receipt.' })).toBeVisible()
})

test('both samples below 80% require an expert grade before printing', async ({ page }) => {
  let calls = 0
  await page.route('http://10.42.0.1:5000/grade', route => {
    calls += 1
    const tail = calls > 1
    return route.fulfill({ contentType: 'application/json', body: gradeBody(tail ? 'tail-low' : 'core-low', tail ? 'tailcut' : 'sashibocore', tail ? 'GRADE_C' : 'GRADE_B', tail ? 0.66 : 0.68) })
  })
  await page.goto('/kiosk/camera')
  await page.getByRole('button', { name: 'Capture', exact: true }).click()
  await page.getByRole('button', { name: 'Capture tail cut' }).click()
  await page.getByRole('button', { name: 'Capture', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Expert grade required' })).toBeVisible()
  await page.getByRole('button', { name: 'Set final grade' }).click()
  const dialog = page.getByRole('dialog', { name: 'Manual override' })
  for (const digit of ['1', '2', '3', '4']) await dialog.getByRole('button', { name: digit, exact: true }).click()
  await dialog.getByRole('button', { name: 'Unlock override' }).click()
  await dialog.getByRole('button', { name: 'Grade A', exact: true }).click()
  await dialog.getByRole('button', { name: 'Save override' }).click()
  await expect(page.getByRole('heading', { name: 'Print the receipt.' })).toBeVisible()
  await expect(page.locator('.grade-letter--print')).toHaveText('A')
})
