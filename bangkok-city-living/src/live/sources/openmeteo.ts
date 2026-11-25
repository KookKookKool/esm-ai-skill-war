import { parseBangkokLocal } from '../time.ts';
import type { RainIntensity, WeatherHour, WeatherNow } from '../types.ts';
import { isObject, num, str } from './util.ts';

/** Central Bangkok, current conditions every 15 minutes plus two days of hourly rain. */
export const OPEN_METEO_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=13.7563&longitude=100.5018' +
  '&current=temperature_2m,precipitation,rain,weather_code' +
  '&hourly=precipitation_probability,precipitation&timezone=Asia%2FBangkok&forecast_days=2';

/** WMO weather codes. */
const HEAVY = new Set([63, 65, 66, 67, 81, 82, 95, 96, 99]);
const LIGHT = new Set([51, 53, 55, 56, 57, 61, 80]);

function rainOf(code: number, precipitationMm: number): RainIntensity {
  if (HEAVY.has(code) || precipitationMm >= 1) return 'heavy';
  if (LIGHT.has(code) || precipitationMm >= 0.1) return 'light';
  return 'none';
}

const HOUR_MS = 3600_000;

/** `hoursAhead` hourly entries, starting with the hour that contains `nowMs`. */
export function normalizeWeather(raw: unknown, nowMs: number, hoursAhead = 4): WeatherNow | null {
  if (!isObject(raw) || !isObject(raw.current)) return null;
  const c = raw.current;
  const observedMs = parseBangkokLocal(str(c.time));
  const temperatureC = num(c.temperature_2m);
  const precipitationMm = num(c.precipitation) ?? 0;
  const weatherCode = num(c.weather_code) ?? 0;
  if (observedMs === null || temperatureC === null) return null;

  return {
    observedMs,
    temperatureC,
    precipitationMm,
    weatherCode,
    rain: rainOf(weatherCode, precipitationMm),
    hours: hourly(raw.hourly).filter((h) => h.startMs > nowMs - HOUR_MS).slice(0, hoursAhead),
  };
}

/** Every hourly entry in the response. */
export function hourly(raw: unknown): WeatherHour[] {
  if (!isObject(raw) || !Array.isArray(raw.time)) return [];
  const prob = Array.isArray(raw.precipitation_probability) ? raw.precipitation_probability : [];
  const mm = Array.isArray(raw.precipitation) ? raw.precipitation : [];
  const out: WeatherHour[] = [];
  raw.time.forEach((t, i) => {
    const startMs = parseBangkokLocal(str(t));
    if (startMs === null) return;
    out.push({ startMs, rainProbability: num(prob[i]) ?? 0, precipitationMm: num(mm[i]) ?? 0 });
  });
  return out;
}
