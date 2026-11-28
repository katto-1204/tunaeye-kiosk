/**
 * 100% Offline RFC 6238 TOTP (Google Authenticator / Authy / Apple Passwords)
 * + Zero-dependency ISO/IEC 18004 Byte-mode QR Code SVG generator (Versions 1–10, ECC-L)
 * + Offline single-use Recovery Codes + 58mm thermal backup slip printer.
 */

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function rotl(x: number, n: number) {
  return ((x << n) | (x >>> (32 - n))) >>> 0
}

/** Pure-JS SHA-1 (RFC 3174) so TOTP works identically on both HTTPS/localhost and HTTP Pi LAN. */
function sha1(message: Uint8Array): Uint8Array {
  const ml = message.length
  const totalLen = Math.ceil((ml + 9) / 64) * 64
  const buf = new Uint8Array(totalLen)
  buf.set(message)
  buf[ml] = 0x80
  const view = new DataView(buf.buffer)
  const bitLenHi = Math.floor((ml * 8) / 0x100000000)
  const bitLenLo = (ml * 8) >>> 0
  view.setUint32(totalLen - 8, bitLenHi, false)
  view.setUint32(totalLen - 4, bitLenLo, false)

  let h0 = 0x67452301
  let h1 = 0xefcdab89
  let h2 = 0x98badcfe
  let h3 = 0x10325476
  let h4 = 0xc3d2e1f0
  const w = new Uint32Array(80)

  for (let offset = 0; offset < totalLen; offset += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(offset + i * 4, false)
    for (let i = 16; i < 80; i += 1) w[i] = rotl(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1)
    let a = h0, b = h1, c = h2, d = h3, e = h4
    for (let i = 0; i < 80; i += 1) {
      let f = 0, k = 0
      if (i < 20) { f = (b & c) | ((~b) & d); k = 0x5a827999 }
      else if (i < 40) { f = b ^ c ^ d; k = 0x6ed9eba1 }
      else if (i < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8f1bbcdc }
      else { f = b ^ c ^ d; k = 0xca62c1d6 }
      const temp = (rotl(a, 5) + f + e + k + w[i]) >>> 0
      e = d; d = c; c = rotl(b, 30); b = a; a = temp
    }
    h0 = (h0 + a) >>> 0
    h1 = (h1 + b) >>> 0
    h2 = (h2 + c) >>> 0
    h3 = (h3 + d) >>> 0
    h4 = (h4 + e) >>> 0
  }
  const out = new Uint8Array(20)
  const outView = new DataView(out.buffer)
  outView.setUint32(0, h0, false)
  outView.setUint32(4, h1, false)
  outView.setUint32(8, h2, false)
  outView.setUint32(12, h3, false)
  outView.setUint32(16, h4, false)
  return out
}

function hmacSha1(key: Uint8Array, msg: Uint8Array): Uint8Array {
  const blockSize = 64
  const k = new Uint8Array(blockSize)
  k.set(key.length > blockSize ? sha1(key) : key)
  const oPad = new Uint8Array(blockSize + 20)
  const iPad = new Uint8Array(blockSize + msg.length)
  for (let i = 0; i < blockSize; i += 1) {
    oPad[i] = k[i] ^ 0x5c
    iPad[i] = k[i] ^ 0x36
  }
  iPad.set(msg, blockSize)
  oPad.set(sha1(iPad), blockSize)
  return sha1(oPad)
}

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0, value = 0, out = ''
  for (const b of bytes) {
    value = (value << 8) | b
    bits += 8
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31]
  return out
}

export function base32Decode(secret: string): Uint8Array {
  const clean = secret.toUpperCase().replace(/[^A-Z2-7]/g, '')
  let bits = 0, value = 0
  const out: number[] = []
  for (const ch of clean) {
    const idx = BASE32.indexOf(ch)
    if (idx < 0) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return new Uint8Array(out)
}

export function generateTotpSecret(): string {
  const bytes = new Uint8Array(20) // 160-bit RFC 4226/6238 recommended secret
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256)
  }
  return base32Encode(bytes)
}

export function formatBase32Secret(secret: string): string {
  return secret.replace(/[^A-Z2-7]/gi, '').toUpperCase().replace(/(.{4})/g, '$1 ').trim()
}

export function buildOtpAuthUri(accountName: string, secret: string, issuer = 'TunaEye'): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(accountName.trim() || 'Expert')}`
  const cleanSecret = secret.replace(/[^A-Z2-7]/gi, '').toUpperCase()
  return `otpauth://totp/${label}?secret=${cleanSecret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`
}

