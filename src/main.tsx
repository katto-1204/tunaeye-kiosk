import { launchExactUI } from './exact-ui'
import { restoreSqliteRecords } from './gradingRecords'
void restoreSqliteRecords().finally(launchExactUI)
