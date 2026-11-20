# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: kiosk.spec.ts >> grader workflow has a small history shortcut
- Location: tests\kiosk.spec.ts:225:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /Grader/ })

```

# Page snapshot

```yaml
- iframe [ref=e2]:
  - generic [ref=f1e1]:
    - navigation "Main" [ref=f1e2]:
      - button [ref=f1e3] [cursor=pointer]:
        - generic [ref=f1e7]:
          - text: Tuna
          - emphasis [ref=f1e8]: Eye
      - generic [ref=f1e9]:
        - button "Home" [ref=f1e10] [cursor=pointer]
        - button "Features" [ref=f1e11] [cursor=pointer]
        - generic [ref=f1e12]:
          - button "About TunaEye ▾" [ref=f1e13] [cursor=pointer]
          - generic:
            - button "About TunaEye"
            - button "Documentation"
            - button "Terms & Conditions"
            - button "Privacy Policy"
        - button "Team" [ref=f1e14] [cursor=pointer]
        - button "FAQ" [ref=f1e15] [cursor=pointer]
      - button "Install kiosk app" [ref=f1e16] [cursor=pointer]
    - main [ref=f1e17]:
      - generic [ref=f1e18]:
        - generic [ref=f1e19]:
          - generic [ref=f1e20]:
            - generic [ref=f1e21]: Expert grading, extended
            - heading "Sea Beyond the Cut." [level=1] [ref=f1e23]:
              - generic [ref=f1e24]: Sea
              - generic [ref=f1e26]:
                - generic [ref=f1e27]: Beyond
                - generic [ref=f1e28]: the Cut.
            - paragraph [ref=f1e29]: We don’t replace the expert eye. We extend its reach.
            - paragraph [ref=f1e30]: Built on expert knowledge. Enhanced by computer vision.
            - generic [ref=f1e31]:
              - button "Start Grading" [ref=f1e32] [cursor=pointer]
              - button "Station Specs" [ref=f1e33] [cursor=pointer]
          - generic [ref=f1e34]:
            - img "TunaEye kiosk running on a tablet" [ref=f1e36]
            - generic [ref=f1e37]:
              - generic [ref=f1e38]: 01 · Weigh the fish
              - generic [ref=f1e40]:
                - spinbutton "Fish weight in kilograms" [ref=f1e41]: "85"
                - generic [ref=f1e42]: kg
              - group "Grade" [ref=f1e43]:
                - button "A" [ref=f1e45] [cursor=pointer]
                - button "B" [ref=f1e46] [cursor=pointer]
                - button "C" [ref=f1e47] [cursor=pointer]
              - generic [ref=f1e48]: Total value
              - generic [ref=f1e49]: ₱35,700
              - generic [ref=f1e50]: 85 kg × ₱420 · Premium
        - generic [ref=f1e51]:
          - generic [ref=f1e52]:
            - generic [ref=f1e53]: "01."
            - text: Weigh the fish
          - generic [ref=f1e54]:
            - generic [ref=f1e55]: "02."
            - text: Grade sashibo core
          - generic [ref=f1e56]:
            - generic [ref=f1e57]: "03."
            - text: Tail cut only under 80%
          - generic [ref=f1e58]:
            - generic [ref=f1e59]: "04."
            - text: Print one receipt
      - generic [ref=f1e61]:
        - generic [ref=f1e62]:
          - generic [ref=f1e63]: See TunaEye in Action
          - heading "From cut to grade in one pass" [level=2] [ref=f1e64]
          - paragraph [ref=f1e65]: Watch experts’ visual traits become a guided capture, CNN assist, and reviewable record.
          - button "View Demo" [ref=f1e67] [cursor=pointer]
        - img "TunaEye workflow demo on a MacBook Pro" [ref=f1e69]:
          - generic [ref=f1e70]:
            - generic [ref=f1e72]:
              - generic [ref=f1e73]: 02 · Put your sample in
              - generic [ref=f1e74]: Station 01
            - button "View TunaEye demo" [ref=f1e78] [cursor=pointer]
            - generic [ref=f1e81]: Open interactive demo
      - generic [ref=f1e84]:
        - generic [ref=f1e87]:
          - generic "TunaEye mobile app screen preview" [ref=f1e88]:
            - generic [ref=f1e89]:
              - img "TunaEye app screen 1" [ref=f1e90]
              - img "TunaEye app screen 2" [ref=f1e91]
              - img "TunaEye app screen 3" [ref=f1e92]
              - img "TunaEye app screen 4" [ref=f1e93]
              - img "TunaEye app screen 5" [ref=f1e94]
          - generic [ref=f1e95]:
            - text: Scan to install
            - img "QR code to install the TunaEye mobile app" [ref=f1e96]
            - text: Point your camera at the code
        - generic [ref=f1e98]:
          - generic [ref=f1e99]: Getting Started
          - heading "Install the station app. Keep the expert in charge." [level=2] [ref=f1e100]
          - paragraph [ref=f1e101]: Scan the QR, install the PWA, connect the Pi, then grade. Offline capture still works.
          - generic [ref=f1e102]:
            - generic [ref=f1e103]:
              - generic [ref=f1e104]: "1"
              - generic [ref=f1e105]:
                - strong [ref=f1e106]: Install
                - paragraph [ref=f1e107]: Scan the QR or open TunaEye in Chrome, Safari, or Edge, then choose Install App.
            - generic [ref=f1e108]:
              - generic [ref=f1e109]: "2"
              - generic [ref=f1e110]:
                - strong [ref=f1e111]: Launch
                - paragraph [ref=f1e112]: Open the home-screen icon for the standalone kiosk.
            - generic [ref=f1e113]:
              - generic [ref=f1e114]: "3"
              - generic [ref=f1e115]:
                - strong [ref=f1e116]: Connect the Pi
                - paragraph [ref=f1e117]: Link the station to the local edge CNN for on-LAN inference.
            - generic [ref=f1e118]:
              - generic [ref=f1e119]: "4"
              - generic [ref=f1e120]:
                - strong [ref=f1e121]: Grade
                - paragraph [ref=f1e122]: Name, cut type, capture — then review the assist before you accept.
      - generic [ref=f1e124]:
        - generic [ref=f1e125]:
          - generic [ref=f1e126]: Why TunaEye Matters
          - heading "Close the gap. Do not replace the grader." [level=2] [ref=f1e127]
          - img "An eye whose pupil holds a tuna, scanned by a line" [ref=f1e128]
        - generic [ref=f1e139]:
          - paragraph [ref=f1e140]: TunaEye is a CNN trained on expert-annotated sashibo core and tail-cut images. It mirrors the traits graders already look for so the assist is familiar, not foreign.
          - paragraph [ref=f1e141]: Standardized capture and transfer learning make quality assessment more consistent and accessible. The expert still decides.
          - button "Read our engineering approach →" [ref=f1e142] [cursor=pointer]
      - generic [ref=f1e144]:
        - generic [ref=f1e145]:
          - generic [ref=f1e146]: Station Architecture
          - heading "Rugged hardware engineered for the port floor." [level=2] [ref=f1e147]
          - paragraph [ref=f1e148]: TunaEye connects off-the-shelf industrial components into a seamless, splash-resistant grading station.
        - generic [ref=f1e149]:
          - generic [ref=f1e150]:
            - heading "Raspberry Pi Edge Server" [level=3] [ref=f1e156]
            - generic [ref=f1e157]:
              - generic [ref=f1e158]: <200ms
              - generic [ref=f1e159]: LAN only
              - generic [ref=f1e160]: Offline AI
          - generic [ref=f1e161]:
            - heading "5000K CRI 98+ Diffuse Chamber" [level=3] [ref=f1e166]
            - generic [ref=f1e167]:
              - generic [ref=f1e168]: Daylight
              - generic [ref=f1e169]: Anti-glare
              - generic [ref=f1e170]: Calibrated
          - generic [ref=f1e171]:
            - heading "10.1″ IP65 Touch Tablet" [level=3] [ref=f1e175]
            - generic [ref=f1e176]:
              - generic [ref=f1e177]: Splash-safe
              - generic [ref=f1e178]: PWA
              - generic [ref=f1e179]: Offline
          - generic [ref=f1e180]:
            - heading "Scale & Thermal Printer" [level=3] [ref=f1e184]
            - generic [ref=f1e185]:
              - generic [ref=f1e186]: 200kg max
              - generic [ref=f1e187]: 80mm
              - generic [ref=f1e188]: QR code
        - 'img "Illustration of the TunaEye grading station: scale, light chamber with camera, Raspberry Pi, tablet, thermal printer and cloud" [ref=f1e191]':
          - generic [ref=f1e193]: 42.6 kg
          - generic [ref=f1e218]:
            - generic [ref=f1e221]: A
            - generic [ref=f1e222]: Export sashimi grade
          - generic [ref=f1e242]:
            - generic [ref=f1e243]: Scale · up to 200kg
            - generic [ref=f1e244]: Light chamber · 5000K CRI 98+
            - generic [ref=f1e245]: Touch tablet · IP65
            - generic [ref=f1e246]: 80mm printer
            - generic [ref=f1e247]: Raspberry Pi
            - generic [ref=f1e248]: Cloud sync
      - generic [ref=f1e250]:
        - generic [ref=f1e251]:
          - generic [ref=f1e252]: Anatomical Grading Criteria
          - heading "Standardized quality metrics for Sashibo & Tail Cut samples." [level=2] [ref=f1e253]
          - paragraph [ref=f1e254]: TunaEye evaluates the primary anatomical sample cuts used in commercial yellowfin sashimi grading.
          - tablist [ref=f1e255]:
            - tab "Sashibo Core Sample Analysis" [selected] [ref=f1e256] [cursor=pointer]
            - tab "Tail Cut Cross-Section Analysis" [ref=f1e257] [cursor=pointer]
        - generic [ref=f1e258]:
          - generic [ref=f1e259]:
            - heading "Sashibo Core Evaluation Metrics" [level=3] [ref=f1e260]
            - paragraph [ref=f1e261]: Extracted using a specialized sashibo probe from the core flesh near the dorsal fin, this sample provides a direct look into internal muscle quality.
            - generic [ref=f1e262]:
              - term [ref=f1e263]: Flesh Translucency & Oil Content
              - definition [ref=f1e264]: Measures light transmission and lipid dispersion across the core specimen, indicating high fat content prized in Grade A sashimi.
              - term [ref=f1e265]: Myoglobin Color Saturation
              - definition [ref=f1e266]: Detects deep cherry-red hue versus brown oxidation or darkening caused by post-capture stress or thermal spike.
              - term [ref=f1e267]: Core Structural Integrity
              - definition [ref=f1e268]: Ensures the core sample retains firmness without gaping, mushiness, or parasitic muscle breakdown.
          - generic [ref=f1e269]:
            - img "Sashibo core sample breakdown" [ref=f1e270]
            - generic [ref=f1e271]: Center-Cut Core Evidence
        - generic [ref=f1e272]:
          - generic [ref=f1e273]:
            - generic [ref=f1e274]: Grade A
            - heading "Export Sashimi Grade" [level=3] [ref=f1e275]
            - paragraph [ref=f1e276]: Deep translucent red, high fat content, zero oxidation, firm core texture. Highest commercial value.
          - generic [ref=f1e277]:
            - generic [ref=f1e278]: Grade B+
            - heading "Premium Fresh Grade" [level=3] [ref=f1e279]
            - paragraph [ref=f1e280]: Strong red color saturation, slight fat dispersion, firm muscle grain. Excellent fresh market suitability.
          - generic [ref=f1e281]:
            - generic [ref=f1e282]: Grade B
            - heading "Standard Fresh Grade" [level=3] [ref=f1e283]
            - paragraph [ref=f1e284]: Moderate red color, minor surface oxidation acceptable, suitable for domestic retail and grilling.
          - generic [ref=f1e285]:
            - generic [ref=f1e286]: Grade C
            - heading "Processing / Canning Grade" [level=3] [ref=f1e287]
            - paragraph [ref=f1e288]: Dark/brown oxidation, soft texture or high drip loss. Allocated for cooked processing or canning.
      - generic [ref=f1e290]:
        - generic [ref=f1e291]:
          - generic [ref=f1e292]: Station Workflow
          - heading "Six steps. One traceable record." [level=2] [ref=f1e293]
        - generic [ref=f1e294]:
          - generic [ref=f1e295]:
            - text: "01"
            - generic [ref=f1e300]: Grader Auth
          - generic [ref=f1e303]:
            - text: "02"
            - generic [ref=f1e309]: Select Cut
          - generic [ref=f1e312]:
            - text: "03"
            - generic [ref=f1e316]: Weigh Fish
          - generic [ref=f1e319]:
            - text: "04"
            - generic [ref=f1e324]: Capture
          - generic [ref=f1e327]:
            - text: "05"
            - generic [ref=f1e333]: Edge AI
          - generic [ref=f1e336]:
            - text: "06"
            - generic [ref=f1e341]: Print & Sync
      - generic [ref=f1e345]:
        - generic [ref=f1e346]:
          - generic [ref=f1e347]: Traceable Evidence
          - heading "Sashibo Core Sample" [level=3] [ref=f1e348]
          - paragraph [ref=f1e349]: Center-cut core sample providing evidence of translucency, fat/oil distribution, core structural integrity, and myoglobin oxidation.
          - generic [ref=f1e350]:
            - button "Previous sample" [ref=f1e351] [cursor=pointer]: ←
            - button "Next sample" [ref=f1e352] [cursor=pointer]: →
            - generic [ref=f1e353]: 1 / 2
        - generic [ref=f1e354]: Captured sample evidence
      - generic [ref=f1e357]:
        - generic [ref=f1e358]:
          - generic [ref=f1e359]: "0"
          - text: Edge inference speed
        - generic [ref=f1e360]:
          - generic [ref=f1e361]: "0"
          - text: Maximum fish weight cap
        - generic [ref=f1e362]:
          - generic [ref=f1e363]: 1:1
          - text: Fish-to-evidence traceability
        - generic [ref=f1e364]:
          - generic [ref=f1e365]: "0"
          - text: Offline kiosk availability
      - generic [ref=f1e367]:
        - generic [ref=f1e368]:
          - generic [ref=f1e369]: Resilient Infrastructure
          - heading "Local edge speed. Cloud transparency." [level=2] [ref=f1e370]
          - paragraph [ref=f1e371]: The kiosk tablet handles operator interactions and offline IndexedDB queueing. The Raspberry Pi performs zero-latency AI inference on station LAN. Supabase PostgreSQL serves as the durable system of record, while Convex broadcasts live updates across all admin consoles.
          - button "Explore full feature breakdown →" [ref=f1e372] [cursor=pointer]
        - generic [ref=f1e374]:
          - generic [ref=f1e375]:
            - text: "01"
            - heading "Tablet Kiosk" [level=4] [ref=f1e379]
            - paragraph [ref=f1e380]: Capture, weigh & review
          - generic [ref=f1e382]:
            - text: "02"
            - heading "Raspberry Pi" [level=4] [ref=f1e388]
            - paragraph [ref=f1e389]: Edge AI model inference
          - generic [ref=f1e391]:
            - text: "03"
            - heading "Supabase + Convex" [level=4] [ref=f1e395]
            - paragraph [ref=f1e396]: Durable records & live sync
      - generic [ref=f1e398]:
        - generic [ref=f1e399]:
          - generic [ref=f1e400]: Deployment FAQ
          - heading "Frequently asked questions before deployment." [level=2] [ref=f1e401]
        - group [ref=f1e402]:
          - generic "Who uses the TunaEye station? +" [ref=f1e403] [cursor=pointer]
          - paragraph [ref=f1e404]: Fish ports, buying stations, commercial seafood processors, trained quality graders, and export inspection officers.
        - group [ref=f1e405]:
          - generic "Does the kiosk work during internet outages? +" [ref=f1e406] [cursor=pointer]
        - group [ref=f1e407]:
          - generic "How are expert overrides handled and audited? +" [ref=f1e408] [cursor=pointer]
        - group [ref=f1e409]:
          - generic "Which cameras and scales are supported? +" [ref=f1e410] [cursor=pointer]
        - button "View all questions & answers →" [ref=f1e411] [cursor=pointer]
      - generic [ref=f1e414]:
        - generic [ref=f1e415]: Ready for the Grading Floor?
        - heading "Turn every yellowfin tuna sample into clear, connected evidence." [level=2] [ref=f1e416]
        - paragraph [ref=f1e417]: Start grading now or explore the full platform capabilities in your browser.
        - generic [ref=f1e418]:
          - button "Start Grading" [ref=f1e419] [cursor=pointer]
          - button "Explore Features" [ref=f1e420] [cursor=pointer]
    - contentinfo [ref=f1e421]:
      - generic [ref=f1e422]:
        - generic [ref=f1e423]:
          - text: TunaEye
          - paragraph [ref=f1e424]: We extend the expert eye.
          - paragraph [ref=f1e425]: CNN assist for sashibo and tail-cut yellowfin grading.
          - generic [ref=f1e426]:
            - generic [ref=f1e427]: X
            - generic [ref=f1e428]: in
            - generic [ref=f1e429]: f
            - generic [ref=f1e430]: ◎
        - generic [ref=f1e431]:
          - heading "Product" [level=4] [ref=f1e432]
          - button "Features" [ref=f1e433] [cursor=pointer]
          - button "Workflow" [ref=f1e434] [cursor=pointer]
          - button "Install app" [ref=f1e435] [cursor=pointer]
        - generic [ref=f1e436]:
          - heading "Resources" [level=4] [ref=f1e437]
          - button "Help" [ref=f1e438] [cursor=pointer]
          - button "FAQ" [ref=f1e439] [cursor=pointer]
          - button "Changelog" [ref=f1e440] [cursor=pointer]
        - generic [ref=f1e441]:
          - heading "Company" [level=4] [ref=f1e442]
          - button "About" [ref=f1e443] [cursor=pointer]
          - button "Team" [ref=f1e444] [cursor=pointer]
          - link "Contact" [ref=f1e445] [cursor=pointer]:
            - /url: mailto:hello@tunaeye.app
        - generic [ref=f1e446]:
          - heading "Legal" [level=4] [ref=f1e447]
          - button "Terms" [ref=f1e448] [cursor=pointer]
          - button "Privacy" [ref=f1e449] [cursor=pointer]
          - generic [ref=f1e450] [cursor=pointer]: General Santos City
      - generic [ref=f1e451]:
        - generic [ref=f1e452]: Email address
        - textbox "Email address" [ref=f1e453]:
          - /placeholder: Enter your email
        - button "Submit" [ref=f1e454] [cursor=pointer]
      - generic [aria-hidden] [ref=f1e455]: TunaEye
      - generic [ref=f1e459]: © 2026 TunaEye Systems. All rights reserved.
    - button "v2.7.0 What’s new ✨" [ref=f1e461] [cursor=pointer]:
      - generic [ref=f1e462]: v2.7.0
      - text: What’s new ✨
