import { loadRecords, saveRecords, type GradingRecord } from './gradingRecords'
import { getCapturedEvidence, deleteCapturedEvidence } from './evidenceStorage'
import { fetchCloudGraders, fetchCloudRecords, syncGradersToCloud, syncPendingRecords, syncPriceSchedule } from './cloudSync'
import { loadPriceSchedule, peso } from './pricing'
import { capturePiImage, checkPiHealth, getPiSettings } from './piClient'
import { getSupabase, isSupabaseConfigured, sendAdminMagicLink } from './supabase'
import type { Grade } from './kioskState'
import { createId } from './id'
import { isDemoMode } from './demoMode'
import { mountTechnicalPanel } from './exact-technical'
import { disableExpertTotp, enableExpertTotp, ensureSeededExpertGraders, listExpertGradersSync, registerExpertGrader, removeExpertGrader, type ExpertGrader } from './expertGraders'
import { buildOtpAuthUri, formatBase32Secret, generateRecoveryCodes, generateTotpSecret, printRecoveryCodesSlip, renderQrSvg } from './offlineTotp'
import { queueSqliteState } from './sqliteStore'

type Context = { refresh: () => void; notice: (text: string, error?: boolean) => void; setDemo: (enabled: boolean) => void }
type TimeRange = 'all' | 'month' | 'week' | 'today' | 'yesterday' | 'hour' | 'older'
type View = { query: string; page: number; range: TimeRange; cloud: GradingRecord[]; lastCloudSyncAt?: number; syncingCloud?: boolean }
const views = new WeakMap<Window, View>()
const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
const read = <T>(key: string, fallback: T): T => { try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback } catch { return fallback } }
const audit = (action: string, detail: string) => {
  const payload = JSON.stringify([{ id: createId(), timestamp: Date.now(), actor: 'Admin', action, detail }, ...read<unknown[]>('tunaeye-audit-log', [])].slice(0, 500))
  localStorage.setItem('tunaeye-audit-log', payload)
  queueSqliteState('tunaeye-audit-log', payload)
}
const style = `
.ad{background:#f7f8fb;color:#182842;font-family:Inter,system-ui,sans-serif}.ax .ad .as{width:190px;background:#fff;border-right:1px solid #eef1f6;box-shadow:none;padding:28px 14px;gap:7px}.ad .br2{color:#182842;padding:0 6px 30px}.ad .br2 small{color:#8491a5}.ad .br2 i{background:#edf3ff}.ax .ad .an{height:46px;min-height:46px;color:#738198;font-weight:500;border-radius:14px;font-size:14px}.ax .ad .an:hover{background:#f3f6fc;color:#2159e8}.ax .ad .an.on{background:#edf3ff;color:#2159e8;box-shadow:none}.ax .ad .an.on svg{color:#2159e8}.ad .as>[style]{color:#8491a5!important}.ad .am{background:#f7f8fb;padding:28px 26px 0}.ad .ah{align-items:center;padding-bottom:24px}.ad .ah h1{font:600 28px/1.2 Inter,system-ui,sans-serif;letter-spacing:-.035em;color:#182842}.ad .ah .xm{font-size:13px;color:#8491a5;margin-top:7px}.ad .ah .xpr{border-radius:999px;font-size:14px;height:44px;padding:0 20px;font-weight:600;box-shadow:none}.ad .ah .xbn{border-radius:999px;font-size:14px;height:44px;font-weight:500}.ea .ea-metric{padding:22px 18px;min-height:125px;position:relative}.ea-metric strong{display:block;margin-top:16px;font-weight:600;font-size:30px}.ea-metric:first-child{background:linear-gradient(120deg,#1959ec,#538cfb);color:#fff;border-color:transparent;box-shadow:0 12px 24px -16px #2159e8}.ea-metric:first-child small{color:#e1ebff}.ea-metric small{font-size:12px}.ea-metric .ea-metric-mark{position:absolute;right:16px;top:17px;background:#f2f6ff;border-radius:50%;width:28px;height:28px;display:grid;place-items:center;color:#3773ee;font-size:14px}.ea-overview-charts{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(0,1fr);gap:18px}.ea-chart{height:166px;display:flex;gap:14px;align-items:end;padding-top:12px;background:repeating-linear-gradient(to top,transparent 0,transparent 39px,#f1f3f8 40px)}.ea-day{flex:1;display:flex;align-items:center;flex-direction:column;gap:8px;min-width:0}.ea-day i{display:block;width:70%;max-width:48px;border-radius:9px 9px 4px 4px;background:linear-gradient(#347af5,#d9e7ff);min-height:3px}.ea-day b,.ea-day small{font-size:11px;color:#8190a5;font-weight:500}.ea-grade-ring{margin:14px auto;width:116px;height:116px;border-radius:50%;display:grid;place-content:center;text-align:center;background:radial-gradient(circle,#fff 58%,transparent 59%),conic-gradient(#2264ee var(--grade-a),#8bb3ff 0 var(--grade-b),#d9e6fc 0 var(--grade-valid),#e9edf3 0)}.ea-grade-ring strong{font-size:26px;font-weight:600;line-height:1.2}.ea-grade-ring small{font-size:10px;color:#8491a5}.ea-grade-legend{display:flex;justify-content:space-around;gap:8px;font-size:12px;color:#71809a}.ea-grade-legend b{display:block;color:#182842;font-size:15px}.ea-overview-charts .ea-card>p{font-size:12px;margin-bottom:0}.ea .ea-card h2{font-family:Inter,system-ui,sans-serif;letter-spacing:-.025em}.ea th{text-align:left}.ea thead{background:#f8f9fc}.ea .et{margin-top:4px}.ea .et> .ea-row p{font-size:13px}.ea .et h2{font-size:20px}.ea-filter-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.ea-filter-bar button{min-height:36px;padding:6px 14px;font-size:13px;background:#fff;border:1px solid #dce6f6;color:#475569}.ea-filter-bar button.is-active{background:#2159e8;border-color:#2159e8;color:#fff}
@media(max-width:1050px){.ad .ah h1{font-size:26px}.ad .am{padding:22px 20px 0}.ea-overview-charts{grid-template-columns:1.4fr 1fr}.ea .ea-metric{min-height:110px}.ea-metric strong{font-size:28px}}@media(max-width:700px){.ea-overview-charts{grid-template-columns:1fr}}
.ea{font:15px Inter,system-ui,sans-serif;line-height:1.5;display:grid;gap:18px;padding-bottom:24px}.ea h2{font-size:20px;font-weight:600;letter-spacing:-.025em;margin:0 0 8px}.ea h3{font-size:17px;margin:0 0 12px}.ea p{color:#64738d;margin:0 0 16px}.ea-card{background:#fff;border:1px solid #eef1f6;border-radius:22px;padding:24px;box-shadow:0 6px 24px -16px #16316525}.ea-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.ea-metric small{display:block;color:#64738d}.ea-metric strong{font-size:34px;font-weight:500;letter-spacing:-.04em}.ea-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.ea-row.between{justify-content:space-between}.ea button{min-height:44px;padding:10px 18px;border-radius:999px;background:#edf3ff;border:1px solid #dce6f6;color:#0b45e5;font:600 14px Inter,system-ui;cursor:pointer}.ea button.primary{background:linear-gradient(135deg,#3b8bff,#0b45e5);color:white;border-color:transparent}.ea button:disabled{opacity:.45;cursor:default}.ea input,.ea select{min-height:48px;border-radius:15px;border:1px solid #cbd9ef;background:#fff;padding:10px 14px;font:16px Inter,system-ui;color:#0b1a3a;max-width:100%;min-width:0}.ea input[type=search]{flex:1;min-width:220px}.ea label{display:grid;gap:8px;color:#64738d}.ea-form{display:grid;grid-template-columns:1fr 1fr;gap:18px}.ea table{width:100%;border-collapse:collapse;table-layout:fixed}.ea th{font-size:12px;font-weight:600;color:#64738d;text-transform:uppercase;padding:12px 8px;letter-spacing:.04em}.ea td{padding:14px 8px;border-top:1px solid #e3eaf8;overflow-wrap:anywhere;font-size:14px;vertical-align:middle}.ea td small{display:block;font-size:12px;color:#64738d}.ea-badge{display:inline-block;border-radius:999px;padding:5px 10px;background:#edf3ff;color:#0b45e5;font-size:12px}.ea-badge.synced{background:#eafaf3;color:#08734b}.ea-badge.failed{background:#fff0eb;color:#ac3b24}.ea-pages{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:18px}.ea-bar{height:12px;border-radius:8px;background:#e8f0ff;overflow:hidden}.ea-bar i{display:block;height:100%;background:linear-gradient(90deg,#7db7fb,#1b6cf0)}.ea-logs>div{padding:14px 0;border-top:1px solid #e3eaf8}.ea-logs small{display:block;color:#64738d}.ea-detail{width:min(720px,95%);max-height:90%;overflow:auto;padding:26px;border-radius:24px;gap:14px}.ea-detail img{width:100%;max-height:240px;object-fit:contain;border-radius:16px;background:#eef4ff}.ea-detail dl{display:grid;grid-template-columns:160px 1fr;gap:0;margin:4px 0 0;border-top:1px solid #e6edf8}.ea-detail dt,.ea-detail dd{margin:0;padding:10px 4px;border-bottom:1px solid #eef2f9;font-size:14px;overflow-wrap:anywhere}.ea-detail dt{color:#64738d;font-weight:500}.ea-detail dd{color:#182842;font-weight:500}.ea-empty{padding:36px;text-align:center;color:#64738d}.ea :focus-visible{outline:3px solid #1b6cf0;outline-offset:3px}
.ea-filter-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.ea-filter-bar button{min-height:36px;padding:6px 14px;font-size:13px;background:#fff;border:1px solid #dce6f6;color:#475569}.ea-filter-bar button.is-active{background:#2159e8;border-color:#2159e8;color:#fff}
@media(max-width:1050px){.ea-card{padding:18px}.ea-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.ea td,.ea th{padding:10px 5px;font-size:12px}.ea .ea-record-id{max-width:140px}.ea-metric strong{font-size:26px}.ea .ea-metric{padding:18px 14px}.ea-metric .ea-metric-mark{display:none}}@media(max-width:700px){.ea-form{grid-template-columns:1fr}.ea-grid{grid-template-columns:1fr 1fr}.ea-metric strong{font-size:28px}.ea table{min-width:600px}.ea-table-wrap{overflow:auto}}
`