export function generateTotpCode(secret: string, timeMs = Date.now(), stepSeconds = 30): string {
  const counter = Math.floor(timeMs / 1000 / stepSeconds)
  const msg = new Uint8Array(8)
  const view = new DataView(msg.buffer)
  view.setUint32(0, Math.floor(counter / 0x100000000), false)
  view.setUint32(4, counter >>> 0, false)
  const digest = hmacSha1(base32Decode(secret), msg)
  const offset = digest[digest.length - 1] & 0x0f
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff)
  return String(binary % 1_000_000).padStart(6, '0')
}

export function verifyTotpCode(secret: string, inputCode: string, window = 1, timeMs = Date.now()): boolean {
  const clean = inputCode.replace(/\s|-/g, '')
  if (!/^\d{6}$/.test(clean)) return false
  for (let delta = -window; delta <= window; delta += 1) {
    if (generateTotpCode(secret, timeMs + delta * 30_000) === clean) return true
  }
  return false
}

export function generateRecoveryCodes(count = 5): string[] {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const codes: string[] = []
  const rand = new Uint8Array(count * 8)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(rand)
  else for (let i = 0; i < rand.length; i += 1) rand[i] = Math.floor(Math.random() * 256)
  for (let i = 0; i < count; i += 1) {
    let raw = ''
    for (let j = 0; j < 8; j += 1) raw += chars[rand[i * 8 + j] % chars.length]
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4)}`)
  }
  return codes
}

export function hashRecoveryCode(code: string, salt: string): string {
  const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const bytes = new TextEncoder().encode(`${salt}:recovery:${normalized}`)
  return [...sha1(bytes)].map(b => b.toString(16).padStart(2, '0')).join('')
}

// --- Zero-dependency ISO/IEC 18004 QR Code SVG Generator (Versions 1–10, ECC Level L) ---
// Table: [version, totalCodewords, ecPerBlock, blocksG1, dataG1, blocksG2, dataG2, alignCenters]
type QrSpec = [number, number, number, number, number, number, number, number[]]
const QR_SPECS_L: QrSpec[] = [
  [1, 26, 7, 1, 19, 0, 0, []],
  [2, 44, 10, 1, 34, 0, 0, [6, 18]],
  [3, 70, 15, 1, 55, 0, 0, [6, 22]],
  [4, 100, 20, 1, 80, 0, 0, [6, 26]],
  [5, 134, 26, 1, 108, 0, 0, [6, 30]],
  [6, 172, 18, 2, 68, 0, 0, [6, 34]],
  [7, 196, 20, 2, 78, 0, 0, [6, 22, 38]],
  [8, 242, 24, 2, 97, 0, 0, [6, 24, 42]],
  [9, 292, 30, 2, 116, 0, 0, [6, 26, 46]],
  [10, 346, 18, 2, 68, 2, 69, [6, 28, 50]],
]

const GF_EXP = new Uint8Array(512)
const GF_LOG = new Uint8Array(256)
{
  let x = 1
  for (let i = 0; i < 255; i += 1) {
    GF_EXP[i] = x
    GF_LOG[x] = i
    x <<= 1
    if (x & 0x100) x ^= 0x11d
  }
  for (let i = 255; i < 512; i += 1) GF_EXP[i] = GF_EXP[i - 255]
}

function gfMul(a: number, b: number) {
  return a === 0 || b === 0 ? 0 : GF_EXP[GF_LOG[a] + GF_LOG[b]]
}

function rsGenerator(degree: number): Uint8Array {
  let poly: number[] = [1]
  for (let i = 0; i < degree; i += 1) {
    const next = new Array(poly.length + 1).fill(0)
    const factor = GF_EXP[i]
    for (let j = 0; j < poly.length; j += 1) {
      next[j] ^= poly[j]
      next[j + 1] ^= gfMul(poly[j], factor)
    }
    poly = next
  }
  return new Uint8Array(poly)
}

function rsComputeEc(data: Uint8Array, ecCount: number): Uint8Array {
  const gen = rsGenerator(ecCount)
  const rem = new Uint8Array(ecCount)
  for (const byte of data) {
    const factor = byte ^ rem[0]
    for (let i = 0; i < ecCount - 1; i += 1) rem[i] = rem[i + 1] ^ gfMul(gen[i + 1], factor)
    rem[ecCount - 1] = gfMul(gen[ecCount], factor)
  }
  return rem
}

function formatBits(ecBits: number, mask: number): number {
  const data = (ecBits << 3) | mask
  let rem = data << 10
  for (let i = 4; i >= 0; i -= 1) if (rem & (1 << (i + 10))) rem ^= 0x537 << i
  return ((data << 10) | rem) ^ 0x5412
}

function versionBits(version: number): number {
  let rem = version << 12
  for (let i = 5; i >= 0; i -= 1) if (rem & (1 << (i + 12))) rem ^= 0x1f25 << i
  return (version << 12) | rem
}

export function qrMatrix(text: string): boolean[][] {
  const payload = new TextEncoder().encode(text)
  const spec = QR_SPECS_L.find(([ver, , , b1, d1, b2, d2]) => {
    const capacity = b1 * d1 + b2 * d2
    const headerBytes = ver >= 10 ? 3 : 2
    return payload.length + headerBytes <= capacity
  })
  if (!spec) throw new Error('QR payload exceeds supported offline length.')
  const [ver, , ecPerBlock, b1, d1, b2, d2, align] = spec
  const totalData = b1 * d1 + b2 * d2

  // Bitstream: Byte mode (0100), length (8 or 16 bits), payload, terminator, pad bytes
  const bits: number[] = []
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i -= 1) bits.push((val >>> i) & 1)
  }
  pushBits(0b0100, 4)
  pushBits(payload.length, ver >= 10 ? 16 : 8)
  for (const b of payload) pushBits(b, 8)
  const maxBits = totalData * 8
  pushBits(0, Math.min(4, maxBits - bits.length))
  while (bits.length % 8 !== 0) bits.push(0)
  let padToggle = 0
  while (bits.length < maxBits) {
    pushBits(padToggle % 2 === 0 ? 0xec : 0x11, 8)
    padToggle += 1
  }

  const dataBytes = new Uint8Array(totalData)
  for (let i = 0; i < totalData; i += 1) {
    let v = 0
    for (let b = 0; b < 8; b += 1) v = (v << 1) | bits[i * 8 + b]
    dataBytes[i] = v
  }

  // Split blocks & interleave data + ECC
  const dataBlocks: Uint8Array[] = []
  const ecBlocks: Uint8Array[] = []
  let cursor = 0
  for (let i = 0; i < b1; i += 1) {
    const blk = dataBytes.slice(cursor, cursor + d1)
    cursor += d1
    dataBlocks.push(blk)
    ecBlocks.push(rsComputeEc(blk, ecPerBlock))
  }
  for (let i = 0; i < b2; i += 1) {
    const blk = dataBytes.slice(cursor, cursor + d2)
    cursor += d2
    dataBlocks.push(blk)
    ecBlocks.push(rsComputeEc(blk, ecPerBlock))
  }

  const finalBytes: number[] = []
  const maxDataBlock = Math.max(d1, d2)
  for (let i = 0; i < maxDataBlock; i += 1) {
    for (const blk of dataBlocks) if (i < blk.length) finalBytes.push(blk[i])
  }
  for (let i = 0; i < ecPerBlock; i += 1) {
    for (const ec of ecBlocks) finalBytes.push(ec[i])
  }

  const size = ver * 4 + 17
  const modules: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false))
  const isFunc: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false))
  const setFn = (r: number, c: number, dark: boolean) => {
    if (r < 0 || c < 0 || r >= size || c >= size) return
    modules[r][c] = dark
    isFunc[r][c] = true
  }

  // Finder patterns + separators
  const drawFinder = (r0: number, c0: number) => {
    for (let dr = -1; dr <= 7; dr += 1) {
      for (let dc = -1; dc <= 7; dc += 1) {
        const r = r0 + dr, c = c0 + dc
        if (r < 0 || c < 0 || r >= size || c >= size) continue
        const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6
        const dark = inOuter && (dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4))
        setFn(r, c, dark)
      }
    }
  }
  drawFinder(0, 0)
  drawFinder(0, size - 7)
  drawFinder(size - 7, 0)

  // Timing patterns
  for (let i = 8; i < size - 8; i += 1) {
    setFn(6, i, i % 2 === 0)
    setFn(i, 6, i % 2 === 0)
  }

  // Alignment patterns
  for (const r of align) {
    for (const c of align) {
      if ((r === 6 && c === 6) || (r === 6 && c === size - 7) || (r === size - 7 && c === 6)) continue
      for (let dr = -2; dr <= 2; dr += 1) {
        for (let dc = -2; dc <= 2; dc += 1) {
          const dist = Math.max(Math.abs(dr), Math.abs(dc))
          setFn(r + dr, c + dc, dist !== 1)
        }
      }
    }
  }

  // Reserve format info + dark module
  for (let i = 0; i < 9; i += 1) {
    if (!isFunc[8][i]) setFn(8, i, false)
    if (!isFunc[i][8]) setFn(i, 8, false)
  }
  for (let i = 0; i < 8; i += 1) {
    setFn(8, size - 1 - i, false)
    setFn(size - 1 - i, 8, false)
  }
  setFn(size - 8, 8, true)

  // Version info (v >= 7)
  if (ver >= 7) {
    const vb = versionBits(ver)
    for (let i = 0; i < 18; i += 1) {
      const bit = Boolean((vb >>> i) & 1)
      const a = size - 11 + (i % 3)
      const b = Math.floor(i / 3)
      setFn(b, a, bit)
      setFn(a, b, bit)
    }
  }

  // Place data bits (Mask 0: (r + c) % 2 === 0)
  const mask = 0
  let bitIdx = 0
  const totalBits = finalBytes.length * 8
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5
    const upward = ((right + 1) & 2) === 0
    for (let vert = 0; vert < size; vert += 1) {
      const r = upward ? size - 1 - vert : vert
      for (let j = 0; j < 2; j += 1) {
        const c = right - j
        if (isFunc[r][c]) continue
        let dark = false
        if (bitIdx < totalBits) {
          dark = Boolean((finalBytes[bitIdx >>> 3] >>> (7 - (bitIdx & 7))) & 1)
          bitIdx += 1
        }
        if ((r + c) % 2 === 0) dark = !dark
        modules[r][c] = dark
      }
    }
  }

  // Write format info (EC Level L = 0b01, Mask 0)
  const fmt = formatBits(0b01, mask)
  for (let i = 0; i <= 5; i += 1) modules[8][i] = Boolean((fmt >>> (14 - i)) & 1)
  modules[8][7] = Boolean((fmt >>> 8) & 1)
  modules[8][8] = Boolean((fmt >>> 7) & 1)
  modules[7][8] = Boolean((fmt >>> 6) & 1)
  for (let i = 9; i < 15; i += 1) modules[14 - i][8] = Boolean((fmt >>> (14 - i)) & 1)
  for (let i = 0; i < 8; i += 1) modules[8][size - 1 - i] = Boolean((fmt >>> i) & 1)
  for (let i = 0; i < 7; i += 1) modules[size - 7 + i][8] = Boolean((fmt >>> (14 - i)) & 1)

  return modules
}

export function renderQrSvg(text: string, sizePx = 176): string {
  const mat = qrMatrix(text)
  const n = mat.length
  const quiet = 4
  const total = n + quiet * 2
  const rects: string[] = []
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      if (mat[r][c]) rects.push(`<rect x="${c + quiet}" y="${r + quiet}" width="1" height="1"/>`)
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${sizePx}" height="${sizePx}" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges" role="img" aria-label="Offline 2FA QR Code"><rect width="${total}" height="${total}" fill="#ffffff"/><g fill="#0f172a">${rects.join('')}</g></svg>`
}

