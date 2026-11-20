# TunaEye Kiosk Screens Guide

All final kiosk screenshots are saved in [`public/kiosk-screens/`](./). Each image is captured at `1280×864` (`1280×800` kiosk UI + `64px` non-overlapping caption bar below).

> **Note:** Dashboard, Record Detail, and Audit Log screenshots were captured with synthetic demo records so all charts, tables, and sample detail views are populated.

---

## 1. Grader Onboarding & Placement Guide

| File | Screen Name | Short Explanation |
| :--- | :--- | :--- |
| [00-landing-page.png](./00-landing-page.png) | **Public Landing Page** | Marketing & station portal showing the hero, `v2.7.0 What's new` badge, tablet kiosk preview, and **Install kiosk app**. |
| [01-welcome.png](./01-welcome.png) | **Welcome Screen** | Kiosk idle/start screen showing station status (`TunaEye Station 01 · Ready`), `Sync` button, `v2.7 · Updates NEW` badge, full `TunaEye` wordmark, 4-step workflow bar, and **Start Grading**. |
| [01b-welcome-sync-modal.png](./01b-welcome-sync-modal.png) | **Welcome Sync Modal** | Modal opened from the Welcome **Sync** button allowing operators to select which graders' local records to sync now or queue when back online. |
| [01c-slow-wifi-sync-modal.png](./01c-slow-wifi-sync-modal.png) | **Slow Wi-Fi Sync Modal** | Shown automatically if sync takes over 4 seconds on slow Wi-Fi, with **Sync in background** and **Keep waiting** actions. |
| [02-grader-identity.png](./02-grader-identity.png) | **Grader Identity (`Who's grading?`)** | Operator enters or selects their name, toggles **Demo mode** / **Live mode**, runs **Test print**, views today's station stats, or opens **Admin access**. |
| [02b-grader-match-modal.png](./02b-grader-match-modal.png) | **Grader Identity Check Modal** | Phonetic/duplicate name check (`Are you Kat?` · `Have you graded 5 mins ago?`) with **Yes, continue** or **No, start new** (last-initial disambiguation). |
| [24-terms-dialog.png](./24-terms-dialog.png) | **Terms & Conditions Dialog** | Modal opened from the Grader Identity screen displaying the kiosk terms of use. |
| [25-privacy-dialog.png](./25-privacy-dialog.png) | **Privacy Policy Dialog** | Modal opened from the Grader Identity screen explaining local/cloud data handling. |
| [03-weight-entry.png](./03-weight-entry.png) | **Weight Entry (`Weigh the fish`)** | Touch numeric keypad (`15–200 kg`) for entering the fish weight shown on the scale before starting capture. |
| [04-placement-guide.png](./04-placement-guide.png) | **Placement Guide — Step 1** | Guided tutorial Step 1 of 3 (`2s` auto-advance, `Close` / `Skip` right of `Next`): Pull out the chamber tray and ensure the surface is clean. |
| [04b-placement-guide-step2.png](./04b-placement-guide-step2.png) | **Placement Guide — Step 2** | Guided tutorial Step 2 of 3 (`2s` auto-advance, `Close` / `Skip` right of `Next`): Place the Sashibo Core or Tail-Cut sample flat inside the frame. |
| [04c-placement-guide-step3.png](./04c-placement-guide-step3.png) | **Placement Guide — Step 3** | Guided tutorial Step 3 of 3 (`2s` auto-advance, `Close` / `Skip` right of `Next`): Close the tray for even 5000K lighting and start scanning. |

---

## 2. Sashibo Core & Tail-Cut Capture Flow

| File | Screen Name | Short Explanation |
| :--- | :--- | :--- |
| [05-core-capture.png](./05-core-capture.png) | **Sashibo Core Capture** | Step 2 of 4: Camera frame for scanning or uploading the Sashibo Core sample (`Demo mode` or live feed). |
| [05b-invalid-sample-modal.png](./05b-invalid-sample-modal.png) | **Invalid Sample Modal (`Cannot Be Determined`)** | Alert dialog shown when a non-Sashibo object is scanned (`This image is not recognized as a valid Sashibo core. Camera reset — please scan again.`). |
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