export function enhanceAdmin(w: Window, context: Context) {
  const d = w.document, state = (w as Window & { eval: (s: string) => any }).eval('S'), body = d.querySelector<HTMLElement>('.ab2')
  if (!body || state.scr !== 'admin') return
  if (!d.getElementById('exact-admin-style')) { const e = d.createElement('style'); e.id = 'exact-admin-style'; e.textContent = style; d.head.append(e) }
  let view = views.get(w); if (!view) { view = { query: '', page: 1, range: 'all', cloud: [] }; views.set(w, view) }
  const v = view, combined = new Map<string, GradingRecord>()
  if (navigator.onLine && isSupabaseConfigured() && !v.syncingCloud && Date.now() - (v.lastCloudSyncAt ?? 0) >= 60_000) {
    v.syncingCloud = true; v.lastCloudSyncAt = Date.now()
    void (async () => {
      try {
        await syncPendingRecords({ limit: 10 }).catch(() => null)
        const localGraders = read<string[]>('tunaeye-graders', [])
        if (localGraders.length) await syncGradersToCloud(localGraders)
        const [cloudRows, cloudGraders] = await Promise.all([fetchCloudRecords(200), fetchCloudGraders()])
        v.cloud = cloudRows
        if (cloudGraders.length) {
          const merged = [...localGraders]
          const seen = new Set(merged.map(g => g.trim().toLocaleLowerCase()))
          for (const g of cloudGraders) if (!seen.has(g.toLocaleLowerCase())) { seen.add(g.toLocaleLowerCase()); merged.push(g) }
          localStorage.setItem('tunaeye-graders', JSON.stringify(merged))
        }
        if (w.document.body.contains(body)) enhanceAdmin(w, context)
      } catch { } finally { v.syncingCloud = false }
    })()
  }
  for (const record of [...v.cloud, ...loadRecords()]) combined.set(record.id, record)
  const records = [...combined.values()].sort((a, b) => b.timestamp - a.timestamp)
  const storedGraders = read<string[]>('tunaeye-graders', [])
  const seenGraders = new Set(storedGraders.map(g => g.trim().toLocaleLowerCase()))
  const activeGrader = typeof state.name === 'string' ? state.name.trim() : ''
  const extraGraders = [activeGrader, ...records.map(r => r.grader.trim())].filter(name => {
    if (!name) return false
    const key = name.toLocaleLowerCase()
    if (seenGraders.has(key)) return false
    seenGraders.add(key)
    return true
  })
  const graders = [...storedGraders, ...extraGraders]
  if (extraGraders.length) localStorage.setItem('tunaeye-graders', JSON.stringify(graders))
  if (localStorage.getItem('tunaeye-expert-graders-v1') === null) {
    void ensureSeededExpertGraders().then(() => { if (w.document.body.contains(body)) enhanceAdmin(w, context) })
  }
  const expertGraders = listExpertGradersSync()
  const expertNameSet = new Set(expertGraders.map(e => e.name.trim().toLocaleLowerCase()))
  const scanOnlyOperators = graders.filter(name => !expertNameSet.has(name.trim().toLocaleLowerCase()))
  const draw = () => enhanceAdmin(w, context)
  const saveGraders = (next: string[]) => { const payload = JSON.stringify(next); localStorage.setItem('tunaeye-graders', payload); queueSqliteState('tunaeye-graders', payload); draw() }
  const button = (id: string, label: string, primary = false) => `<button id="${id}" class="${primary ? 'primary' : ''}" type="button">${label}</button>`
  const section = (title: string, content: string, intro = '') => `<section class="ea-card"><h2>${title}</h2>${intro ? `<p>${intro}</p>` : ''}${content}</section>`
  const empty = '<div class="ea-empty">No records yet. Completed captures remain on the station until you choose Sync now.</div>'
  const rowMarkup = (items: GradingRecord[]) => items.length ? `<div class="ea-table-wrap"><table><thead><tr><th style="width:32%">Record / grader</th><th>Sample</th><th>Weight</th><th>Grade / value</th><th>Image sync</th><th>Review</th></tr></thead><tbody>${items.map(row => `<tr><td class="ea-record-id"><div style="display:flex;align-items:center;gap:10px;min-width:0"><img data-thumb="${esc(row.id)}" alt="" style="width:38px;height:38px;border-radius:10px;object-fit:cover;background:#eef3ff;border:1px solid #e2e8f0;flex:none"><div style="min-width:0">${esc(row.id)}<small>${esc(row.grader)} · ${esc(new Date(row.timestamp).toLocaleString())}</small></div></div></td><td>${esc(row.sample)}</td><td>${esc(/^(?:nan|undefined|null|\s*)\s*kg$/i.test(row.weight) ? '—' : row.weight)}</td><td><b>${esc(row.grade)}</b><small>${esc(peso(row.transaction?.amount))}</small></td><td><span class="ea-badge ${esc(row.transaction?.syncState)}">${esc(row.transaction?.syncState === 'synced' ? 'Synced' : row.transaction?.syncState === 'failed' ? 'Retry needed' : 'Saved locally')}</span></td><td><button data-review="${esc(row.id)}" aria-label="Review ${esc(row.id)}">View</button></td></tr>`).join('')}</tbody></table></div>` : empty
  const rangeLabels: [TimeRange, string][] = [['all', 'All time'], ['month', 'Last month'], ['week', 'Last week'], ['today', 'Today'], ['yesterday', 'Yesterday'], ['hour', 'An hour ago'], ['older', 'Older (> 30d)']]
  const filterByRange = (items: GradingRecord[], range: TimeRange) => {
    const now = Date.now()
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    switch (range) {
      case 'hour': return items.filter(r => r.timestamp >= now - 3600000)
      case 'today': return items.filter(r => r.timestamp >= +todayStart)
      case 'yesterday': return items.filter(r => r.timestamp >= +todayStart - 86400000 && r.timestamp < +todayStart)
      case 'week': return items.filter(r => r.timestamp >= now - 7 * 86400000)
      case 'month': return items.filter(r => r.timestamp >= now - 30 * 86400000)
      case 'older': return items.filter(r => r.timestamp < now - 30 * 86400000)
      default: return items
    }
  }
  const rangeSessions = (range: TimeRange) => new Set(filterByRange(records, range).map(r => r.sessionId)).size
  const rangeBar = `<div class="ea-filter-bar" role="group" aria-label="Time filter">${rangeLabels.map(([key, label]) => `<button type="button" data-range="${key}" class="${v.range === key ? 'is-active' : ''}">${label} (${rangeSessions(key)})</button>`).join('')}</div>`
  const rangeLabelText = rangeLabels.find(([k]) => k === v.range)?.[1] ?? 'All time'
  const rangedRecords = filterByRange(records, v.range)
  let html = ''
  switch (state.tab) {
    case 'overview': {
      const weight = rangedRecords.reduce((sum, row) => sum + (parseFloat(row.weight) || 0), 0), pending = rangedRecords.filter(row => row.transaction?.syncState !== 'synced').length
      const metrics = [['Sessions', new Set(rangedRecords.map(row => row.sessionId)).size], ['Fish weight', `${weight.toFixed(1)} kg`], ['Pending sync', pending], ['Expert graders', expertGraders.length]]
      const days = Array.from({ length: 7 }, (_, i) => { const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - 6 + i); return { label: start.toLocaleDateString(undefined, { weekday: 'short' }), count: rangedRecords.filter(row => row.timestamp >= +start && row.timestamp < +start + 86400000).length } })
      const peak = Math.max(1, ...days.map(day => day.count))
      const gradeCount = (grade: string) => rangedRecords.filter(row => row.grade === grade).length
      const percent = (count: number) => rangedRecords.length ? count / rangedRecords.length * 100 : 0
      html = rangeBar + `<div class="ea-grid">${metrics.map(([label, value], i) => `<article class="ea-card ea-metric"><small>${label}</small><span class="ea-metric-mark" aria-hidden="true">${['↗', '≋', '↑', '◎'][i]}</span><strong>${value}</strong></article>`).join('')}</div><div class="ea-overview-charts">` + section('Weekly grading volume', `<div class="ea-chart" role="img" aria-label="Completed samples over the last seven days: ${days.map(day => `${day.label} ${day.count}`).join(', ')}">${days.map(day => `<div class="ea-day"><b>${day.count}</b><i style="height:${Math.max(3, day.count / peak * 100)}px"></i><small>${day.label}</small></div>`).join('')}</div>`, `Completed samples · ${rangeLabelText}`) + section('Grade distribution', `<div class="ea-grade-ring" style="--grade-a:${percent(gradeCount('A'))}%;--grade-b:${percent(gradeCount('A') + gradeCount('B'))}%;--grade-valid:${percent(gradeCount('A') + gradeCount('B') + gradeCount('C'))}%"><strong>${rangedRecords.length}</strong><small>samples</small></div><div class="ea-grade-legend">${['A', 'B', 'C'].map(grade => `<span>Grade ${grade}<b>${gradeCount(grade)}</b></span>`).join('')}</div>`, `Original records · ${rangeLabelText}`) + '</div>' + section('Recent records', rowMarkup(rangedRecords.slice(0, 4)))
      break
    }
    case 'records': html = section('Every grade. Its evidence.', `${rangeBar}<div class="ea-row" style="margin-top:12px"><input id="ea-search" type="search" aria-label="Search records" placeholder="Search record, grader, sample or grade" value="${esc(v.query)}">${button('ea-cloud', 'Load cloud records')}${button('ea-export', 'Export CSV')}</div><div id="ea-records"></div>`, 'Original predictions, expert decisions and saved price snapshots stay together.'); break
    case 'prices': html = section('A fair price for every grade.', `<div class="ea-form" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">${(['A', 'B', 'C'] as Grade[]).map(grade => `<label>Grade ${grade} · PHP / kg<input id="ea-price-${grade}" type="number" min="0" step="0.01" value="${loadPriceSchedule()[grade]}"></label>`).join('')}</div><div class="ea-row" style="margin-top:20px">${button('ea-prices-save', 'Save price schedule', true)}</div>`, 'Save locally first, then verify the schedule in Supabase. Historical records keep their saved rate.'); break
    case 'graders': html = section(
      'Authorized expert graders',
      `<div class="ea-row" style="gap:10px;align-items:center"><input id="ea-grader-name" aria-label="Expert grader full name" placeholder="Expert grader full name" maxlength="160" style="flex:1;min-width:190px"><input id="ea-grader-pin" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" aria-label="4-digit override PIN" placeholder="4-digit PIN" style="width:136px"><label style="display:inline-flex;align-items:center;gap:7px;font-size:13px;font-weight:600;color:#182842;cursor:pointer;white-space:nowrap"><input id="ea-grader-2fa" type="checkbox" style="width:18px;height:18px;min-height:18px;margin:0;accent-color:#2159e8">Require Offline 2FA (TOTP)</label>${button('ea-grader-add', 'Register expert grader', true)}</div>${expertGraders.length ? expertGraders.map(expert => { const count = records.filter(r => r.grader.trim().toLocaleLowerCase() === expert.name.trim().toLocaleLowerCase()).length; const overrides = records.filter(r => r.result?.overrideActor?.trim().toLocaleLowerCase() === expert.name.trim().toLocaleLowerCase()).length; const isCurrent = activeGrader && activeGrader.toLocaleLowerCase() === expert.name.trim().toLocaleLowerCase(); const totpOn = Boolean(expert.totpEnabled && expert.totpSecret); return `<div class="ea-row between" style="border-top:1px solid #e3eaf8;margin-top:15px;padding-top:15px"><div><b>${esc(expert.name)}</b> <span class="ea-badge synced">Override PIN set</span> ${totpOn ? '<span class="ea-badge synced" style="background:#dbeafe;color:#1d4ed8">Offline 2FA (TOTP) ✓</span>' : '<span class="ea-badge" style="background:#f1f5f9;color:#475569">PIN only</span>'}${isCurrent ? ' <span class="ea-badge">Currently at station</span>' : ''}<small style="display:block;color:#64738d;margin-top:2px">${count} scan${count === 1 ? '' : 's'} · ${overrides} override${overrides === 1 ? '' : 's'} authorized${totpOn ? ` · ${(expert.recoveryCodeHashes ?? []).length} recovery codes left` : ''}</small></div><div class="ea-row">${totpOn ? `<button data-disable-2fa="${esc(expert.id)}">Disable 2FA</button>` : `<button data-setup-2fa="${esc(expert.id)}">Set up Offline 2FA</button>`}${count > 0 ? `<button data-grader-records="${esc(expert.name)}">View records</button>` : ''}<button data-remove-expert="${esc(expert.id)}" aria-label="Remove ${esc(expert.name)}">Remove</button></div></div>` }).join('') : '<div class="ea-empty">No expert graders registered yet. Add an expert grader with a 4-digit PIN to authorize manual overrides.</div>'}`,
      'Only expert graders registered here can be selected in the Manual Override modal and authorize grades with their personal 4-digit PIN (plus optional 100% offline TOTP 2FA).'
    ) + section(
      'Station operators (scan-only)',
      scanOnlyOperators.length ? scanOnlyOperators.map(name => { const count = records.filter(r => r.grader.trim().toLocaleLowerCase() === name.trim().toLocaleLowerCase()).length; const isCurrent = activeGrader && activeGrader.toLocaleLowerCase() === name.trim().toLocaleLowerCase(); return `<div class="ea-row between" style="border-top:1px solid #e3eaf8;margin-top:14px;padding-top:14px"><div><b>${esc(name)}</b> <span class="ea-badge">Operator · Scan only</span>${isCurrent ? ' <span class="ea-badge synced">Currently at station</span>' : ''}<small style="display:block;color:#64738d;margin-top:2px">${count} sample${count === 1 ? '' : 's'} scanned</small></div><div class="ea-row">${count > 0 ? `<button data-grader-records="${esc(name)}">View records</button>` : ''}<button data-remove-operator="${esc(name)}" aria-label="Remove ${esc(name)}">Remove</button></div></div>` }).join('') : '<div class="ea-empty">No scan-only operators recorded yet. Any worker can operate the station, while only registered experts above can override.</div>',
      'Workers who signed in to run normal scans. They must call a registered Expert Grader above to authorize any override.'
    ); break
    case 'devices': {
      const pi = getPiSettings()
      const piModeLabel = pi.mode === 'unconfigured' ? 'Needs HTTPS gateway' : pi.mode === 'hosted-gateway' ? 'HTTPS gateway' : pi.mode === 'pi-local' ? 'Pi local' : 'Local HTTP'
      const cardStyle = 'display:flex;flex-direction:column;justify-content:space-between;gap:12px;padding:18px;border-radius:18px;background:#f8faff;border:1px solid #e6edf8'
      html = section('Connected with purpose.', `<div class="ea-grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))"><article style="${cardStyle}"><div><div class="ea-row between" style="margin-bottom:8px"><h3 style="margin:0">Raspberry Pi</h3><span class="ea-badge ${pi.configured ? 'synced' : 'failed'}">${esc(piModeLabel)}</span></div><p style="margin:0;font-size:13px">${esc(pi.apiUrl || (pi.configured ? 'Same-origin station API' : 'Open http://10.42.0.1 on Pi Wi-Fi or set an HTTPS gateway'))}</p></div><div>${button('ea-pi-test', 'Check Pi connection')}</div></article><article style="${cardStyle}"><div><div class="ea-row between" style="margin-bottom:8px"><h3 style="margin:0">Camera</h3><span class="ea-badge">${pi.configured ? 'Ready' : 'Standby'}</span></div><p style="margin:0;font-size:13px">${esc(pi.cameraUrl ? `${pi.cameraUrl}/snapshot` : 'Pi stream and snapshot. Checked on request.')}</p></div><div>${button('ea-camera-test', 'Test Pi camera')}</div></article><article style="${cardStyle}"><div><div class="ea-row between" style="margin-bottom:8px"><h3 style="margin:0">Receipt printer</h3><span class="ea-badge">58mm</span></div><p style="margin:0;font-size:13px">58mm output through the system print dialog. Paper output requires a physical check.</p></div></article><article style="${cardStyle}"><div><div class="ea-row between" style="margin-bottom:8px"><h3 style="margin:0">Weighing scale</h3><span class="ea-badge">15–200 kg</span></div><p style="margin:0;font-size:13px">Manual weight entry, 15–200 kg. Pairing alone does not verify a live scale feed.</p></div></article></div><p id="ea-device-status" role="status" style="margin-top:14px;margin-bottom:0;font-size:13px;font-weight:600;color:#2159e8"></p>`); break
    }
    case 'logs': html = section('A clear operational trail.', `<div class="ea-logs">${read<{ timestamp: number; actor: string; action: string; detail: string }[]>('tunaeye-audit-log', []).map(entry => `<div><b>${esc(entry.action)}</b><small>${esc(entry.actor)} · ${esc(entry.detail)}</small><small>${esc(new Date(entry.timestamp).toLocaleString())}</small></div>`).join('') || '<p>No audit events recorded yet.</p>'}</div>`); break
    case 'settings': html = section('Your station, configured.', `<div class="ea-form"><label>Station name<input id="ea-station" maxlength="160" value="${esc(localStorage.getItem('tunaeye-station') ?? state.cfg.name)}"></label><label>Raspberry Pi API URL<input id="ea-api" type="url" value="${esc(localStorage.getItem('tunaeye-rpi-url') ?? getPiSettings().apiUrl)}" placeholder="Same-origin in Pi build"></label><label>Camera URL<input id="ea-camera" type="url" value="${esc(localStorage.getItem('tunaeye-camera-url') ?? getPiSettings().cameraUrl)}"></label><label>AI model identifier<input id="ea-model" maxlength="160" value="${esc(localStorage.getItem('tunaeye-model-name') ?? state.cfg.model)}"></label><label>Maximum weight<input disabled value="200 kg"></label><label>Supabase cloud<input disabled value="${isSupabaseConfigured() ? 'Configured from deployment environment' : 'Not configured'}"></label></div><div class="ea-row" style="margin-top:20px">${button('ea-settings-save', 'Save settings', true)}${button('ea-auth', 'Cloud admin sign-in')}${button('ea-retention', 'Keep newest 200 verified synced records')}</div><p style="margin-top:15px">Offline evidence and pending records are retained. Cloud sync remains manual. Pi-local builds use same-origin endpoints; an HTTPS deployment requires an HTTPS gateway.</p>`); break
    default: return
  }
  body.innerHTML = `<div class="ea">${html}</div>`
  const headings: Record<string, [string, string]> = { overview: ['Station operations', 'Local records, hardware diagnostics and cloud synchronization'], records: ['Grading records', 'Evidence, original model results and verified sync state'], devices: ['Hardware & API diagnostics', 'Check the Pi, model service, camera and cloud independently'], settings: ['Station configuration', 'Effective endpoints, operating mode and local retention'], logs: ['Audit log', 'Recorded configuration, diagnostic and operator events'] }
  if (headings[state.tab]) { const [title, subtitle] = headings[state.tab]; const h = d.querySelector('.ah h1'), sub = d.querySelector('.ah .xm'); if (h) h.textContent = title; if (sub) sub.textContent = subtitle }
  if (state.tab === 'overview' || state.tab === 'devices') {
    const technical = d.createElement('div'); body.querySelector('.ea')!.append(technical); mountTechnicalPanel(w, technical)
  }
  if (state.tab === 'settings') {
    const controls = d.createElement('section'); controls.className = 'ea-card'
    const autoSyncOn = localStorage.getItem('tunaeye-auto-sync') !== 'false'
    controls.innerHTML = `<h2>Grading mode &amp; cloud auto-sync</h2><p>Demo uses simulated inference and keeps results out of operational records. Auto-sync uploads pending records and audit logs automatically whenever internet returns.</p><div class="ea-row"><button id="ea-demo-toggle" type="button" role="switch" aria-label="Demo mode" aria-checked="${isDemoMode()}">${isDemoMode() ? 'Demo enabled — switch to live' : 'Live enabled — switch to demo'}</button><button id="ea-autosync-toggle" type="button" role="switch" aria-label="Auto sync online" aria-checked="${autoSyncOn}">${autoSyncOn ? 'Auto-sync when online: ON' : 'Auto-sync when online: OFF'}</button></div>`
    body.querySelector('.ea')!.append(controls)
    controls.querySelector<HTMLButtonElement>('#ea-demo-toggle')!.onclick = () => context.setDemo(!isDemoMode())
    controls.querySelector<HTMLButtonElement>('#ea-autosync-toggle')!.onclick = () => {
      const next = !(localStorage.getItem('tunaeye-auto-sync') !== 'false')
      localStorage.setItem('tunaeye-auto-sync', String(next))
      queueSqliteState('tunaeye-auto-sync', String(next))
      audit('Auto-sync updated', next ? 'Auto-sync enabled when online' : 'Auto-sync disabled (manual only)')
      draw()
    }
  }
  const get = <T extends HTMLElement>(id: string) => d.getElementById(id) as T | null
  const bind = (id: string, action: () => void) => { const el = get<HTMLButtonElement>(id); if (el) el.onclick = action }
  const value = (id: string) => get<HTMLInputElement>(id)?.value.trim() ?? ''
  const tell = (message: string, error = false) => context.notice(message, error)
  const renderRows = () => {
    const filtered = rangedRecords.filter(row => JSON.stringify(row).toLowerCase().includes(v.query.toLowerCase())), count = Math.max(1, Math.ceil(filtered.length / 8)); v.page = Math.max(1, Math.min(v.page, count))
    const container = get('ea-records'); if (!container) return
    container.innerHTML = rowMarkup(filtered.slice((v.page - 1) * 8, v.page * 8)) + `<div class="ea-pages"><span>${filtered.length} records · Page ${v.page} of ${count}</span><div class="ea-row"><button id="ea-prev" ${v.page === 1 ? 'disabled' : ''}>Previous</button><button id="ea-next" ${v.page === count ? 'disabled' : ''}>Next</button></div></div>`
    bind('ea-prev', () => { v.page--; renderRows() }); bind('ea-next', () => { v.page++; renderRows() }); wireReview()
  }
  const review = async (record: GradingRecord) => {
    const overlay = d.createElement('div'); overlay.className = 'ovl'
    const result = record.result
    const syncState = record.transaction?.syncState ?? 'pending'
    const syncLabel = syncState === 'synced' ? 'Synced' : syncState === 'failed' ? 'Retry needed' : 'Saved locally'
    const weightValue = record.transaction?.amount != null ? `${record.weight} · ${peso(record.transaction.amount)}` : record.weight
    const savedRate = record.transaction?.unitRatePerKg != null ? `${peso(record.transaction.unitRatePerKg)}/kg` : '—'
    const originalPred = result?.originalGrade ? `Grade ${result.originalGrade}${result.originalConfidence != null ? ` · ${result.originalConfidence}%` : ''}` : '—'
    const overrideText = result?.overrideGrade ? `Grade ${result.overrideGrade}${result.overrideActor ? ` · Authorized by ${result.overrideActor}` : ''}${result.overrideReason ? ` · ${result.overrideReason}` : ''}` : 'None'
    const idsText = result?.inferenceId || result?.captureId ? `${result?.inferenceId || '—'} / ${result?.captureId || '—'}` : '—'
    overlay.innerHTML = `<section class="sheet ea ea-detail" role="dialog" aria-modal="true" aria-label="Grading record">
      <div class="ea-row between">
        <div class="ea-row" style="gap:10px"><h2 style="margin:0">Grade ${esc(record.grade)}</h2>${result?.provisional ? '<span class="ea-badge" style="background:#fff4db;color:#925800">Provisional</span>' : ''}<span class="ea-badge ${esc(syncState)}">${esc(syncLabel)}</span></div>
        ${button('ea-detail-close', 'Close')}
      </div>
      <div id="ea-evidence" style="min-height:96px;border-radius:16px;background:#f3f7ff;display:grid;place-items:center;color:#64738d;font-size:13px;padding:10px;text-align:center">Loading captured evidence…</div>
      <dl>
        <dt>Record</dt><dd>${esc(record.id)}</dd>
        <dt>Grader / sample</dt><dd>${esc(record.grader)} · ${esc(record.sample)}</dd>
        <dt>Weight / value</dt><dd>${esc(weightValue)}</dd>
        <dt>Saved rate</dt><dd>${esc(savedRate)}</dd>
        <dt>Original prediction</dt><dd>${esc(originalPred)}</dd>
        <dt>Expert override</dt><dd>${esc(overrideText)}</dd>
        <dt>Inference / capture</dt><dd>${esc(idsText)}</dd>
        <dt>Sync status</dt><dd><span class="ea-badge ${esc(syncState)}">${esc(syncLabel)}</span></dd>
      </dl>
    </section>`
    d.getElementById('stage')?.append(overlay)
    let url: string | undefined
    const close = () => { if (url?.startsWith('blob:')) URL.revokeObjectURL(url); overlay.remove() }
    overlay.querySelector<HTMLButtonElement>('#ea-detail-close')!.onclick = close; overlay.onclick = event => { if (event.target === overlay) close() }
    try {
      const evidence = record.capturedImageId ? await getCapturedEvidence(record.capturedImageId) : null
      if (evidence) url = URL.createObjectURL(evidence.blob)
      else if (record.remoteImagePath && isSupabaseConfigured()) { const { data, error } = await getSupabase().storage.from('grading-images').createSignedUrl(record.remoteImagePath, 60); if (error) throw error; url = data.signedUrl }
      if (!overlay.isConnected) { if (url?.startsWith('blob:')) URL.revokeObjectURL(url); return }
      const target = overlay.querySelector('#ea-evidence')!
      if (url) { const img = d.createElement('img'); img.src = url; img.alt = `Captured ${record.sample}`; target.replaceChildren(img) } else target.textContent = result?.modelSource === 'demo' ? 'Demo record — no camera image stored.' : 'Evidence is not available on this device.'
    } catch { if (overlay.isConnected) overlay.querySelector('#ea-evidence')!.textContent = 'Evidence could not be loaded. The grading record is retained.' }
  }
  function wireReview() {
    body!.querySelectorAll<HTMLImageElement>('img[data-thumb]').forEach(img => {
      const row = records.find(r => r.id === img.dataset.thumb)
      img.src = row?.sample === 'Tail cut' ? '/assets/tailCutFull.png' : '/assets/sashiboCoreFull.png'
      if (row?.capturedImageId) {
        void getCapturedEvidence(row.capturedImageId).then(ev => {
          if (ev && img.isConnected) img.src = URL.createObjectURL(ev.blob)
        }).catch(() => { })
      }
    })
    body!.querySelectorAll<HTMLButtonElement>('[data-review]').forEach(el => el.onclick = () => { const row = records.find(record => record.id === el.dataset.review); if (row) void review(row) })
  }
  body.querySelectorAll<HTMLButtonElement>('[data-range]').forEach(el => el.onclick = () => { v.range = (el.dataset.range as TimeRange) || 'all'; v.page = 1; draw() })
  wireReview(); if (state.tab === 'records') { renderRows(); const search = get<HTMLInputElement>('ea-search'); if (search) search.oninput = () => { v.query = search.value; v.page = 1; renderRows() } }
  bind('ea-cloud', async () => { if (!isSupabaseConfigured()) return tell('Cloud is not configured in this build.', true); try { v.cloud = await fetchCloudRecords(); draw(); tell('Cloud records loaded') } catch (e) { tell(e instanceof Error ? e.message : 'Cloud records unavailable', true) } })
  bind('ea-export', () => { const fields = ['id', 'grader', 'sample', 'weight', 'grade', 'status'] as const, quote = (text: unknown) => '"' + String(text ?? '').replaceAll('"', '""') + '"', csv = [fields.join(','), ...records.map(row => fields.map(field => quote(row[field])).join(','))].join('\r\n'), url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })), a = d.createElement('a'); a.href = url; a.download = 'tunaeye-records.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); audit('Records exported', `${records.length} records exported to CSV`) })
  const openTotpEnrollmentModal = (expert: ExpertGrader) => {
    const secret = generateTotpSecret()
    const uri = buildOtpAuthUri(expert.name, secret, 'TunaEye')
    const qrSvg = renderQrSvg(uri, 172)
    const recoveryCodes = generateRecoveryCodes(5)
    const overlay = d.createElement('div'); overlay.className = 'ovl'; overlay.id = 'ea-totp-modal'
    overlay.innerHTML = `<section class="sheet ea" role="dialog" aria-modal="true" aria-label="Offline 2FA setup" style="width:min(740px,95%);padding:24px;border-radius:26px;gap:14px">
      <div class="ea-row between">
        <div>
          <h2 style="margin:0 0 3px">Set up Offline 2FA (TOTP) · ${esc(expert.name)}</h2>
          <p style="margin:0;font-size:13px">100% offline RFC 6238 verification — works with Google Authenticator, Authy, or Apple Passwords without internet.</p>
        </div>
        <span class="ea-badge synced" style="background:#dbeafe;color:#1d4ed8">Offline Ready</span>
      </div>
      <div style="display:grid;grid-template-columns:210px 1fr;gap:18px;align-items:start">
        <div style="padding:14px;border-radius:20px;background:#f8faff;border:1px solid #dbe6fa;text-align:center">
          <div style="display:inline-block;padding:8px;border-radius:14px;background:#fff;border:1px solid #e2e8f0">${qrSvg}</div>
          <div style="margin-top:8px;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.05em">Manual Key (Base32)</div>
          <code id="ea-totp-secret" data-secret="${esc(secret)}" style="display:block;margin-top:4px;font:700 11.5px/1.35 ui-monospace,Consolas,monospace;color:#0f172a;word-break:break-all">${esc(formatBase32Secret(secret))}</code>
        </div>
        <div style="display:grid;gap:12px">
          <div style="padding:13px 15px;border-radius:16px;background:#fffbeb;border:1px solid #fde68a">
            <div class="ea-row between" style="margin-bottom:6px">
              <b style="font-size:13px;color:#92400e">5 Single-Use Offline Recovery Codes</b>
              <button type="button" id="ea-totp-print-codes" style="min-height:32px;padding:4px 12px;font-size:12px;background:#fff;border-color:#fcd34d;color:#92400e">Print 58mm slip</button>
            </div>
            <div id="ea-totp-recovery-list" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;font:700 12.5px ui-monospace,Consolas,monospace;color:#78350f">
              ${recoveryCodes.map(c => `<span style="padding:5px 8px;border-radius:8px;background:#fff;border:1px solid #fde68a;text-align:center">${esc(c)}</span>`).join('')}
            </div>
            <small style="display:block;margin-top:6px;font-size:11.5px;color:#92400e">Use a backup code if the expert’s phone battery dies at the dock. Each code works once.</small>
          </div>
          <div style="display:grid;gap:6px">
            <label style="font-size:13px;font-weight:600;color:#182842">Scan the QR code, then enter the 6-digit code to activate
              <input id="ea-totp-verify-input" inputmode="numeric" maxlength="6" placeholder="000000" autocomplete="one-time-code" style="font:700 20px ui-monospace,Consolas,monospace;letter-spacing:.22em;text-align:center">
            </label>
            <div id="ea-totp-error" role="alert" style="font-size:12.5px;font-weight:600;color:#dc2626;min-height:18px"></div>
          </div>
          <div class="ea-row between">
            <small style="font-size:11.5px;color:#64748b">Clock check: tablet &amp; phone clocks stay within ±30s (±1 step tolerance).</small>
            <div class="ea-row">
              <button type="button" id="ea-totp-cancel">Cancel</button>
              <button type="button" id="ea-totp-activate" class="primary">Verify &amp; Activate 2FA</button>
            </div>
          </div>
        </div>
      </div>
    </section>`
    d.getElementById('stage')?.append(overlay)
    overlay.querySelector<HTMLButtonElement>('#ea-totp-cancel')!.onclick = () => overlay.remove()
    overlay.querySelector<HTMLButtonElement>('#ea-totp-print-codes')!.onclick = () => {
      printRecoveryCodesSlip(w, expert.name, recoveryCodes, localStorage.getItem('tunaeye-station') ?? state.cfg.name)
      tell('Prepared 58mm recovery codes slip')
    }
    overlay.querySelector<HTMLButtonElement>('#ea-totp-activate')!.onclick = async () => {
      const code = (overlay.querySelector('#ea-totp-verify-input') as HTMLInputElement).value.trim()
      const errEl = overlay.querySelector('#ea-totp-error') as HTMLElement
      try {
        await enableExpertTotp(expert.id, secret, code, recoveryCodes)
        audit('Offline 2FA enabled', `${expert.name} enrolled in offline TOTP 2FA (5 recovery codes generated)`)
        overlay.remove()
        draw()
        tell(`Offline 2FA activated for ${expert.name}`)
      } catch (err) {
        errEl.textContent = err instanceof Error ? err.message : 'Verification failed.'
      }
    }
  }
  bind('ea-grader-add', async () => {
    const name = value('ea-grader-name')
    const pin = value('ea-grader-pin')
    const want2fa = Boolean(get<HTMLInputElement>('ea-grader-2fa')?.checked)
    try {
      const created = await registerExpertGrader(name, pin)
      if (!graders.some(item => item.toLocaleLowerCase() === created.name.toLocaleLowerCase())) {
        const nextList = [...graders, created.name]
        localStorage.setItem('tunaeye-graders', JSON.stringify(nextList))
        queueSqliteState('tunaeye-graders', JSON.stringify(nextList))
      }
      void syncGradersToCloud([created.name])
      audit('Expert grader registered', `${created.name} (personal override PIN set)`)
      draw()
      tell(`Registered expert grader ${created.name}`)
      if (want2fa) openTotpEnrollmentModal(created)
    } catch (err) {
      tell(err instanceof Error ? err.message : 'Could not register expert grader.', true)
    }
  })
  body.querySelectorAll<HTMLButtonElement>('[data-setup-2fa]').forEach(el => el.onclick = () => {
    const expert = expertGraders.find(item => item.id === el.dataset.setup2fa)
    if (expert) openTotpEnrollmentModal(expert)
  })
  body.querySelectorAll<HTMLButtonElement>('[data-disable-2fa]').forEach(el => el.onclick = () => {
    const expert = expertGraders.find(item => item.id === el.dataset.disable2fa)
    if (!expert) return
    const modal = (w as Window & { eval: (s: string) => any }).eval('modal')
    modal({
      title: 'Disable Offline 2FA?',
      body: `${expert.name} will revert to 4-digit PIN only for manual overrides.`,
      ok: 'Disable 2FA',
      onOk: async () => {
        await disableExpertTotp(expert.id)
        audit('Offline 2FA disabled', expert.name)
        draw()
      }
    })
  })
  body.querySelectorAll<HTMLButtonElement>('[data-grader-records]').forEach(el => el.onclick = () => { v.query = el.dataset.graderRecords || ''; v.range = 'all'; v.page = 1; d.querySelector<HTMLButtonElement>('.an[data-t="records"]')?.click() })
  body.querySelectorAll<HTMLButtonElement>('[data-remove-expert]').forEach(el => el.onclick = () => {
    const id = el.dataset.removeExpert!
    const expert = expertGraders.find(item => item.id === id)
    if (!expert) return
    const modal = (w as Window & { eval: (s: string) => any }).eval('modal')
    modal({
      title: 'Remove expert grader?',
      body: `${expert.name} will no longer be able to authorize manual overrides. Historical records remain.`,
      ok: 'Remove',
      onOk: async () => {
        await removeExpertGrader(id)
        audit('Expert grader removed', expert.name)
        draw()
      }
    })
  })
  body.querySelectorAll<HTMLButtonElement>('[data-remove-operator]').forEach(el => el.onclick = () => {
    const name = el.dataset.removeOperator!
    const modal = (w as Window & { eval: (s: string) => any }).eval('modal')
    modal({
      title: 'Remove station operator?',
      body: `${name} will be removed from the quick-pick list. Historical records remain.`,
      ok: 'Remove',
      onOk: () => {
        saveGraders(graders.filter(item => item.toLocaleLowerCase() !== name.toLocaleLowerCase()))
        audit('Operator removed', name)
      }
    })
  })
  bind('ea-prices-save', async () => { const prices = Object.fromEntries((['A', 'B', 'C'] as Grade[]).map(grade => [grade, Number(value(`ea-price-${grade}`))])) as Record<Grade, number>; if (Object.values(prices).some(number => !Number.isFinite(number) || number < 0)) return tell('Enter a non-negative price for every grade.', true); const payload = JSON.stringify(prices); localStorage.setItem('tunaeye-prices', payload); queueSqliteState('tunaeye-prices', payload); Object.assign((w as Window & { eval: (s: string) => any }).eval('RATE'), prices); audit('Prices updated', 'Local price schedule saved'); try { await syncPriceSchedule(prices); tell('Price schedule saved and verified in cloud') } catch (e) { tell(`Prices saved locally. ${e instanceof Error ? e.message : 'Cloud sync unavailable.'}`, true) } })
  bind('ea-settings-save', () => { const endpoint = value('ea-api'), camera = value('ea-camera'); for (const url of [endpoint, camera]) if (url && !/^https?:\/\/[^\s]+$/i.test(url)) return tell('Use a valid HTTP or HTTPS device URL.', true); if (!value('ea-station')) return tell('Enter a station name.', true); localStorage.setItem('tunaeye-station', value('ea-station')); queueSqliteState('tunaeye-station', value('ea-station')); localStorage.setItem('tunaeye-rpi-url', endpoint); localStorage.setItem('tunaeye-camera-url', camera); localStorage.setItem('tunaeye-model-name', value('ea-model')); Object.assign(state.cfg, { name: value('ea-station'), url: endpoint, model: value('ea-model') }); audit('Settings updated', 'Station and Pi connection settings saved'); tell('Station settings saved') })
  bind('ea-pi-test', async () => { const status = get('ea-device-status'); if (status) status.textContent = 'Checking Pi…'; try { const result = await checkPiHealth(); if (status) status.textContent = `Pi reachable · ${result.model ?? result.service ?? 'Status endpoint answered'}`; audit('Pi connection test', 'Status endpoint reachable') } catch (e) { if (status) status.textContent = e instanceof Error ? e.message : 'Pi unavailable'; audit('Pi connection test', 'Pi unavailable') } })
  bind('ea-camera-test', async () => { const status = get('ea-device-status'); if (status) status.textContent = 'Checking snapshot…'; try { const image = await capturePiImage(); if (status) status.textContent = `Camera returned ${image.size.toLocaleString()} image bytes`; audit('Camera diagnostic', 'Snapshot returned') } catch (e) { if (status) status.textContent = e instanceof Error ? e.message : 'Camera unavailable' } })
  bind('ea-retention', () => {
    const removable = loadRecords().filter(row => row.transaction?.syncState === 'synced').sort((a, b) => b.timestamp - a.timestamp).slice(200); const modal = (w as Window & { eval: (s: string) => any }).eval('modal'); modal({
      title: 'Clean verified local copies?', body: `${removable.length} older verified synced records can be removed locally. Pending and failed evidence remains. Cloud copies are unchanged.`, ok: 'Clean local copies', onOk: async () => {
        const removed = new Set<string>()
        try { for (const row of removable) { if (row.capturedImageId) await deleteCapturedEvidence(row.capturedImageId); removed.add(row.id) } }
        catch { tell('Some local copies could not be removed. Pending evidence is unchanged.', true) }
        saveRecords(loadRecords().filter(row => !removed.has(row.id))); audit('Local retention', `${removed.size} verified synced local copies removed`); context.refresh(); tell(`${removed.size} verified synced local copies removed`)
      }
    })
  })
  bind('ea-auth', () => { const modal = d.createElement('div'); modal.className = 'ovl'; modal.innerHTML = `<section class="sheet ea" role="dialog" aria-modal="true" aria-label="Hosted admin sign-in"><h2>Cloud admin sign-in</h2><p>Use the administrator email registered in Supabase.</p><label>Email<input id="ea-auth-email" type="email" autocomplete="email"></label><div class="ea-row">${button('ea-auth-send', 'Email sign-in link', true)}${button('ea-auth-close', 'Close')}</div><p id="ea-auth-status" role="status"></p></section>`; d.getElementById('stage')?.append(modal); modal.querySelector<HTMLButtonElement>('#ea-auth-close')!.onclick = () => modal.remove(); modal.querySelector<HTMLButtonElement>('#ea-auth-send')!.onclick = async () => { const b = modal.querySelector<HTMLButtonElement>('#ea-auth-send')!, status = modal.querySelector('#ea-auth-status')!; b.disabled = true; try { await sendAdminMagicLink((modal.querySelector('#ea-auth-email') as HTMLInputElement).value); status.textContent = 'Check your inbox and open the sign-in link on this tablet.' } catch (e) { status.textContent = e instanceof Error ? e.message : 'Sign-in link unavailable.' } finally { b.disabled = false } } })
}
