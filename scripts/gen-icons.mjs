import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

function crc32(buf) {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  let crc = -1
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff]
  return (crc ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}

function png(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0 // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4)
  }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}

function inRoundRect(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false
  const cx = Math.max(x0 + r, Math.min(x, x1 - r))
  const cy = Math.max(y0 + r, Math.min(y, y1 - r))
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r
}

function drawIcon(size) {
  const buf = Buffer.alloc(size * size * 4)
  const s = size / 512
  const bg = [79, 110, 247] // #4F6EF7
  const white = [255, 255, 255]
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let c = null
      if (inRoundRect(x, y, 16 * s, 16 * s, 496 * s, 496 * s, 100 * s)) c = bg
      // 装订环
      for (const px of [160, 352]) {
        if (inRoundRect(x, y, (px - 11) * s, 84 * s, (px + 11) * s, 136 * s, 11 * s)) c = white
      }
      // 白色面板
      if (inRoundRect(x, y, 96 * s, 112 * s, 416 * s, 400 * s, 40 * s)) {
        c = y < 168 * s ? bg : white
      }
      // 课表格子
      for (const dx of [152, 256, 360]) {
        for (const dy of [244, 324]) {
          if ((x - dx * s) ** 2 + (y - dy * s) ** 2 <= 21 * s * 21 * s) c = bg
        }
      }
      const i = (y * size + x) * 4
      if (c) {
        buf[i] = c[0]
        buf[i + 1] = c[1]
        buf[i + 2] = c[2]
        buf[i + 3] = 255
      }
    }
  }
  return png(size, size, buf)
}

mkdirSync('public', { recursive: true })
writeFileSync('public/icon-192.png', drawIcon(192))
writeFileSync('public/icon-512.png', drawIcon(512))
console.log('icons written to public/')
