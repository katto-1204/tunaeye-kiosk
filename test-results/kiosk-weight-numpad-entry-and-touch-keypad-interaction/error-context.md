# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: kiosk.spec.ts >> weight numpad entry and touch keypad interaction
- Location: tests\kiosk.spec.ts:205:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: /Fish weight/i })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('heading', { name: /Fish weight/i }) with timeout 5000ms
  - waiting for getByRole('heading', { name: /Fish weight/i })

```

```yaml
- iframe
```

# Test source

```ts
  108 |   await page.addInitScript(() => localStorage.setItem('tunaeye-installed', 'true'))
  109 |   await page.goto('/')
  110 |   const enter = page.getByRole('button', { name: 'Enter fullscreen' })
  111 |   await expect(enter).toBeVisible()
  112 |   await page.evaluate(() => {
  113 |     HTMLElement.prototype.requestFullscreen = async function (options?: FullscreenOptions) {
  114 |       ;(window as Window & { __fullscreenOptions?: FullscreenOptions }).__fullscreenOptions = options
  115 |       Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => this })
  116 |       document.dispatchEvent(new Event('fullscreenchange'))
  117 |     }
  118 |   })
  119 |   await enter.click()
  120 |   await expect.poll(() => page.evaluate(() => (window as Window & { __fullscreenOptions?: FullscreenOptions }).__fullscreenOptions)).toEqual({ navigationUI: 'hide' })
  121 |   await expect(page.getByRole('button', { name: 'Exit fullscreen' })).toBeVisible()
  122 | })
  123 | 
  124 | test('role selector uses distinct role icons, focus states, and destinations', async ({ page }) => {
  125 |   await page.setViewportSize({ width: 1024, height: 600 })
  126 |   await page.addInitScript(() => localStorage.setItem('tunaeye-installed', 'true'))
  127 |   await page.goto('/select-role')
  128 |   const admin = page.getByRole('button', { name: /Admin/ })
  129 |   const grader = page.getByRole('button', { name: /Expert Grader/ })
  130 |   await expect(admin).toBeVisible()
  131 |   await expect(grader).toBeVisible()
  132 |   expect(await admin.locator('.role-card-v2__icon').innerHTML()).not.toBe(await grader.locator('.role-card-v2__icon').innerHTML())
  133 |   await admin.focus()
  134 |   await expect(admin).toBeFocused()
  135 |   expect(await grader.evaluate(element => getComputedStyle(element).backgroundImage)).toContain('linear-gradient')
  136 |   await page.screenshot({ path: 'test-results/role-selector-1024x600.png' })
  137 |   await grader.click()
  138 |   await expect(page).toHaveURL(/\/kiosk\/grader$/)
  139 |   await page.goto('/select-role')
  140 |   await page.getByRole('button', { name: /Admin/ }).click()
  141 |   await expect(page).toHaveURL(/\/admin$/)
  142 | })
  143 | 
  144 | test('admin OTP opens diagnostics, audit logs, and logout', async ({ page }) => {
  145 |   await page.addInitScript(() => localStorage.setItem('tunaeye-installed', 'true'))
  146 |   await page.goto('/')
  147 |   await page.getByRole('button', { name: 'Get started' }).click()
  148 |   await page.getByRole('button', { name: /Admin/ }).click()
  149 |   for (const [index, digit] of ['1', '2', '3', '4'].entries()) await page.getByLabel(`PIN digit ${index + 1}`).fill(digit)
  150 |   await page.getByRole('button', { name: 'Verify and continue' }).click()
  151 |   await expect(page.getByText('Good day, Admin.')).toBeVisible()
  152 |   await page.getByRole('button', { name: /Settings/ }).click()
  153 |   await expect(page.getByText('Raspberry Pi API URL')).toBeVisible()
  154 |   await expect(page.getByText('AI model identifier')).toBeVisible()
  155 |   await page.getByRole('button', { name: /Audit logs/ }).click()
  156 |   await expect(page.getByRole('heading', { name: 'Audit logs' }).first()).toBeVisible()
  157 |   await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible()
  158 | })
  159 | 
  160 | test('admin dashboard scrolls, graph interacts, and records paginate', async ({ page }) => {
  161 |   const browserErrors: string[] = []
  162 |   page.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()) })
  163 |   page.on('pageerror', error => browserErrors.push(error.message))
  164 |   await page.setViewportSize({ width: 1024, height: 600 })
  165 |   await page.addInitScript(() => {
  166 |     localStorage.setItem('tunaeye-installed', 'true')
  167 |     const now = Date.now()
  168 |     localStorage.setItem('tunaeye-records', JSON.stringify(Array.from({ length: 19 }, (_, index) => ({
  169 |       id: `TE-QA-${String(index + 1).padStart(3, '0')}`,
  170 |       sessionId: `QA-${index + 1}`,
  171 |       timestamp: now - (index % 7) * 86_400_000,
  172 |       time: 'Today, 10:00 AM',
  173 |       grader: index % 2 ? 'Maria Santos' : 'Jose Dela Cruz',
  174 |       sample: index % 2 ? 'Sashibo core' : 'Tail cut',
  175 |       fish: 'Fish 1', weight: `${20 + index} kg`, grade: index % 3 === 0 ? 'A' : 'B', status: 'Model result',
  176 |       transaction: { currency: 'PHP', amount: null, syncState: 'synced' },
  177 |     }))))
  178 |   })
  179 |   await page.goto('/')
  180 |   await page.getByRole('button', { name: 'Get started' }).click()
  181 |   await page.getByRole('button', { name: /Admin/ }).click()
  182 |   for (const [index, digit] of ['1', '2', '3', '4'].entries()) await page.getByLabel(`PIN digit ${index + 1}`).fill(digit)
  183 |   await page.getByRole('button', { name: 'Verify and continue' }).click()
  184 | 
  185 |   const adminContent = page.locator('.admin-content')
  186 |   await expect(page.getByTestId('admin-simple-graph')).toBeVisible()
  187 |   await page.getByRole('button', { name: /samples/ }).last().focus()
  188 |   await expect(page.locator('.admin-trend__tooltip')).toBeVisible()
  189 |   expect(await adminContent.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true)
  190 |   await page.screenshot({ path: 'test-results/admin-graph-1024x600.png', fullPage: false })
  191 | 
  192 |   await page.getByRole('button', { name: /Records/ }).click()
  193 |   await expect(page.getByText('Showing 1–8 of 19')).toBeVisible()
  194 |   await expect(page.getByRole('button', { name: 'Previous' })).toBeDisabled()
  195 |   await page.getByRole('button', { name: 'Next' }).click()
  196 |   await expect(page.getByText('Showing 9–16 of 19')).toBeVisible()
  197 |   await expect(page.getByText('TE-QA-009')).toBeVisible()
  198 |   await adminContent.evaluate(element => { element.scrollTop = element.scrollHeight })
  199 |   expect(await adminContent.evaluate(element => element.scrollTop)).toBeGreaterThan(0)
  200 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  201 |   expect(browserErrors).toEqual([])
  202 |   await page.screenshot({ path: 'test-results/admin-records-pagination-1024x600.png', fullPage: false })
  203 | })
  204 | 
  205 | test('weight numpad entry and touch keypad interaction', async ({ page }) => {
  206 |   await page.addInitScript(() => localStorage.setItem('tunaeye-installed', 'true'))
  207 |   await page.goto('/kiosk/weight')
> 208 |   await expect(page.getByRole('heading', { name: /Fish weight/i })).toBeVisible({ timeout: 5000 })
      |                                                                     ^ Error: expect(locator).toBeVisible() failed
  209 |   await expect(page.locator('.numpad-container')).toBeVisible()
  210 |   
  211 |   // Tap numpad buttons 3, 5, ., 4
  212 |   await page.getByRole('button', { name: '3', exact: true }).click()
  213 |   await page.getByRole('button', { name: '5', exact: true }).click()
  214 |   await page.getByRole('button', { name: '.', exact: true }).click()
  215 |   await page.getByRole('button', { name: '4', exact: true }).click()
  216 |   
  217 |   // Verify weight input has 35.4
  218 |   const input = page.locator('.weight-input input').first()
  219 |   await expect(input).toHaveValue('35.4')
  220 |   const inputBox = await input.boundingBox()
  221 |   const displayBox = await page.locator('.weight-input-display').first().boundingBox()
  222 |   expect(inputBox!.x - displayBox!.x).toBeLessThanOrEqual(32)
  223 | })
  224 | 
  225 | test('grader workflow has a small history shortcut', async ({ page }) => {
  226 |   await page.addInitScript(() => localStorage.setItem('tunaeye-installed', 'true'))
  227 |   await page.goto('/kiosk/select-role')
  228 |   await page.getByRole('button', { name: /Grader/ }).click()
  229 |   await page.getByLabel('Your name').fill('Maria Santos')
  230 |   await page.getByRole('button', { name: 'Start grading' }).click()
  231 |   const shortcut = page.getByRole('button', { name: 'View grading history' })
  232 |   await expect(shortcut).toBeVisible()
  233 |   expect((await shortcut.boundingBox())!.width).toBeLessThanOrEqual(44)
  234 |   await shortcut.click()
  235 |   await expect(page.getByRole('dialog', { name: 'Leave grading session?' })).toBeVisible()
  236 |   await expect(page.getByRole('dialog').getByText('Continue grading?')).toBeVisible()
  237 |   await page.getByRole('dialog').getByRole('button', { name: 'Leave session' }).click()
  238 |   await expect(page).toHaveURL(/\/kiosk\/grader-dashboard$/)
  239 |   await expect(page.getByRole('heading', { name: /Welcome back/ })).toBeVisible()
  240 | })
  241 | 
  242 | test('kiosk navbar is removed and contextual navigation remains', async ({ page }) => {
  243 |   await page.addInitScript(() => localStorage.setItem('tunaeye-installed', 'true'))
  244 |   await page.goto('/kiosk/select-role')
  245 |   await expect(page.getByRole('heading', { name: "Who's grading?" })).toBeVisible({ timeout: 5000 })
  246 |   await expect(page.locator('.topbar, .topbar-wrapper')).toHaveCount(0)
  247 |   await expect(page.getByRole('button', { name: 'Back' })).toBeVisible()
  248 |   expect((await page.locator('.app-main').boundingBox())!.y).toBe(0)
  249 | })
  250 | 
  251 | test('refresh clears unfinished session, preserves completed records, and returns to role selection', async ({ page }) => {
  252 |   await page.setViewportSize({ width: 1024, height: 600 })
  253 |   await page.addInitScript(() => {
  254 |     localStorage.setItem('tunaeye-installed', 'true')
  255 |     localStorage.setItem('tunaeye-records', JSON.stringify([{ id: 'saved-record', sessionId: 'saved-session', timestamp: Date.now(), time: 'Now', grader: 'Maria Santos', sample: 'Sashibo core', fish: 'Fish 1', weight: '42 kg', grade: 'A', status: 'Complete' }]))
  256 |   })
  257 |   await page.goto('/kiosk/weight')
  258 |   await expect(page.getByRole('heading', { name: /Fish weight/i })).toBeVisible()
  259 |   await page.reload()
  260 | 
  261 |   await expect(page).toHaveURL(/\/select-role$/)
  262 |   await expect(page.getByRole('heading', { name: "Who's grading?" })).toBeVisible({ timeout: 5000 })
  263 |   const dialog = page.getByRole('dialog', { name: "Session wasn't saved" })
  264 |   await expect(dialog).toBeVisible()
  265 |   await expect(dialog).toContainText('unfinished grading session was cleared')
  266 |   const modalBox = await dialog.locator('.modal-card--notice').boundingBox()
  267 |   expect(modalBox!.x).toBeGreaterThanOrEqual(16)
  268 |   expect(modalBox!.y).toBeGreaterThanOrEqual(16)
  269 |   expect(modalBox!.x + modalBox!.width).toBeLessThanOrEqual(1008)
  270 |   expect(modalBox!.y + modalBox!.height).toBeLessThanOrEqual(584)
  271 |   const action = dialog.getByRole('button', { name: 'Choose a role' })
  272 |   await expect(action).toBeFocused()
  273 |   await action.click()
  274 |   await expect(dialog).toHaveCount(0)
  275 |   expect(await page.evaluate(() => JSON.parse(localStorage.getItem('tunaeye-records') ?? '[]')[0]?.id)).toBe('saved-record')
  276 | })
  277 | 
  278 | test('refresh always returns to role selection but only unfinished work shows the warning', async ({ page }) => {
  279 |   await page.addInitScript(() => localStorage.setItem('tunaeye-installed', 'true'))
  280 |   await page.goto('/kiosk/complete')
  281 |   await page.reload()
  282 |   await expect(page).toHaveURL(/\/select-role$/)
  283 |   await expect(page.getByRole('heading', { name: "Who's grading?" })).toBeVisible({ timeout: 5000 })
  284 |   await expect(page.getByRole('dialog')).toHaveCount(0)
  285 | })
  286 | 
  287 | for (const viewport of [{ width: 1024, height: 600 }, { width: 800, height: 1280 }]) {
  288 |   test(`critical kiosk panels never overlap contextual actions at ${viewport.width}x${viewport.height}`, async ({ page }) => {
  289 |     await page.setViewportSize(viewport)
  290 |     await page.route('http://10.42.0.1:8080/**', route => route.fulfill({ contentType: 'image/jpeg', body: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) }))
  291 |     await page.addInitScript(() => localStorage.setItem('tunaeye-installed', 'true'))
  292 | 
  293 |     const cases = [
  294 |       ['/kiosk/sample', '.sample-options'],
  295 |       ['/kiosk/association', '.association-options, .single-fish-card'],
  296 |       ['/kiosk/tutorial', '.tutorial-stage'],
  297 |       ['/kiosk/weight', '.weight-split'],
  298 |       ['/kiosk/camera', '.camera-layout'],
  299 |       ['/kiosk/review', '.review-layout'],
  300 |       ['/kiosk/print', '.print-layout'],
  301 |     ] as const
  302 | 
  303 |     for (const [route, contentSelector] of cases) {
  304 |       await page.goto(route)
  305 |       const content = page.locator(contentSelector)
  306 |       const actions = page.locator('.screen-stack > .bottom-bar')
  307 |       await expect(content).toBeVisible()
  308 |       await expect(actions).toBeVisible()
```