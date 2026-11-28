# Raspberry Pi Offline HTTPS & Station Token Setup (Item #10)

Run this guide when you have your **Raspberry Pi 5** and **Android kiosk tablet** together. It upgrades your station from plain `http://10.42.0.1` to trusted **100% offline HTTPS (`https://10.42.0.1`)** with **device-token API protection**.

### What this unlocks
- **Web Bluetooth 58mm thermal printing** works natively on Android Chrome (no `chrome://flags` workaround needed).
- **PWA Service Worker offline caching** and **Web Crypto (`crypto.subtle`)** work without insecure-origin warnings.
- **Zero unauthorized LAN access:** only your kiosk can call `/grade`, `/snapshot`, or `/stream`, and port `5000` is locked to `127.0.0.1`.

---

## Architecture After Setup

```text
Android Tablet (https://10.42.0.1)
        │  TLS (trusted via one-time local Root CA)
        │  Header: X-TunaEye-Token: <STATION_TOKEN>
        ▼
Caddy Reverse Proxy on Raspberry Pi (:443 -> 127.0.0.1:3000)
        ▼
server/station.py (127.0.0.1:3000)
   ├── Serves dist/ PWA + /local-api/* (SQLite WAL)
   └── Proxies /status, /snapshot, /stream, /grade -> 127.0.0.1:5000 (Pi CNN service)
```

---

## Step 1 — Generate Offline HTTPS Certificates on the Raspberry Pi (`mkcert`)

SSH into the Raspberry Pi (e.g. `ssh pi@10.42.0.1`) while it temporarily has internet once to install `mkcert` and `caddy`:

```bash
# 1. Install mkcert (ARM64 Raspberry Pi OS)
sudo apt update
sudo apt install -y libnss3-tools curl
curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/arm64"
chmod +x mkcert-v*-linux-arm64
sudo mv mkcert-v*-linux-arm64 /usr/local/bin/mkcert

# 2. Initialize local Certificate Authority (CA)
mkcert -install

# 3. Generate cert for the Pi hotspot IP + hostname
sudo mkdir -p /etc/tunaeye/certs
cd /etc/tunaeye/certs
sudo mkcert -cert-file tunaeye.pem -key-file tunaeye-key.pem 10.42.0.1 tunaeye.local localhost 127.0.0.1
sudo chmod 644 /etc/tunaeye/certs/tunaeye.pem
sudo chmod 600 /etc/tunaeye/certs/tunaeye-key.pem

# 4. Copy the Root CA file somewhere easy to transfer to your Android tablet
cp "$(mkcert -CAROOT)/rootCA.pem" ~/tunaeye-rootCA.crt
```

---

## Step 2 — Install & Configure Caddy Reverse Proxy

```bash
# Install Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

Create `/etc/caddy/Caddyfile`:

```caddyfile
https://10.42.0.1, https://tunaeye.local {
    tls /etc/tunaeye/certs/tunaeye.pem /etc/tunaeye/certs/tunaeye-key.pem
    reverse_proxy 127.0.0.1:3000
}

http://10.42.0.1, http://tunaeye.local {
    redir https://{host}{uri} permanent
}
```

Ensure Caddy can read the cert files and restart it:

```bash
sudo chown -R caddy:caddy /etc/tunaeye/certs
sudo systemctl enable --now caddy
sudo systemctl reload caddy
```

> **Tip:** Run `server/station.py` bound to loopback only (`--host 127.0.0.1 --port 3000`) and bind your Pi CNN inference service to `127.0.0.1:5000` so all external Wi-Fi traffic must pass through HTTPS on Caddy.

---

## Step 3 — Lock Down the Pi Inference API with a Station Token

Generate a strong random station token on the Pi:

```bash
openssl rand -hex 24
```

### On the Raspberry Pi inference service (Flask example)
Add a `before_request` check so requests without the token are rejected with `401 Unauthorized`:

```python
import hmac, os
from flask import request, jsonify

