# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workflow-v2.spec.ts >> both samples below 80% require an expert grade before printing
- Location: tests\workflow-v2.spec.ts:46:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Capture tail cut' })

```

# Page snapshot

```yaml
- generic [ref=f1e3]:
  - complementary "Presentation controls" [ref=f1e4]:
    - button "Open presentation controls" [ref=f1e5] [cursor=pointer]
  - main [ref=f1e6]:
    - generic [ref=f1e7]:
      - generic [ref=f1e8]:
        - generic [ref=f1e9]: Choose your workspace
        - heading "Who's grading?" [level=1] [ref=f1e10]
        - paragraph [ref=f1e11]: Sashibo core is graded first. A tail cut is requested only when that result is under 80%, and the receipt prints as soon as the grade is final.
      - generic [ref=f1e12]:
        - button "Station control Admin Open admin console" [ref=f1e13] [cursor=pointer]:
          - generic [ref=f1e14]: Station control
          - strong [ref=f1e26]: Admin
          - generic [ref=f1e27]: Open admin console
        - button "Expert workflow Expert Grader Start grading" [ref=f1e30] [cursor=pointer]:
          - generic [ref=f1e31]: Expert workflow
          - strong [ref=f1e41]: Expert Grader
          - generic [ref=f1e42]: Start grading
      - button "Back" [ref=f1e47] [cursor=pointer]
  - dialog [ref=f1e50]:
    - generic [ref=f1e51]:
      - generic [ref=f1e59]:
        - heading "Session wasn't saved" [level=2] [ref=f1e60]
        - paragraph [ref=f1e61]: Your unfinished grading session was cleared when TunaEye refreshed. Completed records on this device were kept. Choose a role to start again.
      - button "Choose a role" [active] [ref=f1e63] [cursor=pointer]
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test'
  2  | 
  3  | test.beforeEach(async ({ page }) => {
  4  |   await page.addInitScript(() => localStorage.setItem('tunaeye-installed', 'true'))
  5  |   await page.route('http://10.42.0.1:8080/**', route => route.fulfill({ contentType: 'image/jpeg', body: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) }))
  6  | })
  7  | 
  8  | function gradeBody(id: string, imageType: string, grade: string, confidence: number) {
  9  |   const scores = { GRADE_A: 0.02, GRADE_B: 0.03, GRADE_C: 0.04, INVALID: 0.01, [grade]: confidence }
  10 |   return JSON.stringify({ id, capture_id: `${id}-capture`, image_type: imageType, grade, confidence, scores })
  11 | }
  12 | 
  13 | test('sashibo confidence at 80% or above goes straight to the receipt', async ({ page }) => {
  14 |   await page.route('http://10.42.0.1:5000/grade', route => route.fulfill({ contentType: 'application/json', body: gradeBody('high', 'sashibocore', 'GRADE_A', 0.91) }))
  15 |   await page.goto('/kiosk/camera')
  16 |   await page.getByRole('button', { name: 'Capture', exact: true }).click()
  17 |   await expect(page.getByRole('heading', { name: 'Sashibo core · Grade A' })).toBeVisible()
  18 |   await expect(page.getByText(/above 80%/)).toBeVisible()
  19 |   await expect(page.getByRole('button', { name: 'Capture tail cut' })).toHaveCount(0)
  20 |   await page.getByRole('button', { name: 'Print receipt' }).click()
  21 |   await expect(page.getByRole('heading', { name: 'Print the receipt.' })).toBeVisible()
  22 |   await expect(page.locator('.grade-letter--print')).toHaveText('A')
  23 | })
  24 | 
  25 | test('sashibo below 80% asks for a tail cut and blends the two results', async ({ page }) => {
  26 |   let calls = 0
  27 |   await page.route('http://10.42.0.1:5000/grade', route => {
  28 |     calls += 1
  29 |     const tail = calls > 1
  30 |     return route.fulfill({ contentType: 'application/json', body: gradeBody(tail ? 'tail' : 'core', tail ? 'tailcut' : 'sashibocore', tail ? 'GRADE_B' : 'GRADE_C', tail ? 0.91 : 0.74) })
  31 |   })
  32 |   await page.goto('/kiosk/camera')
  33 |   await page.getByRole('button', { name: 'Capture', exact: true }).click()
  34 |   await expect(page.getByRole('heading', { name: 'Tail cut needed' })).toBeVisible()
  35 |   await page.getByRole('button', { name: 'Capture tail cut' }).click()
  36 |   await expect(page.getByText('Supplementary sample')).toBeVisible()
  37 |   await page.getByRole('button', { name: 'Capture', exact: true }).click()
  38 |   await expect(page.getByRole('heading', { name: 'Final grade B' })).toBeVisible()
  39 |   await expect(page.getByText('Sashibo core', { exact: true }).first()).toBeVisible()
  40 |   await expect(page.getByText('74%', { exact: true })).toBeVisible()
  41 |   await expect(page.getByText('91%', { exact: true })).toBeVisible()
  42 |   await page.getByRole('button', { name: 'Print receipt' }).click()
  43 |   await expect(page.getByRole('heading', { name: 'Print the receipt.' })).toBeVisible()
  44 | })
  45 | 
  46 | test('both samples below 80% require an expert grade before printing', async ({ page }) => {
  47 |   let calls = 0
  48 |   await page.route('http://10.42.0.1:5000/grade', route => {
  49 |     calls += 1
  50 |     const tail = calls > 1
  51 |     return route.fulfill({ contentType: 'application/json', body: gradeBody(tail ? 'tail-low' : 'core-low', tail ? 'tailcut' : 'sashibocore', tail ? 'GRADE_C' : 'GRADE_B', tail ? 0.66 : 0.68) })
  52 |   })
  53 |   await page.goto('/kiosk/camera')
  54 |   await page.getByRole('button', { name: 'Capture', exact: true }).click()
> 55 |   await page.getByRole('button', { name: 'Capture tail cut' }).click()
     |                                                                ^ Error: locator.click: Test timeout of 30000ms exceeded.
  56 |   await page.getByRole('button', { name: 'Capture', exact: true }).click()
  57 |   await expect(page.getByRole('heading', { name: 'Expert grade required' })).toBeVisible()
  58 |   await page.getByRole('button', { name: 'Set final grade' }).click()
  59 |   const dialog = page.getByRole('dialog', { name: 'Manual override' })
  60 |   for (const digit of ['1', '2', '3', '4']) await dialog.getByRole('button', { name: digit, exact: true }).click()
  61 |   await dialog.getByRole('button', { name: 'Unlock override' }).click()
  62 |   await dialog.getByRole('button', { name: 'Grade A', exact: true }).click()
  63 |   await dialog.getByRole('button', { name: 'Save override' }).click()
  64 |   await expect(page.getByRole('heading', { name: 'Print the receipt.' })).toBeVisible()
  65 |   await expect(page.locator('.grade-letter--print')).toHaveText('A')
  66 | })
  67 | 
```