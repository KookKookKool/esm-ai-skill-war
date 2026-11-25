import { distanceKm } from './geo.ts';
import type { LatLon, Line } from './types.ts';

export type { Line } from './types.ts';

const KM_PER_DEG = (6371 * Math.PI) / 180;
const toLatLon = ([lon, lat]: [number, number]): LatLon => ({ lat, lon });

/** Distance from the start of the line to each vertex, in km. */
export function cumulativeKm(line: Line): number[] {
  const out = [0];
  for (let i = 1; i < line.length; i++) out.push(out[i - 1] + distanceKm(toLatLon(line[i - 1]), toLatLon(line[i])));
  return out;
}

export function lineLengthKm(line: Line) {
  const c = cumulativeKm(line);
  return c[c.length - 1] ?? 0;
}

/** The point `km` along the line (clamped to its ends). */
export function pointAt(line: Line, km: number): [number, number] {
  const c = cumulativeKm(line);
  if (km <= 0) return line[0];
  for (let i = 1; i < line.length; i++) {
    if (km <= c[i]) {
      const t = (km - c[i - 1]) / (c[i] - c[i - 1] || 1);
      return [line[i - 1][0] + (line[i][0] - line[i - 1][0]) * t, line[i - 1][1] + (line[i][1] - line[i - 1][1]) * t];
    }
  }
  return line[line.length - 1];
}

/** The part of the line between two distances along it. */
export function sliceLine(line: Line, fromKm: number, toKm: number): Line {
  const c = cumulativeKm(line);
  const out: Line = [pointAt(line, fromKm)];
  for (let i = 0; i < line.length; i++) if (c[i] > fromKm && c[i] < toKm) out.push(line[i]);
  out.push(pointAt(line, toKm));
  return out;
}

/** Where a point falls along the line, and how far it is from it, both in km. */
export function projectOnLine(line: Line, p: LatLon) {
  const c = cumulativeKm(line);
  const ky = KM_PER_DEG;
  const kx = KM_PER_DEG * Math.cos((p.lat * Math.PI) / 180);
  const px = p.lon * kx;
  const py = p.lat * ky;
  let best = { km: 0, offsetKm: Infinity };
  for (let i = 1; i < line.length; i++) {
    const ax = line[i - 1][0] * kx;
    const ay = line[i - 1][1] * ky;
    const dx = line[i][0] * kx - ax;
    const dy = line[i][1] * ky - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
    const offsetKm = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
    if (offsetKm < best.offsetKm) best = { km: c[i - 1] + t * (c[i] - c[i - 1]), offsetKm };
  }
  return best;
}
