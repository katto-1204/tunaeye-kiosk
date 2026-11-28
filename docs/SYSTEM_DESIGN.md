# TunaEye — Actual System Design & Data Flows

This document reflects the **real implemented TunaEye architecture** — where the **Admin Console lives inside the Kiosk Tablet**, inference + SQLite durability run **100% offline on the Raspberry Pi 5**, overrides use **per-expert PIN + 100% offline TOTP 2FA**, and **Supabase Cloud** syncs records, images, and append-only audit logs whenever internet returns.

---

## 1. End-to-End Architecture

```mermaid
flowchart LR
  subgraph EDGE["1. Dockside Hardware & Raspberry Pi 5 Edge (100% Offline LAN)"]
    CAM["5000K Chamber + Pi Camera"]
    CADDY["Caddy HTTPS (:443)"]
    STATION["server/station.py (:3000)\nStatic PWA + /local-api/*"]
    SQLITE[("SQLite WAL\ndata/tunaeye.sqlite3\nrecords · evidence · station_state")]
    CNN["ONNX CNN Service (:5000)\nSashibo Core + Tail-Cut"]
    CAM -->|"Live Feed / Snapshot"| CNN
    CADDY --> STATION
    STATION --> SQLITE
    STATION -->|"/status /snapshot /stream /grade"| CNN
  end

  subgraph KIOSK["2. TunaEye Kiosk Tablet (Installable Offline PWA)"]
    OP["Operator Grading UI\nWeight 15–200kg · Food Safety Footer\n75% Gate · Flagged Grade Card"]
    ADM["Embedded Admin Console (PIN-Gated)\nOverview · Records · Prices\nExpert Graders + QR 2FA Setup\nDiagnostics · Audit Logs · Settings"]
    LOCAL[("Browser Local Layer\nIndexedDB Image Outbox\nlocalStorage + SW Cache")]
    OP --- LOCAL
    ADM --- LOCAL
  end

  subgraph PERIPH["Station Peripherals (Zero Internet)"]
    PHONE["Expert Grader Phone\nGoogle Auth / Authy\n6-Digit TOTP (30s)"]
    PRINTER["58mm BT Thermal Printer\nFish Receipts + 5 Backup 2FA Codes"]
  end

  subgraph CLOUD["3. Supabase Cloud (Sync When Online)"]
    PG[("PostgreSQL + RLS\ngrading_records · price_schedules\nstation_graders · audit_logs")]
    BUCKET[("Private Storage Bucket\ngrading-images")]
  end

  MOBILE["TunaEyePhone Mobile App\nShared Supabase Contract"]

  CADDY <-->|"HTTPS LAN\n/grade · /snapshot · /local-api/*"| KIOSK
  ADM -.->|"One-Time Local SVG QR\n(otpauth://totp/...)"| PHONE
  PHONE -->|"Factor 1: Personal PIN\nFactor 2: 6-Digit TOTP"| OP
  KIOSK -->|"Web Bluetooth ESC/POS"| PRINTER
  LOCAL -->|"Auto / Manual Sync\n(Chunks of 50)"| PG
  LOCAL -->|"Upload JPEG Blobs"| BUCKET
  CLOUD <-->|"Cloud Sync & Field Review"| MOBILE
```

---

## 2. Dynamic Flow — Scanning, Decision Gate & Offline TOTP 2FA Override

```mermaid
sequenceDiagram
  autonumber
  actor Op as Station Operator
  participant Kiosk as TunaEye Kiosk Tablet
  participant Pi as Raspberry Pi 5 (CNN + SQLite)
  actor Expert as Registered Expert Grader
  participant Auth as Expert's Phone (Offline TOTP)
  participant BT as 58mm BT Printer

  Op->>Kiosk: Enter Name & Fish Weight (15–200 kg)
  Note over Op,Kiosk: Food Safety Notice visible in footer bar
  Op->>Kiosk: Capture Sashibo Core
  Kiosk->>Pi: POST /grade (image_type=sashibocore)
  Pi-->>Kiosk: Grade + Confidence + Score Vector
  Kiosk->>Pi: POST /local-api/records (Save to SQLite WAL + IndexedDB)

  alt Core is A or B and Confidence >= 75%
    Kiosk-->>Op: Green/Amber Final Grade Card -> Print Receipt
  else Core < 75% or Grade C
    Kiosk-->>Op: Prompt Tail-Cut (or No Tail-Cut Provisional)
    Op->>Kiosk: Capture Tail-Cut
    Kiosk->>Pi: POST /grade (image_type=tailcut)
    Pi-->>Kiosk: Tail Grade + Confidence + Score Vector
    alt Avg < 75% or Severe Disagreement (A vs C)
      Kiosk-->>Op: Normal Grade Card + "FLAGGED FOR MANUAL OVERRIDE" Chip
      Op->>Kiosk: Tap Override & Select Registered Expert Grader
      Expert->>Auth: Read 6-digit Offline TOTP (or Recovery Code)
      Expert->>Kiosk: Enter Personal 4-digit PIN + 6-digit TOTP
      Note over Kiosk: Verifies PBKDF2 PIN + RFC 6238 HMAC-SHA1 (±30s)\n100% Offline — Zero Internet Needed
      Kiosk->>Pi: Save Override + Audit Entry (SQLite WAL)
    end
  end

  Kiosk->>BT: ESC/POS 58mm Receipt (Operator + Expert Override + Food Safety Footer)
```

---

## 3. Offline Durability & Cloud Sync Lifecycle

1. **Immediate Local Write (Zero Data Loss Offline):**
   - Captured image blobs save to **IndexedDB (`tunaeye-offline`)** and mirror to **SQLite WAL (`data/tunaeye.sqlite3` `evidence` table)**.
   - Grading records, Expert Graders (salted PBKDF2 PIN hashes + TOTP secrets + hashed recovery codes), Admin PIN, Price Schedule, Settings, and Audit Logs mirror to **SQLite WAL (`records` + `station_state` tables)** via `/local-api/*`.
   - If browser cache is cleared, startup (`restoreSqliteRecords()` + `restoreSqliteStationState()`) automatically restores everything from the Pi's SQLite database.
2. **Automatic or Manual Cloud Sync (When Wi-Fi Returns):**
   - Triggered on `window` `online` event (when **Auto-sync when online** is ON in Admin Settings) or manually via **Sync now**.
   - Drains the **entire pending queue in chunks of 50**, uploads evidence blobs to private bucket `grading-images`, verifies PostgreSQL read-back field equality, and uploads unsynced entries to append-only `public.audit_logs`.
