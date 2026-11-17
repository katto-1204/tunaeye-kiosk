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
- generic [ref=e3]:
  - complementary "Presentation controls" [ref=e4]:
    - button "Open presentation controls" [ref=e5] [cursor=pointer]
  - main [ref=e6]:
    - generic [ref=e7]:
      - generic [ref=e8]:
        - generic [ref=e9]:
          - generic "Grading steps" [ref=e10]:
            - generic [ref=e11]: Weight
            - generic [ref=e14]: Sashibo
            - generic [ref=e17]: Tail if needed
            - generic [ref=e20]: 4 Print
          - generic [ref=e21]: Sashibo core accepted
          - generic [ref=e22]: A
          - heading "Sashibo core · Grade A" [level=1] [ref=e23]
          - paragraph [ref=e24]: Sashibo core is 96.3% confident, above 80%. This grade is final. A tail cut is not needed.
          - paragraph [ref=e25]: "Next: print one receipt for this fish."
          - generic [ref=e28]:
            - generic [ref=e29]: Sashibo core
            - strong [ref=e30]: 96.3%
          - generic [ref=e33]:
            - text: Fish value
            - strong [ref=e34]: —
            - generic [ref=e35]: — kg · ₱420.00/kg
        - generic [ref=e36]:
          - img "Captured Sashibo core" [ref=e37]
          - generic [ref=e38]:
            - generic [ref=e39]: Fish 1
            - generic [ref=e40]: — kg
          - button "Manual override" [ref=e41] [cursor=pointer]
          - button "Retake sashibo core" [ref=e45] [cursor=pointer]
      - generic [ref=e51]:
        - button "Back" [ref=e53] [cursor=pointer]
        - button "Print receipt" [ref=e57] [cursor=pointer]
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