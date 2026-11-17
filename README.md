<p align="center">
  <img src="public/tunaeye-logo.svg" width="92" alt="TunaEye logo" />
</p>

<h1 align="center">Sea Beyond the Cut.</h1>

<p align="center">
  <strong>We don't replace the expert eye. We extend its reach.</strong>
</p>

<p align="center">
  Built on expert knowledge. Enhanced by computer vision.<br />
  Designed to extend the reach of human expertise.
</p>

<p align="center">
  <img alt="Node 20+" src="https://img.shields.io/badge/Node-20%2B-2769eb?style=for-the-badge&labelColor=103b70" />
  <img alt="Vite + React" src="https://img.shields.io/badge/Vite-React-1e5fd9?style=for-the-badge&labelColor=103b70" />
  <img alt="PWA kiosk" src="https://img.shields.io/badge/PWA-Kiosk-5dbbf3?style=for-the-badge&labelColor=103b70" />
  <img alt="Yellowfin" src="https://img.shields.io/badge/Species-Yellowfin-0ea5e9?style=for-the-badge&labelColor=103b70" />
</p>

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
| **Public landing** | Brand, install, station story |
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
- **Print** — 80 mm receipt layout via the OS print dialog
- **Offline** — JPEG evidence in IndexedDB; metadata local until sync

<br clear="all" />

---

## Repo map

| Path | What it is |
| --- | --- |
| `src/MarketingLanding.tsx` | Public site |
| `src/App.tsx` | Kiosk workflow |
| `src/kioskState.ts` | Session reducer |
| `public/` | PWA, icons, samples, install QR |
| `ARCHITECTURE.md` | Pi / cloud contracts |
| `FEATURES.md` | Feature inventory |

Without Pi or cloud credentials, records stay on the device with a retryable sync state. Phone clients must use the same Supabase project as `docs/SHARED_SUPABASE_CONTRACT.md`.
