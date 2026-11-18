import { launchExactUI } from './exact-ui'
import { restoreSqliteRecords } from './gradingRecords'
import { showLoadingDial } from './exact-loading'
void showLoadingDial('Opening TunaEye', restoreSqliteRecords())
  .then(() => launchExactUI(false))
  .catch(error => {
    console.error('TunaEye startup failed:', error)
    document.body.innerHTML = '<main style="min-height:100dvh;display:grid;place-items:center;padding:24px;background:#f4f7ff;font-family:system-ui,sans-serif;color:#182842"><section style="max-width:440px;padding:28px;border-radius:24px;background:#fff;border:1px solid #dce6f6;text-align:center"><h1 style="margin:0 0 8px;font-size:22px">TunaEye could not load</h1><p style="margin:0 0 18px;font-size:14px;color:#5b6b84">Please reload the page to try again.</p><button onclick="location.reload()" style="height:44px;padding:0 22px;border-radius:999px;border:0;background:#2563ff;color:#fff;font:600 14px system-ui,sans-serif;cursor:pointer">Reload</button></section></main>'
  })
window.addEventListener('online', () => { void restoreSqliteRecords() })
