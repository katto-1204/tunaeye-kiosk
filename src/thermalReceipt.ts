export interface ThermalReceipt {
  station: string
  order: string
  grader: string
  timestamp: number
  weight: string | number
  grade: string
  unitRatePerKg: number | null
  total: number | null
  core?: { grade: string; confidence: number | null }
  tail?: { grade: string; confidence: number | null }
  provisional?: boolean
  tailAvailable?: boolean
  demo?: boolean
}

const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
// Code 128 symbol widths, ISO/IEC 15417. The checksum and quiet zones are part of the printed barcode.
const patterns = `212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 114131 311141 411131 211412 211214 211232 2331112`.split(' ')

export function receiptBarcode(value: string): string {
  if (!/^[\x20-\x7e]{1,12}$/.test(value)) throw new Error('Receipt order must contain 1–12 printable ASCII characters for a readable 58mm barcode.')
  const codes = [104, ...Array.from(value, c => c.charCodeAt(0) - 32)]
  codes.push(codes.reduce((sum, code, index) => sum + code * (index || 1), 0) % 103, 106)
  let x = 10
  const bars: string[] = []
  for (const code of codes) {
    Array.from(patterns[code], Number).forEach((width, index) => {
      if (index % 2 === 0) bars.push(`<rect x="${x}" y="0" width="${width}" height="42"/>`)
      x += width
    })
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Order barcode ${escape(value)}" viewBox="0 0 ${x + 10} 42" preserveAspectRatio="none" shape-rendering="crispEdges">${bars.join('')}</svg>`
}

export function thermalReceiptHtml(receipt: ThermalReceipt): string {
  const money = (value: number | null) => value !== null && Number.isFinite(value) ? `PHP ${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'
  const line = (label: string, value: unknown, bold = false) => `<div class="row${bold ? ' bold' : ''}"><span>${escape(label)}</span><b>${escape(value)}</b></div>`
  const sample = (label: string, result?: { grade: string; confidence: number | null }) => result ? line(label, `${result.grade}${result.confidence == null ? '' : ` · ${result.confidence.toFixed(1)}%`}`) : ''
  const tailLine = receipt.tail ? sample('Tail cut', receipt.tail) : receipt.tailAvailable === false ? line('Tail cut', 'NOT AVAILABLE') : ''
  return `<!doctype html><html><head><meta charset="utf-8"><title>TunaEye ${escape(receipt.order)}</title><style>
@page{size:58mm 100mm;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;width:58mm;min-height:0;background:#fff;color:#000}body{font:11px/1.25 'Courier New',monospace;font-variant-numeric:tabular-nums;-webkit-print-color-adjust:exact;print-color-adjust:exact}.receipt{width:58mm;padding:2mm 5mm 1.5mm;overflow-wrap:anywhere}h1{font-size:13px;line-height:1.2;text-align:center;margin:0 0 1mm;font-weight:700}.center{text-align:center;font-size:10px}.divider{border-top:1px dashed #000;margin:1.5mm 0}.row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.6fr);gap:2mm;padding:.5mm 0;align-items:baseline}.row>b{text-align:right;font-weight:400;min-width:0}.bold{font-size:13px}.bold>b{font-weight:700}.grade{font-size:18px;font-weight:700;text-align:center;line-height:1.2;margin:1mm 0}.barcode{margin:2mm 0 .5mm}.barcode svg{display:block;width:48mm;height:11mm;fill:#000}.order{text-align:center;letter-spacing:.4px;font-size:10px;margin:.5mm 0}.demo{font-weight:700;text-align:center;border:1px solid #000;padding:.5mm;margin:1mm 0}footer{text-align:center;font-size:9px;margin-top:1mm}header,footer,.row,.barcode,.grade{break-inside:avoid}button{display:none}
</style></head><body><main class="receipt"><h1>${escape(receipt.station || 'TUNAEYE KIOSK')}</h1><div class="center">Grading receipt</div>${receipt.demo ? '<div class="demo">DEMO — SIMULATED PREDICTION</div>' : ''}${receipt.provisional ? '<div class="demo">PROVISIONAL · TAIL-CUT NOT AVAILABLE</div>' : ''}<div class="divider"></div>${line('Order', receipt.order)}${line('Date', new Date(receipt.timestamp).toLocaleString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }))}${line('Grader', receipt.grader)}<div class="divider"></div>${sample('Sashibo core', receipt.core)}${tailLine}<div class="grade">GRADE ${escape(receipt.grade)}</div>${line('Weight', `${receipt.weight} kg`)}${line('Rate / kg', money(receipt.unitRatePerKg))}<div class="divider"></div>${line('TOTAL', money(receipt.total), true)}<div class="barcode">${receiptBarcode(receipt.order)}</div><div class="order">${escape(receipt.order)}</div><footer>Thank you · TunaEye</footer></main></body></html>`
}

export async function printThermalReceipt(w: Window, receipt: ThermalReceipt): Promise<true> {
  const d = w.document
  d.querySelector('iframe[data-thermal-receipt]')?.remove()
  const frame = d.createElement('iframe')
  frame.setAttribute('data-thermal-receipt', '')
  frame.title = '58mm thermal receipt'
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:58mm;height:1px;border:0;pointer-events:none'
  const loaded = new Promise<void>((resolve, reject) => {
    frame.onload = () => resolve()
    frame.onerror = () => reject(new Error('Receipt could not be prepared.'))
  })
  frame.srcdoc = thermalReceiptHtml(receipt)
  d.body.append(frame)
  try {
    await loaded
    const printWindow = frame.contentWindow!, printDocument = printWindow.document
    await printDocument.fonts.ready
    // Size the page to this receipt instead of inheriting the kiosk's fixed canvas/viewport height.
    const heightMm = Math.ceil(printDocument.querySelector('main')!.getBoundingClientRect().height * 25.4 / 96) + 1
    const size = printDocument.createElement('style'); size.textContent = `@page{size:58mm ${heightMm}mm;margin:0}`; printDocument.head.append(size)
    printWindow.addEventListener('afterprint', () => frame.remove(), { once: true })
    printWindow.print()
    // Some Android print services omit afterprint; the next print removes this single retained frame.
    return true
  } catch (error) { frame.remove(); throw error }
}
