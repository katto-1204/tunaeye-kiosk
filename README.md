<p align="center">
  <img src="public/assets/applogo.svg" width="112" alt="TunaEye App Icon" />
</p>

<h1 align="center">TunaEye — Sea Beyond the Cut.</h1>

<p align="center">
  <strong>We don't replace the expert eye. We extend its reach.</strong>
</p>

<p align="center">
  Built on expert knowledge. Enhanced by computer vision.<br />
  Designed to extend the reach of human expertise.
</p>

<p align="center">
  <img alt="Version 2.7.0" src="https://img.shields.io/badge/Version-2.7.0-2769eb?style=for-the-badge&labelColor=103b70" />
  <img alt="Node 20+" src="https://img.shields.io/badge/Node-20%2B-2769eb?style=for-the-badge&labelColor=103b70" />
  <img alt="Vite + React" src="https://img.shields.io/badge/Vite-React-1e5fd9?style=for-the-badge&labelColor=103b70" />
  <img alt="PWA kiosk" src="https://img.shields.io/badge/PWA-Kiosk-5dbbf3?style=for-the-badge&labelColor=103b70" />
  <img alt="Yellowfin" src="https://img.shields.io/badge/Species-Yellowfin-0ea5e9?style=for-the-badge&labelColor=103b70" />
</p>

---

## App Icon, Landing Page & Kiosk Showcase

<table>
  <tr>
    <td width="50%" valign="top">
      <h3 align="center">Public Landing Page</h3>
      <a href="public/kiosk-screens/00-landing-page.png">
        <img src="public/kiosk-screens/00-landing-page.png" alt="TunaEye Landing Page" />
      </a>
    </td>
    <td width="50%" valign="top">
      <h3 align="center">Kiosk Welcome Screen</h3>
      <a href="public/kiosk-screens/01-welcome.png">
        <img src="public/kiosk-screens/01-welcome.png" alt="TunaEye Kiosk Welcome Screen" />
      </a>
    </td>
  </tr>
</table>

### Key Kiosk & Admin Screens

<table>
  <tr>
    <td width="33%" valign="top">
      <a href="public/kiosk-screens/01b-welcome-sync-modal.png">
        <img src="public/kiosk-screens/01b-welcome-sync-modal.png" alt="Welcome Sync Modal" />
      </a>
      <p align="center"><strong>Welcome Sync Modal</strong><br />Select graders to sync or queue</p>
    </td>
    <td width="33%" valign="top">
      <a href="public/kiosk-screens/04-placement-guide.png">
        <img src="public/kiosk-screens/04-placement-guide.png" alt="Placement Guide" />
      </a>
      <p align="center"><strong>Placement Guide</strong><br />3-step chamber tutorial</p>
    </td>
    <td width="33%" valign="top">
      <a href="public/kiosk-screens/05-core-capture.png">
        <img src="public/kiosk-screens/05-core-capture.png" alt="Sashibo Core Capture" />
      </a>
      <p align="center"><strong>Sashibo Core Capture</strong><br />Live Pi camera or upload</p>
    </td>
  </tr>
  <tr>
    <td width="33%" valign="top">
      <a href="public/kiosk-screens/07-tail-needed.png">
        <img src="public/kiosk-screens/07-tail-needed.png" alt="Tail-Cut Needed" />
      </a>
      <p align="center"><strong>Tail-Cut Needed</strong><br />Triggered when confidence &lt; 75%</p>
    </td>
    <td width="33%" valign="top">
      <a href="public/kiosk-screens/09-final-grade.png">
        <img src="public/kiosk-screens/09-final-grade.png" alt="Final Grade" />
      </a>
      <p align="center"><strong>Final Grade</strong><br />Grade, confidence, weight &times; rate</p>
    </td>
    <td width="33%" valign="top">
      <a href="public/kiosk-screens/10-receipt.png">
        <img src="public/kiosk-screens/10-receipt.png" alt="Receipt Screen" />
      </a>
      <p align="center"><strong>58mm Thermal Receipt</strong><br />Bluetooth POS-58 print preview</p>
    </td>
  </tr>
  <tr>
    <td width="33%" valign="top">
      <a href="public/kiosk-screens/19-grader-dashboard.png">
        <img src="public/kiosk-screens/19-grader-dashboard.png" alt="Grader Dashboard" />
      </a>
      <p align="center"><strong>Grader Dashboard</strong><br />Session stats &amp; recent records</p>
    </td>
    <td width="33%" valign="top">
      <a href="public/kiosk-screens/13-admin-overview.png">
        <img src="public/kiosk-screens/13-admin-overview.png" alt="Admin Overview" />
      </a>
      <p align="center"><strong>Admin Overview</strong><br />Time filters, volume &amp; grade ring</p>
    </td>
    <td width="33%" valign="top">
      <a href="public/kiosk-screens/15b-admin-expert-graders.png">
        <img src="public/kiosk-screens/15b-admin-expert-graders.png" alt="Admin Expert Graders" />
      </a>
      <p align="center"><strong>Expert Graders</strong><br />Station operators &amp; record counts</p>
    </td>
  </tr>
