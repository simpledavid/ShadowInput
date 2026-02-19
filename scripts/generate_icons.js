/**
 * generate_icons.js
 * Creates PNG icons for ShadowInput with a cyberpunk-themed "S" mark.
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

function pointInPolygon(px, py, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i][0];
    const yi = points[i][1];
    const xj = points[j][0];
    const yj = points[j][1];

    const intersect =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / ((yj - yi) || 1e-6) + xi;

    if (intersect) inside = !inside;
  }
  return inside;
}

function createIconPNG(size) {
  const pointsMain = buildCurvePoints();
  const pointsMid = translatePoints(pointsMain, 1.1 / 48, 1.3 / 48);
  const pointsShadow = translatePoints(pointsMain, 2.2 / 48, 2.1 / 48);

  const framePoints = [
    [13 / 48, 8 / 48],
    [27 / 48, 8 / 48],
    [36 / 48, 16 / 48],
    [36 / 48, 33 / 48],
    [20 / 48, 33 / 48],
    [11 / 48, 25 / 48],
    [11 / 48, 12 / 48],
  ];
  const framePolyline = [...framePoints, framePoints[0]];

  const pixels = [];
  const radius = 11 / 48;
  const innerRadius = radius - 2.1 / 48;

  for (let y = 0; y < size; y++) {
    pixels.push(0); // filter byte
    for (let x = 0; x < size; x++) {
      const nx = (x + 0.5) / size;
      const ny = (y + 0.5) / size;

      let rgb = [7, 10, 22];

      if (isInsideRoundedRect(nx, ny, radius)) {
        const gradT = clamp(0.5 * nx + 0.9 * ny, 0, 1);
        rgb = [
          Math.round(mix(25, 7, gradT)),
          Math.round(mix(42, 10, gradT)),
          Math.round(mix(86, 22, gradT)),
        ];

        const glowDist = Math.hypot(nx - 0.25, ny - 0.2);
        const glowA = clamp(1 - glowDist / 0.78, 0, 1);
        rgb = blendRgb(rgb, [120, 245, 255], 0.35 * glowA * glowA);

        const magDist = Math.hypot(nx - 0.78, ny - 0.82);
        const magA = clamp(1 - magDist / 0.64, 0, 1);
        rgb = blendRgb(rgb, [255, 106, 232], 0.2 * magA * magA);

        const vignetteDist = Math.hypot(nx - 0.5, ny - 0.5);
        const vignette = clamp((vignetteDist - 0.24) * 1.18, 0, 1);
        rgb = blendRgb(rgb, [4, 6, 14], 0.58 * vignette);

        const isInBorder = !isInsideRoundedRect(nx, ny, innerRadius);
        if (isInBorder) {
          const borderColor = [
            Math.round(mix(130, 255, clamp(nx * 0.95, 0, 1))),
            Math.round(mix(246, 124, clamp(nx * 0.95, 0, 1))),
            Math.round(mix(255, 238, clamp(nx * 0.95, 0, 1))),
          ];
          rgb = blendRgb(rgb, borderColor, 0.85);
        }
      }

      if (pointInPolygon(nx, ny, framePoints)) {
        rgb = blendRgb(rgb, [10, 18, 42], 0.78);
      }

      const dFrame = minDistanceToPolyline(nx, ny, framePolyline);
      const frameA = 1 - smoothstep(0.012, 0.031, dFrame);
      rgb = blendRgb(rgb, [141, 246, 255], frameA * 0.9);

      const dShadow = minDistanceToPolyline(nx, ny, pointsShadow);
      const shadowA = 1 - smoothstep(0.061, 0.097, dShadow);
      rgb = blendRgb(rgb, [124, 46, 148], shadowA * 0.62);

      const dMid = minDistanceToPolyline(nx, ny, pointsMid);
      const midA = 1 - smoothstep(0.048, 0.082, dMid);
      rgb = blendRgb(rgb, [151, 252, 255], midA * 0.62);

      const dMain = minDistanceToPolyline(nx, ny, pointsMain);
      const mainA = 1 - smoothstep(0.033, 0.062, dMain);
      const mainColor = [
        Math.round(mix(233, 126, clamp((ny - 0.18) / 0.7, 0, 1))),
        Math.round(mix(251, 240, clamp((ny - 0.18) / 0.7, 0, 1))),
        Math.round(mix(255, 255, clamp((ny - 0.18) / 0.7, 0, 1))),
      ];
      rgb = blendRgb(rgb, mainColor, mainA);

      const nodeD = Math.hypot(nx - 31.2 / 48, ny - 11.7 / 48);
      const nodeA = 1 - smoothstep(0.035, 0.058, nodeD);
      rgb = blendRgb(rgb, [255, 122, 234], nodeA);

      const barLeft = nx > 8.8 / 48 && nx < 15.4 / 48 && ny > 33.8 / 48 && ny < 35.8 / 48;
      if (barLeft) rgb = blendRgb(rgb, [136, 247, 255], 0.92);
      const barRight = nx > 33.2 / 48 && nx < 39.2 / 48 && ny > 37.3 / 48 && ny < 39.3 / 48;
      if (barRight) rgb = blendRgb(rgb, [255, 126, 234], 0.9);

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