## 4. Grader Dashboard vs. Record Detail

| File | Screen Name | Short Explanation |
| :--- | :--- | :--- |
| [19-grader-dashboard.png](./19-grader-dashboard.png) | **Grader Dashboard** | Operator overview for the logged-in grader (`Start grading`, `Sync now`, red `Logout`), **My records** / **All device records** filter, today's summary stats, and the **Recent records** list. |
| [19b-grader-dashboard-empty.png](./19b-grader-dashboard-empty.png) | **Grader Dashboard (New Grader Empty State)** | Shown for a brand-new grader with 0 records yet (`No records yet`) before switching to **All device records**. |
| [18-record-detail.png](./18-record-detail.png) | **Record Detail** | **Opened by tapping a row in Grader Dashboard**: drills into a single record (`TE_0010`) with sample type, weight, grade, confidence, value, and **Reprint receipt**. |
| [35-record-detail-full.png](./35-record-detail-full.png) | **Record Detail (Full)** | Full-view inspection record showing complete metadata, grade breakdown, and reprint action. |

---

## 5. Admin Console

| File | Screen Name | Short Explanation |
| :--- | :--- | :--- |
| [12-admin-pin.png](./12-admin-pin.png) | **Admin PIN Entry** | 4-digit touch PIN keypad protecting access to the Admin Console. |
| [13-admin-overview.png](./13-admin-overview.png) | **Admin Overview** | Main admin dashboard with time filters (`All time`, `Last month`, `Last week`, `Today`, `Yesterday`, `An hour ago`, `Older (> 30d)`), metrics, 7-day volume chart, grade ring, recent records, and the secret button right of `Logout`. |
| [30-admin-overview.png](./30-admin-overview.png) | **Admin Overview (Alt)** | Admin overview tab capture showing populated station operations metrics. |
| [14-admin-records.png](./14-admin-records.png) | **Admin Records** | Searchable/time-filterable table of all inspection records with sample thumbnails, sync status, CSV export, and evidence review. |
| [14b-admin-record-detail.png](./14b-admin-record-detail.png) | **Admin Transaction & Evidence Detail** | Modal opened by tapping **View** on any row in Admin Records — displays the captured sample image, weight/value, saved rate, original prediction, override, and sync status. |
| [admin-records-full.png](./admin-records-full.png) | **Admin Records (Full)** | Full-view capture of the Admin Records management tab. |
| [15b-admin-expert-graders.png](./15b-admin-expert-graders.png) | **Admin Expert Graders** | Registered graders list with sample counts, **Add grader**, **View records** jump button, and **Remove**. |
| [15-admin-devices.png](./15-admin-devices.png) | **Admin Devices** | Hardware diagnostics for the Raspberry Pi camera, Bluetooth thermal printer, and network connection. |
| [admin-devices-full.png](./admin-devices-full.png) | **Admin Devices (Full)** | Full-view capture of the Admin Devices & hardware status tab. |
| [16-admin-settings.png](./16-admin-settings.png) | **Admin Settings** | Station configuration for station name, Pi API URL, Camera URL, operating mode, and cloud sync/PIN settings. |
| [admin-settings-full.png](./admin-settings-full.png) | **Admin Settings (Full)** | Full-view capture of the Admin Settings tab. |
| [17-admin-audit-log.png](./17-admin-audit-log.png) | **Admin Audit Log** | Chronological operator and system audit trail (Pi tests, completed sessions, price updates, overrides, exports, settings). |
| [admin-audit-full.png](./admin-audit-full.png) | **Admin Audit Log (Full)** | Full-view capture of the Admin Audit Log tab. |
