import { bangkokHour } from '../time.ts';
import type { ForecastHour, TimelineHour, WeatherHour } from '../types.ts';
import { baselineExtra, extraToIndex, toLevel } from './congestion.ts';

const HOUR_MS = 3600_000;
const DAY_MS = 24 * HOUR_MS;
const OFFSET_MS = 7 * HOUR_MS;

/** Start of the Bangkok calendar day that contains `ms`. */
export function bangkokDayStart(ms: number) {
  return Math.floor((ms + OFFSET_MS) / DAY_MS) * DAY_MS - OFFSET_MS;
}

function hourAt(startMs: number, weekend: boolean, weather: WeatherHour[]): ForecastHour {
  const w = weather.find((x) => x.startMs === startMs);
  const p = w?.rainProbability ?? 0;
  let extra = baselineExtra(bangkokHour(startMs), weekend);
  if (p >= 70) extra += 30;
  else if (p >= 40) extra += 15;
  if ((w?.precipitationMm ?? 0) >= 1) extra += 15;
  const index = extraToIndex(extra);
  return { startMs, extraPct: Math.round(extra), index, level: toLevel(index), rainProbability: p };
}

/** City-wide outlook for `count` hours, starting with the current hour. */
export function forecastHours(nowMs: number, weekend: boolean, weather: WeatherHour[], count = 4): ForecastHour[] {
  const first = Math.floor(nowMs / HOUR_MS) * HOUR_MS;
  return Array.from({ length: count }, (_, i) => hourAt(first + i * HOUR_MS, weekend, weather));
}

/** All 24 hours of today (Bangkok), with the past and current hours flagged. */
export function dayHours(nowMs: number, weekend: boolean, weather: WeatherHour[]): TimelineHour[] {
  const start = bangkokDayStart(nowMs);
  return Array.from({ length: 24 }, (_, i) => {
    const startMs = start + i * HOUR_MS;
    return { ...hourAt(startMs, weekend, weather), past: startMs + HOUR_MS <= nowMs, now: startMs <= nowMs && nowMs < startMs + HOUR_MS };
  });
}