STATION_TOKEN = os.environ.get("TUNAEYE_API_TOKEN", "").strip()

@app.before_request
def require_station_token():
    if not STATION_TOKEN:
        return None
    if request.path in ("/status", "/snapshot", "/stream", "/grade"):
        supplied = request.headers.get("X-TunaEye-Token", "")
        if not hmac.compare_digest(supplied, STATION_TOKEN):
            return jsonify({"error": "unauthorized"}), 401
```

### FastAPI equivalent
```python
import hmac, os
from fastapi import Request
from fastapi.responses import JSONResponse

STATION_TOKEN = os.environ.get("TUNAEYE_API_TOKEN", "").strip()

@app.middleware("http")
async def require_station_token(request: Request, call_next):
    if STATION_TOKEN and request.url.path in ("/status", "/snapshot", "/stream", "/grade"):
        supplied = request.headers.get("X-TunaEye-Token", "")
        if not hmac.compare_digest(supplied, STATION_TOKEN):
            return JSONResponse({"error": "unauthorized"}, status_code=401)
    return await call_next(request)
```

Add the token to your Pi systemd service unit (e.g., `/etc/systemd/system/tunaeye-inference.service`):

```ini
[Service]
Environment="TUNAEYE_API_TOKEN=YOUR_GENERATED_HEX_TOKEN"
```

Then reload:
```bash
sudo systemctl daemon-reload
sudo systemctl restart tunaeye-inference
```

> **Kiosk side (tell Antigravity when you're ready):** When you're ready to enable token enforcement, ask to wire `X-TunaEye-Token` (`VITE_PI_API_TOKEN` + Admin Settings field) in `src/piClient.ts` and `server/station.py`.

---

## Step 4 — Trust the Local Root CA on Your Android Kiosk Tablet (One-Time)

1. Transfer `~/tunaeye-rootCA.crt` from the Pi to the Android tablet (USB cable, ADB push, or temporary HTTP download before disabling HTTP).
2. On the Android tablet:
   - Open **Settings → Security & privacy → More security settings → Encryption & credentials**.
   - Tap **Install a certificate → CA certificate → Install anyway**.
   - Select `tunaeye-rootCA.crt`.
3. Connect the tablet to the `TunaRpi` Wi-Fi hotspot and open **`https://10.42.0.1`** in Chrome.
4. Confirm there is **no certificate warning** and Chrome shows a valid HTTPS connection.

---

## Step 5 — Check the Raspberry Pi 5 RTC Clock (for Offline TOTP 2FA)

Because Offline TOTP 2FA uses 30-second time windows (±30s tolerance), verify the Pi keeps accurate time offline:

```bash
timedatectl status
ls -l /dev/rtc*
```

- If you have the **Raspberry Pi 5 RTC coin-cell battery** installed, the Pi preserves accurate UTC time across power cuts with zero internet.
- On the Android tablet, verify date/time is synced within ~15 seconds of your authenticator phone before going offline.

---

## Step 6 — On-Device Verification Checklist

Run these checks once you have the Pi in hand:

- [ ] `curl -k https://10.42.0.1/local-api/health` returns `{"sqlite": "ready", "writable": true}`
- [ ] `curl -k -i https://10.42.0.1/status` returns `401` without `X-TunaEye-Token` (once token is enabled)
- [ ] `curl -k -H "X-TunaEye-Token: <TOKEN>" https://10.42.0.1/status` returns `200` with model metadata
- [ ] Tablet Chrome opens `https://10.42.0.1` with **no SSL warning** while completely offline
- [ ] **Install app / Add to Home Screen** works and reloads cleanly with Wi-Fi airplane mode / offline
- [ ] **Pair BT Printer** connects to the 58mm Bluetooth thermal printer natively without `chrome://flags`
- [ ] **Offline TOTP 2FA** scans the Admin QR code on a phone and authorizes a test override completely offline
