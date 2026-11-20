# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: kiosk.spec.ts >> printing failure stays on receipt and offers retry
- Location: tests\kiosk.spec.ts:543:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Print receipt' })

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
  449 |   })
  450 |   expect(status).toMatchObject({ status: 'ok', models: { sashibocore: true, tailcut: true } })
  451 | 
  452 |   const cases = [
  453 |     ['GRADE_A', 'A', 'valid', 96.3],
  454 |     ['GRADE_B', 'B', 'valid', 91],
  455 |     ['GRADE_C', 'C', 'valid', 78],
  456 |     ['INVALID', null, 'invalid', 12],
  457 |   ] as const
  458 |   for (const [backendGrade, grade, outcome, confidence] of cases) {
  459 |     response = { id: `result-${backendGrade}`, capture_id: `capture-${backendGrade}`, image_type: 'sashibocore', grade: backendGrade, confidence: confidence / 100, scores: { GRADE_A: .01, GRADE_B: .02, GRADE_C: .03, INVALID: .94 } }
  460 |     await expect(callClient('Sashibo core')).resolves.toMatchObject({ grade, outcome, confidence, rawConfidence: confidence / 100, imageType: 'sashibocore', modelSource: 'raspberry-pi', scores: response.scores })
  461 |   }
  462 | 
  463 |   response = { ...response, id: 'tail-result', capture_id: 'tail-capture', image_type: 'tailcut', grade: 'GRADE_C', confidence: .78 }
  464 |   await expect(callClient('Tail cut')).resolves.toMatchObject({ grade: 'C', imageType: 'tailcut' })
  465 | 
  466 |   response = { ...response, scores: { GRADE_A: .1, GRADE_B: .2, GRADE_C: .7 } } as typeof response
  467 |   await expect(callClient('Tail cut')).rejects.toThrow('Inference failed: malformed prediction response.')
  468 | 
  469 |   gradeStatus = 503
  470 |   await expect(callClient('Tail cut')).rejects.toThrow('Inference failed: HTTP 503.')
  471 | 
  472 |   const overridden = await page.evaluate(async () => {
  473 |     // @ts-expect-error Vite serves this browser-only state module during Playwright tests.
  474 |     const state = await import('/src/kioskState.ts')
  475 |     let session = state.reducer(state.initialSession, { type: 'finishAnalysis', outcome: 'valid', grade: 'A', confidence: 96.3, rawConfidence: .963, inferenceId: 'result-A', captureId: 'capture-A', scores: { GRADE_A: .963, GRADE_B: .02, GRADE_C: .01, INVALID: .007 }, imageType: 'sashibocore', modelSource: 'raspberry-pi' })
  476 |     session = state.reducer(session, { type: 'setOverride', sample: 'Sashibo core', grade: 'C', reason: 'Expert visual inspection' })
  477 |     return session.results['Sashibo core']
  478 |   })
  479 |   expect(overridden).toMatchObject({ originalGrade: 'A', originalConfidence: 96.3, rawConfidence: .963, inferenceId: 'result-A', captureId: 'capture-A', overrideGrade: 'C', overrideReason: 'Expert visual inspection' })
  480 | })
  481 | 
  482 | test('local record storage does not silently truncate unsynced records', async ({ page }) => {
  483 |   await page.goto('/')
  484 |   const count = await page.evaluate(async () => {
  485 |     // @ts-expect-error Vite serves this browser-only storage module during Playwright tests.
  486 |     const records = await import('/src/gradingRecords.ts')
  487 |     records.saveRecords(Array.from({ length: 250 }, (_, index) => ({
  488 |       id: `pending-${index}`, sessionId: `session-${index}`, timestamp: index, time: 'Now', grader: 'Tester', sample: 'Sashibo core', fish: 'Fish 1', weight: '1 kg', grade: 'A', status: 'Complete',
  489 |       transaction: { currency: 'PHP', amount: null, syncState: 'pending' },
  490 |     })))
  491 |     return records.loadRecords().length
  492 |   })
  493 |   expect(count).toBe(250)
  494 | })
  495 | 
  496 | test('local Raspberry Pi hosting uses same-origin API and camera routes', async ({ page }) => {
  497 |   test.skip(process.env.VITE_PI_LOCAL_HOSTED !== 'true', 'Only runs for the Raspberry Pi local-hosted build mode.')
  498 |   const requests: string[] = []
  499 |   await page.route('**/snapshot', route => { requests.push(route.request().url()); return route.fulfill({ contentType: 'image/jpeg', body: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) }) })
  500 |   await page.route('**/grade', route => { requests.push(route.request().url()); return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: 'local-result', capture_id: 'local-capture', image_type: 'sashibocore', grade: 'GRADE_A', confidence: .96, scores: { GRADE_A: .96, GRADE_B: .02, GRADE_C: .01, INVALID: .01 } }) }) })
  501 |   await page.goto('/')
  502 |   const result = await page.evaluate(async () => {
  503 |     // @ts-expect-error Vite serves this browser-only integration module during Playwright tests.
  504 |     const client = await import('/src/piClient.ts')
  505 |     const settings = client.getPiSettings()
  506 |     const image = await client.capturePiImage('Sashibo core')
  507 |     const grade = await client.gradePiImage(image, 'Sashibo core')
  508 |     return { settings, grade }
  509 |   })
  510 |   const fallbackId = await page.evaluate(async () => {
  511 |     // @ts-expect-error Vite serves this browser-only utility during Playwright tests.
  512 |     const { createId } = await import('/src/id.ts')
  513 |     Object.defineProperty(crypto, 'randomUUID', { configurable: true, value: undefined })
  514 |     return createId()
  515 |   })
  516 |   expect(result.settings).toEqual({ mode: 'pi-local', configured: true, apiUrl: '', cameraUrl: '', streamUrl: '/stream', snapshotUrl: '/snapshot' })
  517 |   expect(result.grade).toMatchObject({ grade: 'A', imageType: 'sashibocore' })
  518 |   expect(fallbackId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  519 |   expect(requests).toEqual(['http://127.0.0.1:4178/snapshot', 'http://127.0.0.1:4178/grade'])
  520 | })
  521 | 
  522 | test('hosted deployment uses only the configured authenticated HTTPS gateway', async ({ page }) => {
  523 |   test.skip(!process.env.VITE_PI_GATEWAY_URL, 'Only runs with a hosted HTTPS gateway test URL.')
  524 |   const requests: string[] = []
  525 |   await page.route('https://gateway.test/stream**', route => { requests.push(route.request().url()); return route.fulfill({ contentType: 'image/jpeg', body: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) }) })
  526 |   await page.route('https://gateway.test/snapshot', route => { requests.push(route.request().url()); return route.fulfill({ contentType: 'image/jpeg', body: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) }) })
  527 |   await page.route('https://gateway.test/grade', route => { requests.push(route.request().url()); return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: 'secure-grade', capture_id: 'secure-capture', image_type: 'sashibocore', grade: 'GRADE_A', confidence: .96, scores: { GRADE_A: .96, GRADE_B: .02, GRADE_C: .01, INVALID: .01 } }) }) })
  528 |   await page.addInitScript(() => localStorage.setItem('tunaeye-installed', 'true'))
  529 |   await page.goto('/kiosk/camera')
  530 |   const result = await page.evaluate(async () => {
  531 |     // @ts-expect-error Vite serves this browser-only integration module during Playwright tests.
  532 |     const client = await import('/src/piClient.ts')
  533 |     const image = await client.capturePiImage('Sashibo core')
  534 |     return { settings: client.getPiSettings(), grade: await client.gradePiImage(image, 'Sashibo core') }
  535 |   })
  536 |   expect(result.settings).toEqual({ mode: 'hosted-gateway', configured: true, apiUrl: 'https://gateway.test', cameraUrl: 'https://gateway.test', streamUrl: 'https://gateway.test/stream', snapshotUrl: 'https://gateway.test/snapshot' })
  537 |   expect(result.grade).toMatchObject({ id: 'secure-grade', captureId: 'secure-capture', modelSource: 'raspberry-pi' })
  538 |   expect(requests.some(url => url.startsWith('http://10.42.0.1'))).toBe(false)
  539 |   expect(requests).toContain('https://gateway.test/snapshot')
  540 |   expect(requests).toContain('https://gateway.test/grade')
  541 | })
  542 | 
  543 | test('printing failure stays on receipt and offers retry', async ({ page }) => {
  544 |   await page.addInitScript(() => {
  545 |     localStorage.setItem('tunaeye-installed', 'true')
  546 |     window.print = () => { throw new Error('Printer unavailable') }
  547 |   })
  548 |   await page.goto('/kiosk/print')
> 549 |   await page.getByRole('button', { name: 'Print receipt' }).click()
      |                                                             ^ Error: locator.click: Test timeout of 30000ms exceeded.
  550 |   await expect(page.getByRole('dialog', { name: 'Printing failed' })).toBeVisible()
  551 |   await expect(page).toHaveURL(/\/kiosk\/print$/)
  552 |   await expect(page.getByRole('button', { name: 'Try again' })).toBeFocused()
  553 | })
  554 | 
  555 | test('skipping a receipt requires confirmation', async ({ page }) => {
  556 |   await page.addInitScript(() => localStorage.setItem('tunaeye-installed', 'true'))
  557 |   await page.goto('/kiosk/print')
  558 |   await page.getByRole('button', { name: 'Skip printing' }).click()
  559 |   const dialog = page.getByRole('dialog', { name: 'Skip printing?' })
  560 |   await expect(dialog).toBeVisible()
  561 |   await dialog.getByRole('button', { name: 'Keep printing' }).click()
  562 |   await expect(page).toHaveURL(/\/kiosk\/print$/)
  563 | })
  564 | 
  565 | test('uploaded image uses the same saved-evidence and Pi inference flow', async ({ page }) => {
  566 |   let gradeBody = ''
  567 |   const browserErrors: string[] = []
  568 |   const failedRequests: string[] = []
  569 |   page.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()) })
  570 |   page.on('pageerror', error => browserErrors.push(error.message))
  571 |   page.on('requestfailed', request => failedRequests.push(`${request.method()} ${request.url()}`))
  572 |   await page.setViewportSize({ width: 1024, height: 600 })
  573 |   await page.route('http://10.42.0.1:8080/**', route => route.fulfill({ contentType: 'image/jpeg', body: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) }))
  574 |   await page.route('http://10.42.0.1:5000/grade', async route => {
  575 |     gradeBody = route.request().postData() ?? ''
  576 |     await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: 'upload-grade', capture_id: 'upload-capture', grade: 'GRADE_B', confidence: 0.91, scores: { GRADE_A: 0.05, GRADE_B: 0.91, GRADE_C: 0.03, INVALID: 0.01 } }) })
  577 |   })
  578 |   await page.addInitScript(() => localStorage.setItem('tunaeye-installed', 'true'))
  579 |   await page.goto('/kiosk/camera')
  580 |   await expect(page.getByRole('button', { name: 'Upload image' })).toBeInViewport()
  581 |   await page.getByLabel('Upload specimen image').setInputFiles('public/assets/sashiboCoreFull.png')
  582 |   await expect(page.getByRole('heading', { name: 'Sashibo core · Grade B' })).toBeVisible()
  583 |   expect(gradeBody).toContain('sashibocore')
  584 |   expect(gradeBody).toContain('name="image"; filename="capture.png"')
  585 |   const evidence = await page.evaluate(async () => await new Promise<{ mimeType?: string; storedHash?: string; sourceHash?: string }>((resolve, reject) => {
  586 |     const open = indexedDB.open('tunaeye-offline', 1)
  587 |     open.onerror = () => reject(open.error)
  588 |     open.onsuccess = () => {
  589 |       const get = open.result.transaction('evidence').objectStore('evidence').getAll()
  590 |       get.onerror = () => reject(get.error)
  591 |       get.onsuccess = async () => {
  592 |         const stored = get.result[0]
  593 |         const source = await fetch('/assets/sashiboCoreFull.png').then(response => response.blob())
  594 |         const digest = async (blob: Blob) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()))).map(byte => byte.toString(16).padStart(2, '0')).join('')
  595 |         resolve({ mimeType: stored?.mimeType, storedHash: stored?.blob ? await digest(stored.blob) : undefined, sourceHash: await digest(source) })
  596 |       }
  597 |     }
  598 |   }))
  599 |   expect(evidence.mimeType).toBe('image/png')
  600 |   expect(evidence.storedHash).toBe(evidence.sourceHash)
  601 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  602 |   expect(browserErrors).toEqual([])
  603 |   expect(failedRequests).toEqual([])
  604 | })
  605 | 
  606 | test('completed grading session remains local and pending until cloud sync', async ({ page }) => {
  607 |   let gradeBody = ''
  608 |   let gradeBytes: Buffer | null = null
  609 |   await page.route('http://10.42.0.1:8080/**', route => route.fulfill({ contentType: 'image/jpeg', body: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) }))
  610 |   await page.route('http://10.42.0.1:5000/grade', async route => {
  611 |     gradeBody = route.request().postData() ?? ''
  612 |     gradeBytes = route.request().postDataBuffer()
  613 |     await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id: 'grade-1', capture_id: 'capture-1', image_type: 'sashibocore', grade: 'GRADE_A', confidence: 0.963, scores: { GRADE_A: 0.963, GRADE_B: 0.025, GRADE_C: 0.01, INVALID: 0.002 } }) })
  614 |   })
  615 |   await page.addInitScript(() => {
  616 |     localStorage.setItem('tunaeye-installed', 'true')
  617 |     localStorage.setItem('tunaeye-grader-name', 'Maria Santos')
  618 |   })
  619 |   
  620 |   // Complete a simulated grading flow
  621 |   await page.goto('/kiosk/weight')
  622 |   await expect(page.getByRole('heading', { name: /Fish weight/i })).toBeVisible({ timeout: 5000 })
  623 |   await page.getByRole('button', { name: '4', exact: true }).click()
  624 |   await page.getByRole('button', { name: '2', exact: true }).click()
  625 |   await page.getByRole('button', { name: 'Start capture' }).click()
  626 |   
  627 |   // Camera screen
  628 |   await expect(page.getByRole('heading', { name: /Align the sample/i })).toBeVisible()
  629 |   await page.getByRole('button', { name: 'Capture' }).click()
  630 |   await expect(page.getByRole('heading', { name: /Sashibo core · Grade/i })).toBeVisible({ timeout: 10000 })
  631 | 
  632 |   const evidence = await page.evaluate(async () => {
  633 |     const database = await new Promise<IDBDatabase>((resolve, reject) => {
  634 |       const request = indexedDB.open('tunaeye-offline', 1)
  635 |       request.onsuccess = () => resolve(request.result)
  636 |       request.onerror = () => reject(request.error)
  637 |     })
  638 |     const records = await new Promise<unknown[]>((resolve, reject) => {
  639 |       const request = database.transaction('evidence').objectStore('evidence').getAll()
  640 |       request.onsuccess = () => resolve(request.result)
  641 |       request.onerror = () => reject(request.error)
  642 |     })
  643 |     database.close()
  644 |     return records
  645 |   })
  646 |   expect(evidence).toHaveLength(1)
  647 |   expect(evidence[0]).toMatchObject({ sample: 'Sashibo core', fishId: 'Fish 1', syncState: 'pending' })
  648 |   await page.getByRole('button', { name: 'Manual override' }).click()
  649 |   const override = page.getByRole('dialog', { name: 'Manual override' })
```