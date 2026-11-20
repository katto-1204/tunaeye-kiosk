# TunaEye v2.6.4 — Complete Decision Matrix, Demo Guide & Testing Guide

This document is your master reference for **how TunaEye makes grading decisions**, **how to run a live or simulated presentation demo**, and **how to test every feature on the station**.

---

## 1. Complete Grading Decision Matrix

| # | Sashibo Core Result | Tail-Cut Requested? | What Happens After Core Scan | Tail-Cut Choice / Result | Final Grade Card Theme | Final Action |
| :- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Grade A** with **$\ge 75\%$** confidence | **No** | Skips Tail-Cut & goes straight to **Final Grade** | *N/A (Not needed)* | **Green Gradient** (`A` white letter + white `%` chip) | **Print receipt** |
| **2** | **Grade B** with **$\ge 75\%$** confidence | **No** | Skips Tail-Cut & goes straight to **Final Grade** | *N/A (Not needed)* | **Yellow/Amber Gradient** (`B` white letter + white `%` chip) | **Print receipt** |
| **3** | **Grade C** (any confidence, e.g. `84.7%`) | **Yes** *(to verify / lift low grade)* | Shows **`Tail cut needed`** screen first → click **`Capture tail cut`** → opens **`Scan Tail-Cut` \| `No Tail-Cut`** modal | **`No Tail-Cut`** (if Core $\ge 60\%$) | **Red Gradient** (`Grade C · PROVISIONAL`) | **Print receipt** |
| **4** | **Any Grade** (`A`, `B`, or `C`) with **$< 75\%$** confidence (`60%–74.9%`) | **Yes** *(under 75% threshold)* | Shows **`Tail cut needed`** screen first → click **`Capture tail cut`** → opens **`Scan Tail-Cut` \| `No Tail-Cut`** modal | **`No Tail-Cut`** | **Green / Yellow / Red Gradient** (`PROVISIONAL`) | **Print receipt** |
| **5** | **Any Grade** with **$< 60\%$** confidence (very low) | **Yes** | Shows **`Tail cut needed`** screen first → click **`Capture tail cut`** → opens **`Scan Tail-Cut` \| `No Tail-Cut`** modal | **`No Tail-Cut`** | **Black Gradient** (`Manual override required · PROVISIONAL`) | **Manual override** (2-col PIN keypad) |
| **6** | **Core $< 75\%$** (or `Grade C`) + **Tail-Cut Scanned** | **Yes** | Grader taps **`Scan Tail-Cut`** → scans Tail-Cut face | **Both agree** or **Avg $\ge 75\%$** (no `A` vs `C` clash) | **Green (`A`) / Yellow (`B`) / Red (`C`) Gradient** (Blended Grade) | **Print receipt** |
| **7** | **Core $< 75\%$** + **Tail-Cut Scanned** | **Yes** | Grader taps **`Scan Tail-Cut`** → scans Tail-Cut face | **Both $< 75\%$** OR **Avg $< 75\%$** | **Black Gradient** (`Manual override required`) | **Manual override** (2-col PIN keypad) |
| **8** | **Core** + **Tail-Cut Scanned** | **Yes** | Grader taps **`Scan Tail-Cut`** → scans Tail-Cut face | **Severe Disagreement** (`Core = A` vs `Tail = C`, or `Core = C` vs `Tail = A`) | **Black Gradient** (`Manual override required`) | **Manual override** (2-col PIN keypad) |
| **9** | **Non-Tuna / Invalid Image** (`INVALID` or HTTP `422`) | *N/A* | Pops **`Not a valid Sashibo core / Tail cut`** modal for **2 seconds** | Auto-closes after 2s, clears preview & **reopens live camera** | *Stays on Camera screen* | **Scan again** |

---

## 2. Step-by-Step Presentation Demo Guide

Use this flow when presenting TunaEye to panelists, judges, or port stakeholders.

### Phase A — Pre-Demo Setup (5 Minutes Before Presenting)
1. **Connect Tablet to `TunaRpi` Hotspot** and open the installed **TunaEye PWA** (`http://10.42.0.1:5000`).
   - Notice it **skips the marketing website** and boots straight into the Kiosk Welcome screen in `< 1 second`.
