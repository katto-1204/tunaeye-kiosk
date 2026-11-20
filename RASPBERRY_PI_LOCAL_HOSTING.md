    # TunaEye local Raspberry Pi hosting

## Build on Windows

The Pi build is separate from the normal Vercel build:

```powershell
npm install
npm run build:pi
```

`build:pi` runs TypeScript and Vite with `.env.pi`:

```env
VITE_PI_LOCAL_HOSTED=true
VITE_DEMO_MODE=false
```

The resulting `dist/` uses these same-origin endpoints:

- `GET /status`
- `GET /snapshot`
- `GET /stream`
- `POST /grade`

The current build also avoids service-worker caching on `localhost` and
`10.42.0.1` development/diagnostic pages. This prevents an old hashed
JavaScript bundle from producing a white screen after a rebuild.

The normal `npm run build` remains the Vercel build. It never falls back from HTTPS to the Pi's HTTP address. Configure an authenticated `VITE_PI_GATEWAY_URL` as described in `docs/VERCEL_CAMERA_GATEWAY.md`, or the hosted PWA displays connection guidance.

## Transfer the build

Connect the development computer to `TunaRpi`, then run from the repository root:

```powershell
ssh tunarpi@10.42.0.1 "if [ -d /home/tunarpi/rpi-cam-demo/pwa_build ]; then mv /home/tunarpi/rpi-cam-demo/pwa_build /home/tunarpi/rpi-cam-demo/pwa_build.backup; fi; mkdir -p /home/tunarpi/rpi-cam-demo/pwa_build"
scp -r .\dist\* tunarpi@10.42.0.1:/home/tunarpi/rpi-cam-demo/pwa_build/
```

If `pwa_build.backup` already exists, rename or remove that old backup first. The move keeps the previous deployment recoverable.

## Flask static and SPA routing

Keep the existing `/status`, `/snapshot`, `/stream`, and `/grade` routes. Add the static fallback after those API routes:

```python
from pathlib import Path
from flask import send_from_directory

PWA_BUILD = Path('/home/tunarpi/rpi-cam-demo/pwa_build')

@app.get('/')
def pwa_index():
    return send_from_directory(PWA_BUILD, 'index.html')

@app.get('/<path:path>')
def pwa_files(path):
    requested = PWA_BUILD / path
    if requested.is_file():
        response = send_from_directory(PWA_BUILD, path)
        if path == 'sw.js':
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        return response
    return send_from_directory(PWA_BUILD, 'index.html')
```

This serves hashed Vite files under `/assets/` and returns `index.html` for routes such as `/kiosk/camera`. Do not let the SPA fallback replace the four API routes.

The Flask app on port 5000 must expose or proxy both camera endpoints. JavaScript no longer calls port 8080 directly in Pi mode:

```text
http://10.42.0.1:5000/snapshot
http://10.42.0.1:5000/stream
```

After copying, restart the existing Flask service and open:

```text
http://10.42.0.1:5000/
```

If the browser still shows a white page after a redeploy, clear the old
service worker and site data once, then reload:

1. Open DevTools > Application > Storage.
2. Click **Clear site data** and unregister the TunaEye service worker.
3. Close the tab, reopen `http://10.42.0.1:5000/`, and use a hard reload.

## HTTP LAN limitations

Plain `http://10.42.0.1:5000` is not a secure browser context:

- Service-worker registration and reliable PWA installation/offline shell caching are unavailable on most tablet browsers. HTTPS or localhost is required.
- IndexedDB and localStorage normally work, but storage is origin-scoped and may be cleared by browser storage policies. Request persistent storage only after moving to HTTPS.
- Web Serial and Web Bluetooth require a secure context, so scale/printer pairing through those APIs may be unavailable.
- Camera preview, snapshot fetch, Flask inference, local IndexedDB records, and later Supabase synchronization do not require service-worker control.
- Session/audit IDs use `crypto.getRandomValues()` when `crypto.randomUUID()` is unavailable on HTTP.

For full installability and hardware-browser APIs, terminate HTTPS on the Pi and continue proxying the same four paths through the same origin.

## Pi verification

```bash
curl http://10.42.0.1:5000/status
curl -o snapshot.jpg http://10.42.0.1:5000/snapshot
curl -X POST http://10.42.0.1:5000/grade \
  -F 'image_type=sashibocore' \
  -F 'image=@snapshot.jpg;type=image/jpeg'
```

Then verify `/stream` in the tablet, complete one Sashibo and one Tail-Cut workflow, disconnect upstream internet while keeping `TunaRpi`, and confirm records remain pending locally.
