# TunaEye Kiosk Screens Guide

All 35 kiosk screenshots are saved in [`public/kiosk-screenss/`](./). Each image is captured at `1280×864` (`1280×800` kiosk UI + `64px` non-overlapping caption bar below).

---

## 1. Grader Onboarding & Setup

| File | Screen Name | Short Explanation |
| :--- | :--- | :--- |
| [01-welcome.png](./01-welcome.png) | **Welcome Screen** | Kiosk idle/start screen showing station status (`TunaEye Station 01 · Ready`), 4-step workflow overview, and the **Start Grading** button. |
| [02-grader-identity.png](./02-grader-identity.png) | **Grader Identity (`Who's grading?`)** | Operator enters or selects their name, toggles **Demo mode** / **Live mode**, runs **Test print**, views today's station stats, or opens **Admin access**. |
| [24-terms-dialog.png](./24-terms-dialog.png) | **Terms & Conditions Dialog** | Modal opened from the Grader Identity screen displaying the kiosk terms of use. |
| [25-privacy-dialog.png](./25-privacy-dialog.png) | **Privacy Policy Dialog** | Modal opened from the Grader Identity screen explaining local/cloud data handling. |
| [03-weight-entry.png](./03-weight-entry.png) | **Weight Entry (`Weigh the fish`)** | Touch numeric keypad (`15–200 kg`) for entering the fish weight shown on the scale before starting capture. |
| [04-placement-guide.png](./04-placement-guide.png) | **Placement Guide (Guided Tutorial)** | Step-by-step illustrated overlay showing how to pull out the chamber tray and position the sample cleanly. |

---

## 2. Sashibo Core & Tail-Cut Capture Flow

| File | Screen Name | Short Explanation |
| :--- | :--- | :--- |
| [05-core-capture.png](./05-core-capture.png) | **Sashibo Core Capture** | Step 2 of 4: Camera frame for scanning or uploading the Sashibo Core sample (`Demo mode` or live feed). |
| [20-core-camera-live.png](./20-core-camera-live.png) | **Core Camera Screen** | Core capture view showing alignment guides, order ID, weight summary, **Scan sample**, and **Upload an image instead**. |
| [06-core-result.png](./06-core-result.png) | **Core Result / Direct Grade** | Result view right after Sashibo Core inference when confidence is ≥ 75% (proceeds directly without needing a Tail-Cut). |
| [07-tail-needed.png](./07-tail-needed.png) | **Tail-Cut Needed** | Shown when Sashibo Core confidence is `< 75%`; displays the Core photo, circular score gauge, threshold explanation, and **Capture tail cut** button. |
| [21-tail-needed-correct.png](./21-tail-needed-correct.png) | **Tail-Cut Needed + Decision Modal** | Tail-Cut needed screen with the **Is a Tail-Cut sample available?** modal (`Scan Tail-Cut` \| `No Tail-Cut`) triggered on next action. |
| [08-tail-capture.png](./08-tail-capture.png) | **Tail-Cut Capture** | Step 3 of 4: Camera frame for scanning or uploading the Tail-Cut cross-section face. |
| [22-tail-camera.png](./22-tail-camera.png) | **Tail-Cut Camera View** | Active Tail-Cut camera layout with alignment corners and capture/upload controls. |

---

## 3. Final Grade, Override, Receipt & Completion

| File | Screen Name | Short Explanation |
| :--- | :--- | :--- |
| [09-final-grade.png](./09-final-grade.png) | **Final Grade** | Step 4 of 4: Displays the final grade (`A`/`B`/`C`), confidence score, weight × rate total value (`₱`), and **Override** / **Retake** / **Print receipt** actions. |
| [23-final-combined.png](./23-final-combined.png) | **Final Combined Grade** | Final grade screen showing combined Sashibo Core + Tail-Cut scores and averaged confidence. |
| [26-leave-session-dialog.png](./26-leave-session-dialog.png) | **Leave Session Confirmation** | Guard modal triggered when tapping **Back** on an active grade, warning that the current result will be discarded. |
| [27-override-dialog.png](./27-override-dialog.png) | **Manual Override Dialog** | Supervisor PIN + grade selector modal (`A` / `B` / `C`) with quick-tap reason chips for overriding the AI grade. |
| [10-receipt.png](./10-receipt.png) | **Receipt Screen** | 58mm thermal ticket preview (`POS-58 THERMAL`) alongside the grade summary card, **Pair BT Printer**, **Print**, and **Skip** buttons. |
| [28-receipt-screen.png](./28-receipt-screen.png) | **Receipt Screen (Combined / Alt)** | Receipt preview showing combined Core + Tail-Cut line items and total value calculation. |
| [29-skip-receipt-dialog.png](./29-skip-receipt-dialog.png) | **Skip Receipt Confirmation** | Confirmation modal when tapping **Skip** on the receipt screen, confirming the record remains saved locally. |
| [11-completion.png](./11-completion.png) | **Session Completion** | Final confirmation screen after printing or skipping the receipt, ready to start the next fish. |

---

## 4. Grader Dashboard & Record Detail

| File | Screen Name | Short Explanation |
| :--- | :--- | :--- |
| [19-grader-dashboard.png](./19-grader-dashboard.png) | **Grader Dashboard** | Operator home view showing **Start grading**, **Sync now**, red **Logout** button, today's stats, and **Recent records** list. |
| [18-record-detail.png](./18-record-detail.png) | **Record Detail** | Detailed inspection modal/screen for a past session with captured Sashibo/Tail-Cut photos, scores, and **Reprint receipt**. |
| [35-record-detail-full.png](./35-record-detail-full.png) | **Record Detail (Full)** | Full-view inspection record showing complete metadata, grade breakdown, and evidence photos. |

---

## 5. Admin Console

| File | Screen Name | Short Explanation |
| :--- | :--- | :--- |
| [12-admin-pin.png](./12-admin-pin.png) | **Admin PIN Entry** | 4-digit touch PIN keypad protecting access to the Admin Console. |
| [13-admin-overview.png](./13-admin-overview.png) | **Admin Overview** | Main admin dashboard with total sessions, total kg graded, pending sync count, weekly volume, and grade distribution. |
| [30-admin-overview.png](./30-admin-overview.png) | **Admin Overview (Alt)** | Admin overview tab capture showing station operations summary. |
| [14-admin-records.png](./14-admin-records.png) | **Admin Records** | Searchable/filterable table of all inspection records with sync status and photo/receipt inspection. |
| [admin-records-full.png](./admin-records-full.png) | **Admin Records (Full)** | Full-view capture of the Admin Records management tab. |
| [15-admin-devices.png](./15-admin-devices.png) | **Admin Devices** | Hardware diagnostics for the Raspberry Pi camera, Bluetooth thermal printer, and network connection. |
| [admin-devices-full.png](./admin-devices-full.png) | **Admin Devices (Full)** | Full-view capture of the Admin Devices & hardware status tab. |
| [16-admin-settings.png](./16-admin-settings.png) | **Admin Settings** | Station configuration for station name, Pi API URL, Camera URL, operating mode, and cloud sync/PIN settings. |
| [admin-settings-full.png](./admin-settings-full.png) | **Admin Settings (Full)** | Full-view capture of the Admin Settings tab. |
| [17-admin-audit-log.png](./17-admin-audit-log.png) | **Admin Audit Log** | Chronological operator and system audit trail (logins, overrides, settings changes, syncs). |
| [admin-audit-full.png](./admin-audit-full.png) | **Admin Audit Log (Full)** | Full-view capture of the Admin Audit Log tab. |
