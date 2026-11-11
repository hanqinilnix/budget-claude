// Draws the home-screen icons as the app's own day chart: black columns on
// butter, today's column in honey outlined in black, standing on a black
// baseline, as on the Week screen. Run with `node scripts/draw-icons.mjs`.
// Plain Node, no image libraries: each pixel is sampled 4x4 times for smooth
// edges, then written as a PNG.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BUTTER = [0xff, 0xf1, 0xa8];
const HONEY = [0xff, 0xdf, 0x6b];
const BLACK = [0x00, 0x00, 0x00];

// Column heights as a share of the tallest, left to right. The fourth is today.
const COLUMNS = [0.42, 0.68, 0.3, 1, 0.55];
const TODAY = 3;

// Inside a rectangle whose top corners are rounded by radius r.
function inColumn(x, y, left, right, top, bottom, r) {
  if (x < left || x > right || y < top || y > bottom) return false;
  const cy = top + r;
  if (y >= cy) return true;
  const cx = x < left + r ? left + r : x > right - r ? right - r : x;
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

// Shapes in a unit square, (0,0) top left, drawn around the centre at the
// given scale. The maskable icon uses 0.8, keeping the chart inside its safe
// circle.
function colourAt(ux, uy, scale) {
  const x = 0.5 + (ux - 0.5) / scale;
  const y = 0.5 + (uy - 0.5) / scale;

  const left = 0.2;
  const right = 0.8;
  const baseline = 0.74;
  const rule = 0.036;
  const tallest = 0.5;
  const gap = 0.035;
  const width = (right - left - gap * (COLUMNS.length - 1)) / COLUMNS.length;
  const radius = 0.03;
  const outline = 0.026;

  if (y >= baseline && y <= baseline + rule && x >= left - 0.04 && x <= right + 0.04) return BLACK;

  for (let i = 0; i < COLUMNS.length; i++) {
    const l = left + i * (width + gap);
    const r = l + width;
    const top = baseline - tallest * COLUMNS[i];
    if (!inColumn(x, y, l, r, top, baseline, radius)) continue;
    if (i !== TODAY) return BLACK;
    return inColumn(x, y, l + outline, r - outline, top + outline, baseline, Math.max(radius - outline, 0.004)) ? HONEY : BLACK;
  }
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
