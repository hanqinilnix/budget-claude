// Draws the home-screen icons: a black pie on butter, with one slice pulled
// out in honey. Run with `node scripts/draw-icons.mjs`. Plain Node, no image
// libraries: each pixel is sampled 4x4 times for smooth edges, then written
// as a PNG.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BUTTER = [0xff, 0xf1, 0xa8];
const HONEY = [0xff, 0xdf, 0x6b];
const BLACK = [0x00, 0x00, 0x00];

// Shapes in a unit square, (0,0) top left. The pie fills most of the icon;
// the maskable icon keeps it inside the safe circle, which is 80% wide.
function colourAt(x, y, scale) {
  const cx = 0.5 - 0.02 * scale; // nudged down and left, to balance the slice
  const cy = 0.5 + 0.02 * scale;
  const r = 0.33 * scale;
  // The slice runs from 12 o'clock to 3 o'clock and is pushed out along 1:30.
  const push = 0.045 * scale;
  const sx = cx + push * Math.SQRT1_2;
  const sy = cy - push * Math.SQRT1_2;

  const inSlice = (px, py, radius) => {
    const dx = px - sx;
    const dy = py - sy;
    return dx >= 0 && dy <= 0 && dx * dx + dy * dy <= radius * radius;
  };
  const inPie = (px, py, radius) => {
    const dx = px - cx;
    const dy = py - cy;
    return !(dx >= 0 && dy <= 0) && dx * dx + dy * dy <= radius * radius;
  };

  const ring = 0.028 * scale;
  if (inSlice(x, y, r)) return inSlice(x, y, r - ring) && x - sx > ring && sy - y > ring ? HONEY : BLACK;
  if (inPie(x, y, r)) return BLACK;
  return BUTTER;
}

function draw(size, scale) {
  const samples = 4;
  const rows = [];
  for (let py = 0; py < size; py++) {
    const row = Buffer.alloc(1 + size * 3);
    for (let px = 0; px < size; px++) {
      const sum = [0, 0, 0];
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const c = colourAt((px + (sx + 0.5) / samples) / size, (py + (sy + 0.5) / samples) / size, scale);
          sum[0] += c[0];
          sum[1] += c[1];
          sum[2] += c[2];
        }
      }
      for (let i = 0; i < 3; i++) row[1 + px * 3 + i] = Math.round(sum[i] / (samples * samples));
    }
    rows.push(row);
  }
  return png(size, Buffer.concat(rows));
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function png(size, raw) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // truecolour
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const out = new URL('../public/icons/', import.meta.url);
writeFileSync(new URL('apple-touch-icon.png', out), draw(180, 1));
writeFileSync(new URL('icon-192.png', out), draw(192, 1));
writeFileSync(new URL('icon-512.png', out), draw(512, 1));
writeFileSync(new URL('icon-maskable-512.png', out), draw(512, 0.8));
console.log('Drew 4 icons in public/icons');
