# Live readiness and administrator PIN

The Live Mode checklist runs only after an explicit operator action. It checks the configured Pi `/status`, decodes a real `/snapshot`, reads explicit `models.sashibocore` and `models.tailcut` booleans, writes/reads a temporary browser evidence store, and calls `/local-api/health` to confirm SQLite can write/read a probe inside a rolled-back savepoint. The probe creates no grading record. A LAN connection can pass without internet. Missing model flags block readiness rather than inventing a ready status. Retry does not submit grading or cloud records. The backend must answer:

```json
{"service":"TunaEye Flask","models":{"sashibocore":true,"tailcut":true}}
```

`1234` is supported only on development loopback when no custom PIN is configured. Production must provision `VITE_ADMIN_PIN_SALT` and `VITE_ADMIN_PIN_HASH` before building. The hash is PBKDF2-HMAC-SHA256, 120,000 iterations, 32 bytes, UTF-8 salt and PIN, hex encoded. Generate the salt and hash offline:

```python
import getpass, hashlib, secrets
salt = secrets.token_hex(16)
pin = getpass.getpass('Choose four-digit station PIN: ')
assert len(pin) == 4 and pin.isascii() and pin.isdigit()
print('VITE_ADMIN_PIN_SALT=' + salt)
print('VITE_ADMIN_PIN_HASH=' + hashlib.pbkdf2_hmac('sha256', pin.encode(), salt.encode(), 120000).hex())
```

After authenticating, Admin Settings can rotate the PIN locally. Only a salted hash is retained, not the PIN. Five wrong attempts impose a one-minute cooldown. Keep deployment provisioning values available for recovery after browser storage is cleared. A browser PIN controls the kiosk's local interface; enforce data access independently at the backend and Supabase RLS. Hosted deployments retain their separate administrator-profile authorization. A Pi-local offline station does not depend on a cloud round trip for local administrator access.

Physical Wi-Fi association, hardware camera quality, true model loading, and actual server authorization still require station validation. `/status` must report real backend model state.
