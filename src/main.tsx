import { launchExactUI } from './exact-ui'
import { restoreSqliteRecords } from './gradingRecords'
import { showLoadingDial } from './exact-loading'
void showLoadingDial('Opening TunaEye', restoreSqliteRecords()).then(() => launchExactUI(false))
window.addEventListener('online', () => { void restoreSqliteRecords() })