2. **Pre-Pair the 58mm Bluetooth Thermal Printer:**
   - Tap **`Start Grading`** → on the **`Who's grading?`** screen, tap **`Test print`** (bottom-left next to Demo mode).
   - In the **`Connect & Print Test Receipt`** modal, tap **`Connect BT & Print`**, select your 58mm printer, and let the `TE_TEST` receipt print out.
   - Your printer is now paired for the entire session (`● BT READY`).
3. **(Optional) Arm Secret 3rd-Scan Grade A Safety Net:**
   - If your real physical fish sample today only grades as `B` or `C` under the camera and you want the 3rd scan to demonstrate a live `Grade A`:
   - Tap **`Admin access`** → enter PIN **`1234`** → tap the small circular **`A` SVG icon** (`simulate secret`) in the top-right header next to **Sync now** (it turns emerald green).
   - **Scan 1 & Scan 2** will grade normally; **Scan 3+** will grade as **Grade A** with realistic, slightly varying confidence (`82.4%–96.8%`). Tap **`A`** again anytime to turn it off.

---

### Phase B — Live Presentation Script (What to Show & Say)

#### 1. Welcome Screen & Light-Mode Version Control (`welcome`)
- **Action:** Tap **`v2.6 · Updates`** (top-right chip) and the **circular signal SVG** (top-left `#te-net-pill`).
- **Talking Point:** *"TunaEye runs 100% offline on a Raspberry Pi 5 edge station. Our version control graph shows how v2.6 builds on our V2 dual-model foundation, and our top-left telemetry button verifies live Pi latency, V2 ONNX models, camera feed, and offline storage."*

#### 2. Grader Sign-In & SVG Pre-Flight Check (`name`)
- **Action:** Tap **`Start Grading`** → type grader name (e.g., `Maria`).
- **Highlight:** Point out the rotating header above the name (*"Let's start grading:"* → *"Ready at the station:"* → *"Active expert grader:"*).
- **Action:** Ensure **Demo mode** (bottom-left pill) is **OFF**, then tap **`Start grading`**.
- **Highlight:** The **2-column SVG `Ready for live grading?` modal** verifies all 6 subsystems (`Pi network`, `Flask inference server :8080`, `Camera snapshot`, `Sashibo Core V2 ONNX`, `Tail-Cut V2 ONNX`, and `Local storage & SQLite`). Tap **`Start live grading`**.

#### 3. Weight Input with 4-Digit Decimal Protection (`weight`)
- **Action:** Type a weight with decimals on the keypad (e.g., `78.12`). Try typing extra digits to show it **caps cleanly at 4 digits** (`15–200 kg`).
- **Action:** Tap **`← Back`** once to show the **`Exit as Maria ?`** safety modal (tap **`Cancel`** to stay, or **`Yes, exit`** which returns to sign-in and clears the name).
- **Action:** Tap **`Start capture 📷`**.

#### 4. Scenario 1 — High-Confidence Sashibo Core ($\ge 75\%$, Grade A or B)
- **Action:** Scan a Grade A or B Sashibo Core sample (or use Demo Mode → `Sashibo accepts` / `Grade B`).
- **Highlight:** Because confidence is $\ge 75\%$ and not Grade C, **TunaEye does NOT waste time asking for a Tail-Cut**. It lands directly on the **Green (`A`) or Yellow (`B`) Grade Card** with a white grade letter and white confidence percentage chip.

#### 5. Scenario 2 — Low Confidence ($< 75\%$) or `Grade C` → `Tail cut needed` → Decision Modal
- **Action:** Scan a Sashibo Core that scores $< 75\%$ or `Grade C`.
- **Highlight Step 1:** TunaEye first shows the **`Tail cut needed`** screen with the captured Core photo, circular Core Score gauge, and `Next: Tail cut` card.
- **Highlight Step 2:** Tap **`Capture tail cut 📷`** → the **`Is a Tail-Cut sample available?`** SVG modal pops up with side-by-side **`Scan Tail-Cut`** and **`No Tail-Cut`** buttons:
  - Tap **`Scan Tail-Cut`** to open the Tail-Cut camera and combine both models.
  - Or tap **`No Tail-Cut`** to grade provisionally using only the Sashibo Core.