export function printRecoveryCodesSlip(w: Window, expertName: string, codes: string[], stationName = 'TunaEye Station 01'): void {
  const d = w.document
  const esc = (v: string) => v.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
  d.querySelector('iframe[data-recovery-slip]')?.remove()
  const frame = d.createElement('iframe')
  frame.setAttribute('data-recovery-slip', '')
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:58mm;height:1px;border:0;pointer-events:none'
  frame.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:58mm auto;margin:0}body{margin:0;padding:3mm 4mm;width:58mm;font:11px/1.35 'Courier New',monospace;color:#000}h1{font-size:13px;text-align:center;margin:0 0 2mm}hr{border:0;border-top:1px dashed #000;margin:2mm 0}.code{font-size:14px;font-weight:700;letter-spacing:1.5px;text-align:center;margin:1.5mm 0}p{margin:1mm 0;text-align:center;font-size:10px}</style></head><body><h1>${esc(stationName)}</h1><p>OFFLINE 2FA RECOVERY CODES</p><hr><p>Expert: <b>${esc(expertName)}</b></p><p>${esc(new Date().toLocaleString())}</p><hr>${codes.map((c, i) => `<div class="code">${i + 1}. ${esc(c)}</div>`).join('')}<hr><p>Each code works ONCE if your<br>authenticator phone is unavailable.<br>Keep this slip secure.</p></body></html>`
  frame.onload = () => {
    frame.contentWindow?.print()
    frame.contentWindow?.addEventListener('afterprint', () => frame.remove(), { once: true })
  }
  d.body.append(frame)
}
