import { parseBangkokLocal } from '../time.ts';
import type { AirStation, Level } from '../types.ts';
import { isObject, num, str } from './util.ts';

/** Pollution Control Department stations for Bangkok and its surroundings (region 1). */
export const AIR4THAI_URL = 'https://air4thai.pcd.go.th/services/getNewAQI_JSON.php?region=1';

/** PCD PM2.5 bands (µg/m³): very good, good, moderate, starting to affect health, affects health. */
export function pm25Level(value: number): Level {
  if (value <= 15) return 0;
  if (value <= 25) return 1;
  if (value <= 37.5) return 2;
  if (value <= 75) return 3;
  return 4;
}

export function normalizeAirStations(raw: unknown): AirStation[] {
  if (!isObject(raw) || !Array.isArray(raw.stations)) return [];
  const out: AirStation[] = [];
  for (const s of raw.stations) {
    if (!isObject(s) || !str(s.areaEN).includes('Bangkok')) continue;
    const last = isObject(s.AQILast) ? s.AQILast : {};
    const pm = isObject(last.PM25) ? num(last.PM25.value) : null;
    const lat = num(s.lat);
    const lon = num(s.long);
    const measuredMs = parseBangkokLocal(`${str(last.date)} ${str(last.time)}`);
    if (pm === null || pm < 0 || lat === null || lon === null || measuredMs === null) continue;
    out.push({
      id: str(s.stationID),
      name: str(s.nameTH).trim() || str(s.nameEN).trim(),
      at: { lat, lon },
      pm25: pm,
      level: pm25Level(pm),
      measuredMs,
    });
  }
  return out;
}
