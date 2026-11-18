# TunaEye Raspberry Pi 5 — User Test Checklist

Target URL: `http://10.42.0.1`  
Pi Services: Flask API (`:5000`) · Camera (`:8080`)  
Default Admin PIN: `1234`

---

## 1. Connect to TunaRpi Hotspot & Check Status Pill
- [ ] Connect your tablet/phone to the **TunaRpi** Wi-Fi hotspot (no internet).
- [ ] Open `http://10.42.0.1` in Chrome / browser.
- [ ] Confirm the **Opening TunaEye** loading dial counts smoothly (`0%` → `100%`).
- [ ] Check the **lower-right connection pill**:
  - [ ] It shows **`TunaRpi · Saved locally · Inference ON`** with green signal bars.
- [ ] Tap the lower-right connection pill to open **Connection details**:
  - [ ] **Raspberry Pi Station:** `Connected · <ms>`
  - [ ] **AI Models (V2):** `Both loaded` (`Sashibo Core: Loaded · Tail-Cut: Loaded`)
  - [ ] **Pi Camera:** `Snapshot ready` (if DroidCam or USB camera is connected)
  - [ ] **Cloud Sync (Supabase):** `Unreachable` (expected on Pi hotspot without internet)

---

## 2. Grader Sign-In & Live Readiness Check
- [ ] Tap **Start Grading** → enter your grader name (e.g., `Kat`).
- [ ] Confirm **Demo mode** toggle is **OFF** (live camera & inference).
- [ ] Tap **Start grading** → verify the **Ready for live grading?** modal checks:
  - [ ] Pi network: ✓
  - [ ] Flask inference server: ✓
  - [ ] Camera snapshot: ✓ (shows resolution, e.g., `1280 × 720`)
  - [ ] Sashibo Core model: ✓
  - [ ] Tail-Cut model: ✓
  - [ ] Local storage & SQLite: ✓
- [ ] Tap **Start live grading**.

---

## 3. Weight & Sashibo Core Capture
- [ ] Enter a valid fish weight (`15–200 kg`, e.g., `42`).
- [ ] Confirm live camera preview loads on the Sashibo Core scan screen.
- [ ] Place a Sashibo Core sample (or test image via camera) and tap **Scan sample**.
- [ ] Verify the **"Is a Tail-Cut sample available?"** modal appears showing the Sashibo Core grade and confidence.

---

## 4. Branch A — No Tail-Cut (Provisional Workflow)
- [ ] In the modal, tap **No — Continue without Tail-Cut**.
- [ ] On the **Final grade** screen, verify:
  - [ ] Badge reads **`PROVISIONAL`** (amber).
  - [ ] Heading reads **`Provisional — Confirmation required`**.
  - [ ] Tail card reads **`Tail-Cut: NOT AVAILABLE`**.
  - [ ] No final grade is auto-assigned (button reads **`Confirm / Set final grade`**).
- [ ] Tap **`Confirm / Set final grade`**:
  - [ ] Try saving with an empty reason → confirm it requires a reason.
  - [ ] Enter Station PIN `1234`, select grade (`A`, `B`, or `C`), enter a reason, and tap **Confirm final grade**.
- [ ] Verify the **Receipt** screen shows **`PROVISIONAL · TAIL-CUT NOT AVAILABLE`**.
- [ ] Test **Print receipt** (58mm thermal layout).

---

## 5. Branch B — Yes Tail-Cut (Two-Model Workflow)
- [ ] Start another fish → scan **Sashibo Core** → tap **Yes — Scan Tail-Cut**.
- [ ] Verify it opens the **Tail-Cut** camera screen.
- [ ] Tap **Scan sample** to run the Tail-Cut V2 model.
- [ ] On **Final grade**, verify:
  - [ ] Both **Core sample** and **Tail sample** photos are shown **in full (not cut off)**.
  - [ ] Both predictions and confidences are shown separately (never averaged).
  - [ ] If grades disagree (e.g., `A` vs `B`) OR either confidence is `< 80%`, verify **`Manual review required`** is flagged and requires PIN + reason.
  - [ ] If both agree and both are `>= 80%`, verify you can proceed directly to **Print receipt**.

---

## 6. Grader Dashboard & Offline Persistence
- [ ] Return to the Grader Dashboard (`Welcome back, <your name>.`).
- [ ] Verify **Recent records** only shows **your** sessions (not other graders' records).
- [ ] Verify your newly graded records show **`Saved locally`**.
- [ ] Tap **Sync now** while still on the Pi hotspot (no internet):
  - [ ] Confirm it keeps all images and records locally and does not claim internet is working.
- [ ] Reload the page while offline/on Pi hotspot and confirm your records are still there.

---

## 7. Admin Console (`1234`)
- [ ] Open **Admin access** and enter PIN **`1234`**.
- [ ] Check **Overview** and **Records**:
  - [ ] Your newly graded sessions appear.
  - [ ] Tap **View** on a record → confirm the evidence photo and details load cleanly.
- [ ] Check **Expert graders**:
  - [ ] Your grader name is automatically listed with **`Currently grading`** and your sample count.
- [ ] Check **Price schedule**:
  - [ ] Grades A, B, and C sit in one row; save a test price change and verify it persists.
- [ ] Check **Devices**:
  - [ ] Tap **Check Pi connection** and **Test Pi camera** and verify both respond.

---

## 8. Switch to Internet Wi-Fi & Verify Cloud Sync
- [ ] Switch the tablet from **TunaRpi** to a Wi-Fi network with internet access.
- [ ] Wait up to ~1 minute (or tap **Sync now** / open **Connection details** → **Sync now**):
  - [ ] Lower-right pill updates to **`Wi-Fi · Cloud ready`**.
  - [ ] Pending records upload to Supabase (`Synced`) without duplicating records.
  - [ ] Your grader name is recorded in Supabase (`station_graders` / `grading_records`).
- [ ] Check **Admin → Records** (and/or Supabase Table Editor) to confirm records, images, and graders are in the cloud.

---

## 9. Website & Documentation Check
- [ ] Open **About TunaEye ▾ → Documentation** from the landing page.
- [ ] Confirm the **TunCam** (`https://tuncam.vercel.app/`), **Data Collection** (6 photos), and **Consultations** (**PAG-ASA Bangkerohan · Boss Jerry**, **PFDA · Ma'am Borja**, 7 photos) galleries load cleanly with click-to-zoom lightbox.

