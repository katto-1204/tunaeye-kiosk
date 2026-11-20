# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workflow-v2.spec.ts >> sashibo confidence at 80% or above goes straight to the receipt
- Location: tests\workflow-v2.spec.ts:13:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Capture', exact: true })

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
> 16 |   await page.getByRole('button', { name: 'Capture', exact: true }).click()
     |                                                                    ^ Error: locator.click: Test timeout of 30000ms exceeded.
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
  55 |   await page.getByRole('button', { name: 'Capture tail cut' }).click()
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