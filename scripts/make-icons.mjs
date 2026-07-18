// 產生 PWA 圖示（純 Node，不需外部套件）：
// 米白底 + 品牌手刷 m 筆觸，輸出 192 / 512 / maskable / apple-touch-icon。
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons')
mkdirSync(OUT, { recursive: true })

const IVORY = [0xef, 0xea, 0xe1]
const TAUPE = [0x6e, 0x66, 0x5b]
const INK = [0x1a, 0x17, 0x14]

// ---- 最小 PNG 編碼器 ----
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}
function encodePNG(pixels, w, h) {
  const raw = Buffer.alloc((w * 3 + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0 // filter: none
    pixels.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // color type: RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ---- 繪圖：填色 + 圓形筆刷描出二次貝茲曲線 ----
function makeCanvas(size, rgb) {
  const px = Buffer.alloc(size * size * 3)
  for (let i = 0; i < size * size; i++) px.set(rgb, i * 3)
  return px
}
function stampDisc(px, size, cx, cy, r, rgb) {
  const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(size - 1, Math.ceil(cx + r))
  const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(size - 1, Math.ceil(cy + r))
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++)
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) px.set(rgb, (y * size + x) * 3)
}
// 品牌 m 筆觸（brushmark.svg 的路徑,座標系 168×44、線寬 9）
const SEGS = [
  [8, 27, 22, 7, 36, 25],
  [36, 25, 50, 43, 64, 23],
  [64, 23, 78, 5, 92, 25],
  [92, 25, 106, 43, 120, 23],
  [120, 23, 134, 7, 148, 27],
]
function drawBrush(px, size) {
  const scale = (size * 0.72) / 168
  const ox = (size - 168 * scale) / 2
  const oy = (size - 44 * scale) / 2
  const r = (9 / 2) * scale
  for (const [x0, y0, cx, cy, x1, y1] of SEGS) {
    for (let i = 0; i <= 120; i++) {
      const t = i / 120
      const mt = 1 - t
      const x = mt * mt * x0 + 2 * mt * t * cx + t * t * x1
      const y = mt * mt * y0 + 2 * mt * t * cy + t * t * y1
      stampDisc(px, size, ox + x * scale, oy + y * scale, r, TAUPE)
    }
  }
  stampDisc(px, size, ox + 156 * scale, oy + 27 * scale, 4.5 * scale, INK)
}
function makeIcon(size, file) {
  const px = makeCanvas(size, IVORY)
  drawBrush(px, size)
  writeFileSync(join(OUT, file), encodePNG(px, size, size))
  console.log('✅', file)
}

makeIcon(192, 'icon-192.png')
makeIcon(512, 'icon-512.png')
makeIcon(512, 'icon-maskable-512.png')
makeIcon(180, 'apple-touch-icon.png')
