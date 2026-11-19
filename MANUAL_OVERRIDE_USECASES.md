# TunaEye — Tail-Cut, Manual Override & Grading Use-Case Checklist

Use this checklist to verify every grading path, Tail-Cut prompt, Grade Card color theme, and Manual Override flow on the station (`v2.6`).

---

## 1. Decision Thresholds Summary

| Parameter | Threshold / Rule | Behavior |
| :--- | :--- | :--- |
| **Sashibo Core Accepted Confidence** | **$\ge 75\%$** (`ACCEPT_CONFIDENCE = 75`) | **Tail-Cut is NOT requested.** Goes straight to Final Grade (`Grade A` = Green card, `Grade B` = Yellow card, `Grade C` = Red card, white grade letter). |
| **Sashibo Core Low Confidence** | **$< 75\%$** (`74.9%` and below) | Opens **"Is a Tail-Cut sample available?"** modal with SVG cards and side-by-side **`Scan Tail-Cut`** and **`No Tail-Cut`** buttons. |
| **Invalid / Non-Tuna Image** | `INVALID` class or HTTP `422` | Opens **"Not a valid Sashibo core / Tail cut"** modal for **2 seconds**, clears the preview, and **automatically reopens the live camera**. |

---

## 2. When Manual Override Is Required (Black Gradient Grade Card)

The Final Grade card turns **Black Gradient** (`Manual override required` / `OVERRIDE REQUIRED` badge) and requires the **2-Column Expert Override Keypad** (`PIN` + `Final Grade A/B/C` + `Reason`) in these exact use cases:

### Use Case A — Both Sashibo Core and Tail-Cut Are Below 75% Confidence
- **Trigger:**
  1. Scan Sashibo Core with confidence **$< 75\%$** (e.g. `58.4%` or `68.1%`).
  2. In the Tail-Cut modal, tap **`Scan Tail-Cut`**.
  3. Scan Tail-Cut and its confidence is also **$< 75\%$** (e.g. `48.6%` or `66.4%`), or the average confidence of Core + Tail is **$< 75\%$**.
- **Expected UI:**
  - Center Grade Card has a **black gradient** background with white text (`Grade [X] · Needs Override`).
  - Primary bottom-right button reads **`Manual override`**.
  - Tapping **`Manual override`** opens the **2-column Expert Override modal** (left: `A/B/C` + quick-tap reasons; right: 4-dot PIN + 12-key number pad + centered `Cancel` / `Save` buttons).
- **How to test quickly in Demo Mode:**
  - On the Grader Name screen (with Demo Mode ON), choose scenario **`Expert needed`** (`Core 68.1%`, `Tail 66.4%`) in the bottom-left scenario selector, enter weight, scan Core → tap **`Scan Tail-Cut`** → scan Tail.

---

### Use Case B — Severe Model Disagreement (`Grade A` vs `Grade C`)
- **Trigger:**
  1. Sashibo Core confidence is **$< 75\%$** and predicts **`Grade A`** (or **`Grade C`**).
  2. Tap **`Scan Tail-Cut`**.
  3. Tail-Cut predicts the opposite extreme — **`Grade C`** when Core was `A` (or **`Grade A`** when Core was `C`).
- **Expected UI:**
  - Center Grade Card turns **black gradient** with message: *"Severe model disagreement: Sashibo Core (Grade A, …%) vs Tail-Cut (Grade C, …%). An authorized grader must confirm the final grade."*
  - Primary button opens **Manual override**.

---

### Use Case C — Very Low Confidence Sashibo Core ($< 60\%$) with `No Tail-Cut` (Provisional)
- **Trigger:**
  1. Scan Sashibo Core with very low confidence (**$< 60\%$**, e.g. `58.4%`).
  2. In the Tail-Cut modal, tap **`No Tail-Cut`**.
- **Expected UI:**
  - Marked **`PROVISIONAL`** and requires **Manual override** (black gradient card) before printing because confidence is under `60%` without a Tail-Cut verification.
  - *(Note: If Sashibo Core confidence is between **$60\%$ and $74.9\%$** and you tap **`No Tail-Cut`**, it allows printing directly as `Grade [X] (Provisional)` without forcing an override, though you can still tap **Override** voluntarily.)*

---

### Use Case D — Voluntary Expert Override on Any Graded Fish
- **Trigger:**
  1. On **any** Final Grade screen (Green `Grade A`, Yellow `Grade B`, or Red `Grade C`), tap the **`Override`** button in the bottom-left bar.
- **Expected UI:**
  - Opens the **2-column Expert Override** modal.
  - Select `A`, `B`, or `C`, tap a preset reason chip (`Visual inspection`, `Confirmed AI grade`, `Color / texture check`), enter the 4-digit Station PIN (`1234` default) on the right keypad, and tap **`Save`**.
  - Proceeds immediately to the **Receipt** screen with the expert-overridden grade and rate.

---

## 3. Quick Verification Checklist

- [ ] **High-Confidence Sashibo ($\ge 75\%$):** Does NOT ask for Tail-Cut; goes straight to Final Grade (`A` = Green, `B` = Yellow, `C` = Red, white letter).
- [ ] **Low-Confidence Sashibo ($< 75\%$):** Opens Tail-Cut modal with SVG cards, no long explanation text, and side-by-side **`Scan Tail-Cut`** / **`No Tail-Cut`** buttons.
- [ ] **Invalid / Non-Tuna Scan:** Shows **"Not a valid Sashibo core / Tail cut"** modal for **2 seconds**, clears the frozen preview, and reopens the live camera automatically.
- [ ] **Manual Override Card & Keypad:** Shows **black gradient** card when override is required; 2-column override modal has centered **`Cancel`** / **`Save`** buttons and works without opening the tablet keyboard.
- [ ] **Back Navigation Modals:**
  - [ ] Tapping **Back** on Final Grade asks **"Do you want to leave the session?"** → returns to **Weight input**.
  - [ ] Tapping **Back** on Weight input asks **"Exit as [Grader Name] ?"** → returns to **Grader Name** screen.
- [ ] **Top-Left Connection Button & Top-Right Version Chip:**
  - [ ] Circular `34×34px` SVG signal button is at the **top-left** (`#te-net-pill`) and opens **Connection details** when tapped.
  - [ ] Small **`v2.6 · Updates`** chip is at the **top-right** of the Welcome screen (`#te-ver-chip`) and opens the **Version Control & Updates** log.