</table>

See [`public/kiosk-screens/README.md`](public/kiosk-screens/README.md) for the complete 40+ screen visual guide (and [`TunaEye_Kiosk_Screens_Guide.docx`](public/kiosk-screens/TunaEye_Kiosk_Screens_Guide.docx)).

---

TunaEye is a **CNN-based computer vision** kiosk for yellowfin tuna. It supports expert graders by classifying **sashibo core** and **tail-cut** images — it does not take the grader's place.

Expert-annotated data, standardized capture, and transfer learning make grading more consistent, faster, and easier to share. The human remains the authority.

```text
  expert traits  ──mirrors──►  CNN assist  ──supports──►  grader decision
       ▲                              ▲
  annotated cuts              sashibo + tail cut
```

<table>
  <tr>
    <td width="33%" valign="top">
      <h3>Expert, not replaced</h3>
      Mirrors the traits graders already use. Final call stays with a qualified person.
    </td>
    <td width="33%" valign="top">
      <h3>Standard capture</h3>
      Guided tablet flow, lighting chamber, weight, and one evidence record per sample.
    </td>
    <td width="33%" valign="top">
      <h3>CNN on the edge</h3>
      Raspberry Pi inference on the station LAN. Review, override, print, then sync.
    </td>
  </tr>
</table>

---

## What you get

| Surface | Role |
| --- | --- |
| **Public landing** | Brand, install, changelog (`v2.7.0`), station story |
| **Kiosk PWA** | Capture → infer → review → receipt |
| **Admin** | Records, prices, graders, devices, audit |
| **Pi edge** | Grade + confidence over LAN |
| **Cloud** | Supabase records + evidence when configured |

```mermaid
flowchart LR
  A[Chamber + camera] --> B[Tablet kiosk]
  B -->|image + cut + weight| C[Raspberry Pi CNN]
  C -->|grade + confidence| B
  B --> D[Receipt]
  B --> E[Local store]
  E --> F[Supabase when online]
```

---

## Run

```powershell
npm install
npm run dev
```

Open **http://localhost:3000**

| Command | Result |
| --- | --- |
| `npm run dev:demo` | Full hardware-free demo with simulated camera and inference |
| `npm run build:demo` then `npm run preview` | Production demo bundle |
| `npm run build:pi` | Production Raspberry Pi local-hosted bundle (`dist/`) |
| `npm run build` then `npm run preview` | Production build |
| `npx vercel` | HTTPS deploy (`dist` + SPA fallback) |

Camera and PWA install need **HTTPS** or **localhost**.

---

## Grade a fish

```text
1  Expert grader          5  Align + capture
2  Name                   6  Pi inference
3  Sashibo / tail / both  7  Review or override
4  Weight (max 200 kg)    8  Print receipt
```

Same-fish vs different-fish is asked when both cuts are selected. After **two sessions in 30 minutes**, that grader skips the placement tutorial. **Grade another** keeps the grader and returns to sample select.

---

## Station notes

<p>
<img src="public/assets/mobile%20app%20qr.png" width="140" align="right" alt="Install QR" />
</p>

- **Install** — landing QR, or browser **Install app / Add to Home Screen**
- **Cameras** — lists every device camera; allow permission, then reload if blocked
- **Admin PIN** — `1234` (change before production)
- **Overrides** — PIN-gated; original model confidence is kept
- **Print** — 58 mm thermal receipt / print layout
- **Offline** — JPEG evidence in IndexedDB; metadata local until sync, with per-grader selective sync from Welcome

<br clear="all" />

---

## Repo map

| Path | What it is |
| --- | --- |
| `src/MarketingLanding.tsx` | Public site |
| `src/App.tsx` | Kiosk workflow |
| `src/kioskState.ts` | Session reducer |
| `public/` | PWA, `assets/applogo.svg`, `kiosk-screens/`, install QR |
| `ARCHITECTURE.md` | Pi / cloud contracts |
| `FEATURES.md` | Feature inventory |

Without Pi or cloud credentials, records stay on the device with a retryable sync state. Phone clients must use the same Supabase project as `docs/SHARED_SUPABASE_CONTRACT.md`.
