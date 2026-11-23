// Converts the geoBoundaries COD ADM1 GeoJSON into compact SVG paths keyed by ISO 3166-2 code.
// Usage: node geo2svg.mjs <input.geojson> <output.ts>
import { readFileSync, writeFileSync } from 'node:fs';

const [, , input, output] = process.argv;
const g = JSON.parse(readFileSync(input, 'utf8'));

const SCALE = 50; // px per degree (equirectangular; the DRC straddles the equator so distortion is small)
const TOL = 0.025; // Douglas-Peucker tolerance in degrees (~2.8 km)

let minX = Infinity,
  maxX = -Infinity,
  minY = Infinity,
  maxY = -Infinity;
for (const f of g.features) {
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  for (const poly of polys)
    for (const ring of poly)
      for (const [x, y] of ring) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
}

function dp(points, tol) {
  if (points.length < 3) return points;
  const [ax, ay] = points[0],
    [bx, by] = points[points.length - 1];
  let idx = -1,
    max = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i];
    const dx = bx - ax,
      dy = by - ay;
    const len = Math.hypot(dx, dy) || 1e-12;
    const d = Math.abs(dy * px - dx * py + bx * ay - by * ax) / len;
    if (d > max) {
      max = d;
      idx = i;
    }
  }
  if (max <= tol) return [points[0], points[points.length - 1]];
  return [...dp(points.slice(0, idx + 1), tol).slice(0, -1), ...dp(points.slice(idx), tol)];
}

const px = ([x, y]) => [+((x - minX) * SCALE).toFixed(1), +((maxY - y) * SCALE).toFixed(1)];

const out = {};
for (const f of g.features) {
  const iso = f.properties.shapeISO;
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  let d = '';
  let area = 0,
    cx = 0,
    cy = 0;
  for (const poly of polys) {
    for (const ring of poly) {
      // Split the closed ring in two halves so DP keeps its shape.
      const half = Math.floor(ring.length / 2);
      const simplified = [...dp(ring.slice(0, half + 1), TOL).slice(0, -1), ...dp(ring.slice(half), TOL)];
      if (simplified.length < 4) continue;
      const pts = simplified.map(px);
      d += 'M' + pts.map((p) => p.join(',')).join('L') + 'Z';
    }
    // Area-weighted centroid of the outer ring, for labels.
    const ring = poly[0].map(px);
    for (let i = 0; i < ring.length - 1; i++) {
      const [x0, y0] = ring[i],
        [x1, y1] = ring[i + 1];
      const c = x0 * y1 - x1 * y0;
      area += c;
      cx += (x0 + x1) * c;
      cy += (y0 + y1) * c;
    }
  }
  out[iso] = { d, cx: +(cx / (3 * area)).toFixed(1), cy: +(cy / (3 * area)).toFixed(1) };
}

const width = +((maxX - minX) * SCALE).toFixed(1);
const height = +((maxY - minY) * SCALE).toFixed(1);
const body = Object.entries(out)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([k, v]) => `  '${k}': { d: '${v.d}', cx: ${v.cx}, cy: ${v.cy} },`)
  .join('\n');

writeFileSync(
  output,
  `// Generated from geoBoundaries gbOpen COD ADM1 (© OpenStreetMap contributors, ODbL 1.0).
// Equirectangular projection, ${SCALE} px per degree, simplified to ~${TOL}°. Do not edit by hand:
// see docs/data-sources.md for how to regenerate.
import type { ProvinceCode } from '@acorep/shared';

export const DRC_VIEWBOX = { width: ${width}, height: ${height} };
/** Converts a longitude/latitude to the map's SVG coordinates (for cities and points of entry). */
export const project = (lon: number, lat: number) => ({ x: (lon - ${minX}) * ${SCALE}, y: (${maxY} - lat) * ${SCALE} });

export const PROVINCE_SHAPES: Record<ProvinceCode, { d: string; cx: number; cy: number }> = {
${body}
};
`,
);
console.log('provinces', Object.keys(out).length, 'bytes', body.length, 'viewBox', width, height);
