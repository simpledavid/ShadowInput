/**
 * generate_icons.js
 * Creates PNG icons for ShadowInput with a shadow-themed "S" mark.
 * Run with: node scripts/generate_icons.js
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZES = [16, 32, 48, 128];
const OUTPUT_DIR = path.join(__dirname, '..', 'icons');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function blendRgb(base, over, alpha) {
  if (alpha <= 0) return base;
  if (alpha >= 1) return over.slice();
  return [
    Math.round(mix(base[0], over[0], alpha)),
    Math.round(mix(base[1], over[1], alpha)),
    Math.round(mix(base[2], over[2], alpha)),
  ];
}

function isInsideRoundedRect(nx, ny, radius) {
  if (nx >= radius && nx <= 1 - radius) return true;
  if (ny >= radius && ny <= 1 - radius) return true;

  const cx = nx < radius ? radius : 1 - radius;
  const cy = ny < radius ? radius : 1 - radius;
  const dx = nx - cx;
  const dy = ny - cy;
  return dx * dx + dy * dy <= radius * radius;
}

function cubicPoint(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  const a = mt2 * mt;
  const b = 3 * mt2 * t;
  const c = 3 * mt * t2;
  const d = t2 * t;
  return [
    a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
    a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1],
  ];
}

function buildCurvePoints() {
  const segments = [
    [[31, 15], [31, 10], [18, 10], [18, 16]],
    [[18, 16], [18, 22], [30, 22], [30, 29]],
    [[30, 29], [30, 36], [18, 37], [14, 33]],
  ];

  const out = [];
  const samplesPerSegment = 28;
  for (const seg of segments) {
    const [p0, p1, p2, p3] = seg;
    for (let i = 0; i <= samplesPerSegment; i++) {
      const t = i / samplesPerSegment;
      const p = cubicPoint(p0, p1, p2, p3, t);
      out.push([p[0] / 48, p[1] / 48]);
    }
  }
  return out;
}

function distanceToSegment(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const c1 = vx * wx + vy * wy;

  if (c1 <= 0) return Math.hypot(px - ax, py - ay);

  const c2 = vx * vx + vy * vy;
  if (c2 <= c1) return Math.hypot(px - bx, py - by);

  const t = c1 / c2;
  const projX = ax + t * vx;
  const projY = ay + t * vy;
  return Math.hypot(px - projX, py - projY);
}

function minDistanceToPolyline(px, py, points) {
  let minD = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const d = distanceToSegment(px, py, a[0], a[1], b[0], b[1]);
    if (d < minD) minD = d;
  }
  return minD;
}

function translatePoints(points, dx, dy) {
  return points.map((p) => [p[0] + dx, p[1] + dy]);
}

function createIconPNG(size) {
  const pointsMain = buildCurvePoints();
  const pointsMid = translatePoints(pointsMain, 1.3 / 48, 1.4 / 48);
  const pointsShadow = translatePoints(pointsMain, 3.4 / 48, 3.4 / 48);

  const pixels = [];
  const radius = 11 / 48;

  for (let y = 0; y < size; y++) {
    pixels.push(0); // filter byte
    for (let x = 0; x < size; x++) {
      const nx = (x + 0.5) / size;
      const ny = (y + 0.5) / size;

      let rgb = [7, 9, 18];

      if (isInsideRoundedRect(nx, ny, radius)) {
        const gradT = clamp(0.45 * nx + 0.85 * ny, 0, 1);
        rgb = [
          Math.round(mix(44, 7, gradT)),
          Math.round(mix(50, 9, gradT)),
          Math.round(mix(92, 17, gradT)),
        ];

        const glowDist = Math.hypot(nx - 0.28, ny - 0.2);
        const glowA = clamp(1 - glowDist / 0.82, 0, 1);
        rgb = blendRgb(rgb, [156, 171, 255], 0.32 * glowA * glowA);

        const vignetteDist = Math.hypot(nx - 0.5, ny - 0.5);
        const vignette = clamp((vignetteDist - 0.22) * 1.2, 0, 1);
        rgb = blendRgb(rgb, [4, 5, 10], 0.55 * vignette);
      }

      const dShadow = minDistanceToPolyline(nx, ny, pointsShadow);
      const shadowA = 1 - smoothstep(0.072, 0.104, dShadow);
      rgb = blendRgb(rgb, [28, 33, 86], shadowA * 0.95);

      const dMid = minDistanceToPolyline(nx, ny, pointsMid);
      const midA = 1 - smoothstep(0.054, 0.086, dMid);
      rgb = blendRgb(rgb, [73, 89, 217], midA * 0.72);

      const dMain = minDistanceToPolyline(nx, ny, pointsMain);
      const mainA = 1 - smoothstep(0.038, 0.067, dMain);
      const mainColor = [
        Math.round(mix(216, 138, clamp((ny - 0.2) / 0.7, 0, 1))),
        Math.round(mix(224, 158, clamp((ny - 0.2) / 0.7, 0, 1))),
        255,
      ];
      rgb = blendRgb(rgb, mainColor, mainA);

      pixels.push(rgb[0], rgb[1], rgb[2]);
    }
  }

  const rawBuf = Buffer.from(pixels);
  const compressed = zlib.deflateSync(rawBuf);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const size of SIZES) {
  const outPath = path.join(OUTPUT_DIR, `icon${size}.png`);
  const buf = createIconPNG(size);
  fs.writeFileSync(outPath, buf);
  console.log(`Created ${outPath} (${buf.length} bytes)`);
}

console.log('All icons generated in icons/');
