import type { LatLon } from './types.ts';

const EARTH_KM = 6371;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in kilometres. */
export function distanceKm(a: LatLon, b: LatLon) {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h));
}

/** Bangkok and the adjoining parts of Nonthaburi, Pathum Thani and Samut Prakan. */
export const BANGKOK_BBOX = { south: 13.45, north: 14.0, west: 100.3, east: 100.95 } as const;

export function inBangkok({ lat, lon }: LatLon) {
  const b = BANGKOK_BBOX;
  return lat >= b.south && lat <= b.north && lon >= b.west && lon <= b.east;
}

/** Items within `km` of `at`, nearest first. */
export function withinKm<T extends { at: LatLon }>(items: readonly T[], at: LatLon, km: number) {
  return items
    .map((item) => ({ item, km: distanceKm(at, item.at) }))
    .filter((x) => x.km <= km)
    .sort((a, b) => a.km - b.km);
}
