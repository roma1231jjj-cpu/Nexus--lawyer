import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const crcTable = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

const crc32 = (buffer) => {
  let crc = -1;
  for (let i = 0; i < buffer.length; i++) crc = (crc >>> 8) ^ crcTable[(crc ^ buffer[i]) & 0xff];
  return (crc ^ -1) >>> 0;
};

const chunk = (type, data) => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
};

const encodePng = (width, height, rgba) => {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
};

const size = 512;
const pixels = Buffer.alloc(size * size * 4);

const clamp = (v) => Math.max(0, Math.min(1, v));
const mix = (a, b, t) => a + (b - a) * t;

const sdRoundRect = (x, y, cx, cy, hw, hh, r) => {
  const qx = Math.abs(x - cx) - (hw - r);
  const qy = Math.abs(y - cy) - (hh - r);
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r;
};

const sdSegment = (x, y, x1, y1, x2, y2) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const t = clamp(((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy));
  return Math.hypot(x - (x1 + dx * t), y - (y1 + dy * t));
};

const insidePolygon = (x, y, points) => {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

const background = (x, y) => {
  const t = (x + y) / (size * 2);
  const r = mix(24, 62, t);
  const g = mix(15, 34, t);
  const b = mix(48, 118, t);
  const glow = Math.max(0, 1 - Math.hypot(x - size * 0.28, y - size * 0.22) / (size * 0.62));
  return [r + glow * 34, g + glow * 18, b + glow * 62];
};

const polyLeft = [
  [150, 232],
  [252, 232],
  [228, 300],
  [174, 300]
];
const polyRight = [
  [260, 232],
  [362, 232],
  [338, 300],
  [284, 300]
];

const shapes = (x, y) => {
  const pole = sdSegment(x, y, size / 2, 128, size / 2, 398) - 7;
  const beam = sdSegment(x, y, 124, 172, 388, 172) - 6;
  const top = Math.hypot(x - size / 2, y - 126) - 15;
  const base = sdRoundRect(x, y, size / 2, 404, 96, 13, 8);
  const leftLineA = sdSegment(x, y, 152, 172, 148, 234) - 4;
  const leftLineB = sdSegment(x, y, 248, 172, 254, 234) - 4;
  const rightLineA = sdSegment(x, y, 262, 172, 258, 234) - 4;
  const rightLineB = sdSegment(x, y, 360, 172, 366, 234) - 4;
  const leftBowl = insidePolygon(x, y, polyLeft) ? -1 : 1;
  const rightBowl = insidePolygon(x, y, polyRight) ? -1 : 1;
  const knob = Math.hypot(x - size / 2, y - 200) - 16;
  return [pole, beam, top, base, leftLineA, leftLineB, rightLineA, rightLineB, leftBowl, rightBowl, knob];
};

const samples = 3;
for (let y = 0; y < size; y++) {
  for (let x = 0; x < size; x++) {
    let r = 0;
    let g = 0;
    let b = 0;
    let a = 0;
    for (let sy = 0; sy < samples; sy++) {
      for (let sx = 0; sx < samples; sx++) {
        const px = x + (sx + 0.5) / samples;
        const py = y + (sy + 0.5) / samples;
        const bgCoverage = sdRoundRect(px, py, size / 2, size / 2, size / 2 - 6, size / 2 - 6, 112) <= 0 ? 1 : 0;
        const [br, bg, bb] = background(px, py);
        let cr = br;
        let cg = bg;
        let cb = bb;
        let ca = bgCoverage;
        const distances = shapes(px, py);
        let ink = 0;
        for (const d of distances) ink = Math.max(ink, clamp(0.5 - d));
        if (ink > 0) {
          const shade = 1 - 0.12 * ((px + py) / (size * 2));
          cr = mix(cr, 243 * shade, ink);
          cg = mix(cg, 235 * shade, ink);
          cb = mix(cb, 255 * shade, ink);
          ca = Math.max(ca, bgCoverage);
        }
        r += cr * ca;
        g += cg * ca;
        b += cb * ca;
        a += ca;
      }
    }
    const total = samples * samples;
    const alpha = a / total;
    const index = (y * size + x) * 4;
    pixels[index] = alpha > 0 ? Math.round(r / a) : 0;
    pixels[index + 1] = alpha > 0 ? Math.round(g / a) : 0;
    pixels[index + 2] = alpha > 0 ? Math.round(b / a) : 0;
    pixels[index + 3] = Math.round(alpha * 255);
  }
}

const png = encodePng(size, size, pixels);
fs.mkdirSync('build', { recursive: true });
fs.writeFileSync(path.join('build', 'icon.png'), png);

const ico = Buffer.concat([
  Buffer.from([0, 0, 1, 0, 1, 0]),
  Buffer.from([0, 0, 0, 0, 1, 0, 32, 0]),
  (() => {
    const b = Buffer.alloc(8);
    b.writeUInt32LE(png.length, 0);
    b.writeUInt32LE(22, 4);
    return b;
  })(),
  png
]);
fs.writeFileSync(path.join('build', 'icon.ico'), ico);
fs.writeFileSync(path.join('build', 'icon-256.png'), encodePng(size, size, pixels));
console.log('build/icon.ico + build/icon.png готовы');