```

# Test source

```ts
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
  208 |   await expect(page.getByRole('heading', { name: /Fish weight/i })).toBeVisible({ timeout: 5000 })
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
> 228 |   await page.getByRole('button', { name: /Grader/ }).click()
      |                                                      ^ Error: locator.click: Test timeout of 30000ms exceeded.
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
  309 |       const [contentBox, actionsBox] = await Promise.all([content.boundingBox(), actions.boundingBox()])
  310 |       expect(contentBox!.y + contentBox!.height, `${route} content overlaps actions`).toBeLessThanOrEqual(actionsBox!.y + 1)
  311 |       expect(actionsBox!.y + actionsBox!.height, `${route} actions leave viewport`).toBeLessThanOrEqual(viewport.height)
  312 |       expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route} overflows horizontally`).toBe(true)
  313 |     }
  314 |   })
  315 | }
  316 | 
  317 | test('legal dialogs share safe tablet sizing and visible actions', async ({ page }) => {
  318 |   await page.setViewportSize({ width: 1024, height: 600 })
  319 |   await page.addInitScript(() => localStorage.setItem('tunaeye-installed', 'true'))
  320 |   await page.goto('/kiosk/grader')
  321 |   for (const name of ['Terms and Conditions', 'Privacy Policy']) {
  322 |     await page.getByRole('button', { name }).click()
  323 |     const dialog = page.getByRole('dialog')
  324 |     await expect(dialog).toBeVisible()
  325 |     const box = await dialog.locator('.legal-modal').boundingBox()
  326 |     expect(box!.x).toBeGreaterThanOrEqual(16)
  327 |     expect(box!.y).toBeGreaterThanOrEqual(16)
  328 |     expect(box!.x + box!.width).toBeLessThanOrEqual(1008)
```