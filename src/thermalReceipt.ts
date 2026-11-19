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

type BtCharacteristic = {
  writeValue?: (data: BufferSource) => Promise<void>
  writeValueWithoutResponse?: (data: BufferSource) => Promise<void>
  properties?: { write?: boolean; writeWithoutResponse?: boolean }
}
type BtDevice = {
  name?: string
  gatt?: {
    connected?: boolean
    connect: () => Promise<{
      getPrimaryServices: () => Promise<Array<{
        getCharacteristics: () => Promise<BtCharacteristic[]>
      }>>
    }>
  }
}

let cachedBtDevice: BtDevice | null = null
let cachedBtChar: BtCharacteristic | null = null

const COMMON_PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  '0000ffe0-0000-1000-8000-00805f9b34fb',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2'
]

export function getConnectedBtPrinterName(): string | null {
  return cachedBtDevice?.gatt?.connected ? (cachedBtDevice.name || 'Bluetooth Printer') : null
}

async function resolveWritableChar(device: BtDevice): Promise<BtCharacteristic | null> {
  if (!device.gatt) return null
  const server = await device.gatt.connect()
  const services = await server.getPrimaryServices()
  for (const svc of services) {
    const chars = await svc.getCharacteristics().catch(() => [])
    const writable = chars.find(c => c.properties?.write || c.properties?.writeWithoutResponse)
    if (writable) return writable
  }
  return null
}

export async function pairBluetoothPrinter(): Promise<string> {
  const nav = navigator as unknown as { bluetooth?: { requestDevice: (opts: unknown) => Promise<BtDevice> } }
  if (!nav.bluetooth?.requestDevice) {
    throw new Error('Web Bluetooth requires HTTPS or chrome://flags/#unsafely-treat-insecure-origin-as-secure.')
  }
  const device = await nav.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: COMMON_PRINTER_SERVICES
  })
  const writable = await resolveWritableChar(device)
  if (!writable) throw new Error('Connected to Bluetooth device, but no ESC/POS print characteristic was found.')
  cachedBtDevice = device
  cachedBtChar = writable
  return device.name || 'Bluetooth Thermal Printer'
}

function buildEscPosBytes(receipt: ThermalReceipt): Uint8Array {
  const enc = new TextEncoder()
  const money = (v: number | null) => v !== null && Number.isFinite(v) ? `PHP ${v.toFixed(2)}` : '-'
  const padRow = (l: string, r: string) => {
    const max = 32
    const space = Math.max(1, max - l.length - r.length)
    return `${l}${' '.repeat(space)}${r}\n`
  }
  const dateStr = new Date(receipt.timestamp).toLocaleString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  const lines: number[] = [
    0x1b, 0x40, // Initialize
    0x1b, 0x61, 0x01, // Center
    0x1b, 0x45, 0x01, // Bold ON
    ...enc.encode(`${(receipt.station || 'TUNAEYE KIOSK').toUpperCase()}\n`),
    0x1b, 0x45, 0x00,
    ...enc.encode('Grading Receipt\n'),
  ]
  if (receipt.demo) lines.push(...enc.encode('[DEMO - SIMULATED]\n'))
  if (receipt.provisional) lines.push(...enc.encode('[PROVISIONAL - NO TAIL-CUT]\n'))
  lines.push(
    ...enc.encode('--------------------------------\n'),
    0x1b, 0x61, 0x00, // Left
    ...enc.encode(padRow('Order:', receipt.order)),
    ...enc.encode(padRow('Date:', dateStr)),
    ...enc.encode(padRow('Grader:', receipt.grader || '-')),
    ...enc.encode('--------------------------------\n'),
  )
  if (receipt.core) {
    const cStr = `${receipt.core.grade}${receipt.core.confidence != null ? ` (${receipt.core.confidence.toFixed(1)}%)` : ''}`
    lines.push(...enc.encode(padRow('Sashibo Core:', cStr)))
  }
  if (receipt.tail) {
    const tStr = `${receipt.tail.grade}${receipt.tail.confidence != null ? ` (${receipt.tail.confidence.toFixed(1)}%)` : ''}`
    lines.push(...enc.encode(padRow('Tail-Cut:', tStr)))
  } else if (receipt.tailAvailable === false) {
    lines.push(...enc.encode(padRow('Tail-Cut:', 'NOT AVAILABLE')))
  }
  lines.push(
    0x1b, 0x61, 0x01, // Center
    0x1b, 0x45, 0x01, // Bold ON
    0x1d, 0x21, 0x11, // Double width & height
    ...enc.encode(`\nGRADE ${receipt.grade}\n\n`),
    0x1d, 0x21, 0x00, // Normal size
    0x1b, 0x45, 0x00,
    0x1b, 0x61, 0x00, // Left
    ...enc.encode(padRow('Weight:', `${receipt.weight} kg`)),
    ...enc.encode(padRow('Rate / kg:', money(receipt.unitRatePerKg))),
    ...enc.encode('--------------------------------\n'),
    0x1b, 0x45, 0x01,
    ...enc.encode(padRow('TOTAL:', money(receipt.total))),
    0x1b, 0x45, 0x00,
    ...enc.encode('--------------------------------\n'),
    0x1b, 0x61, 0x01,
    ...enc.encode(`${receipt.order}\nThank you - TunaEye\n\n\n\n`),
    0x1d, 0x56, 0x00 // Cut if supported
  )
  return new Uint8Array(lines)
}

async function tryDirectBluetoothPrint(receipt: ThermalReceipt): Promise<boolean> {
  try {
    if (!cachedBtDevice) {
      const nav = navigator as unknown as { bluetooth?: { getDevices?: () => Promise<BtDevice[]> } }
      if (nav.bluetooth?.getDevices) {
        const known = await nav.bluetooth.getDevices()
        if (known.length > 0) cachedBtDevice = known[0]
      }
    }
    if (!cachedBtDevice) return false
    if (!cachedBtDevice.gatt?.connected || !cachedBtChar) {
      cachedBtChar = await resolveWritableChar(cachedBtDevice)
    }
    if (!cachedBtChar) return false
    const bytes = buildEscPosBytes(receipt)
    const chunkSize = 128
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const slice = bytes.slice(i, i + chunkSize)
      if (cachedBtChar.properties?.writeWithoutResponse && cachedBtChar.writeValueWithoutResponse) {
        await cachedBtChar.writeValueWithoutResponse(slice)
      } else if (cachedBtChar.writeValue) {
        await cachedBtChar.writeValue(slice)
      }
    }
    return true
  } catch {
    return false
  }
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
  if (await tryDirectBluetoothPrint(receipt)) return true
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