#### 6. Scenario 3 — Non-Tuna / Invalid Scan Auto-Reset
- **Action:** Point the camera at a hand or empty tray and tap **`Scan sample`**.
- **Highlight:** Instead of a tiny toast notification, a centered **`Not a valid Sashibo core`** modal appears for **2 seconds**, automatically clears the bad frame, and **reopens the live camera**.

#### 7. Scenario 4 — Black Gradient Card & 2-Column Touch PIN Override
- **Action:** On the Final Grade screen, tap **`Override`** (or trigger a low-confidence pair where the Grade Card turns **Black Gradient**).
- **Highlight:** The **2-column Expert Override** lets the grader pick `A / B / C` and tap a preset reason chip on the left, and enter their 4-digit Station PIN (`1234`) on the **12-button touch keypad** on the right—no tablet keyboard pop-up required.

#### 8. Receipt Printing & 3-Second Auto-Next Countdown (`receipt` → `done`)
- **Action:** Proceed to **`Print receipt`**.
- **Highlight:** Left side shows the **POS-58 Thermal** ticket preview with a grade-colored tile; right side shows the grade-colored summary card and Bluetooth printer status.
  - If Bluetooth is paired, it prints automatically; otherwise tap the blue **Print** orb for manual system print, or tap **Skip**.
- **Highlight on Completion (`done`):**
  - Shows **`Results printed.`** (if printed) or **`Results recorded.`** (if skipped).
  - The centered **`Grade another`** button runs a live **3-second countdown** (`3` → `2` → `1`) and automatically returns to the Weight screen for the next fish.

#### 9. Grader Dashboard Record Inspection & Reprint (`dash` → `detail`)
- **Action:** Tap the **Home icon** (top-right) to open the **Grader Dashboard**.
- **Action:** Tap any row in **Recent records**.
- **Highlight:** Displays the **actual captured Sashibo Core and Tail-Cut photos** from IndexedDB (tap any photo to zoom full-screen) and a **`Reprint receipt`** button with an inline **`Pair BT Printer`** pill.

---

## 3. Quick Testing Checklist (Demo Mode vs Live Mode)

You can test every single path in **2 minutes** using **Demo Mode** on the `Who's grading?` screen (select the scenario from the dropdown above the bottom-left Demo Mode pill):

| Demo Dropdown Option | What It Simulates | Expected Screen Flow |
| :--- | :--- | :--- |
| **`Sashibo accepts`** | Core = `Grade A (96.3%)` | Skips Tail-Cut → **Green Grade A Card** (`96.3%` white chip) → Receipt |
| **`Grade B`** | Core = `Grade B (94.0%)` | Skips Tail-Cut → **Yellow Grade B Card** (`94.0%` white chip) → Receipt |
| **`Grade C`** | Core = `Grade C (94.0%)` | Goes to **`Tail cut needed`** → click **`Capture tail cut`** → **`Scan Tail-Cut` \| `No Tail-Cut`** modal |
| **`Tail cut needed`** | Core = `Grade C (74.2%)`, Tail = `Grade B (91.4%)` | Goes to **`Tail cut needed`** → click **`Capture tail cut`** → tap **`Scan Tail-Cut`** → scans Tail → **Yellow Grade B Card** |
| **`Expert needed`** | Core = `Grade B (68.1%)`, Tail = `Grade C (66.4%)` | Both $< 75\%$ → **Black Gradient Card (`Manual override required`)** → opens 2-column PIN keypad |
| **`Invalid core`** | Core = `INVALID` | Pops **2-second `"Not a valid Sashibo core"` modal** → resets & reopens camera |
| **`Invalid tail cut`** | Core = `74.2%`, Tail = `INVALID` | Core goes to `Tail cut needed` → Tail scan pops **2-second `"Not a valid Tail cut"` modal** & resets camera |
