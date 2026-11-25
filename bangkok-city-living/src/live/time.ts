import type { Period } from './types.ts';

/** Bangkok is UTC+7 all year (no daylight saving). */
const OFFSET_MS = 7 * 3600_000;

const LOCAL = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/;

/** Parse "YYYY-MM-DD HH:mm[:ss]" written in Bangkok local time. */
export function parseBangkokLocal(text: string): number | null {
  const m = LOCAL.exec(text.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  return Date.UTC(+y, +mo - 1, +d, +h, +mi, s ? +s : 0) - OFFSET_MS;
}

const TRAFFY = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?\+00$/;

/** Parse Traffy Fondue's "2026-11-25 09:55:55.475515+00" (UTC, microseconds). */
export function parseTraffyTimestamp(text: string): number | null {
  const m = TRAFFY.exec(text.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi, s, frac = '0'] = m;
  return Date.UTC(+y, +mo - 1, +d, +h, +mi, +s, Math.floor(+frac.padEnd(3, '0').slice(0, 3)));
}

function local(ms: number) {
  return new Date(ms + OFFSET_MS);
}

export function bangkokHour(ms: number) {
  return local(ms).getUTCHours();
}

export function bangkokClock(ms: number) {
  const d = local(ms);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

export function isBangkokWeekend(ms: number) {
  const day = local(ms).getUTCDay();
  return day === 0 || day === 6;
}

/** Same bands as the time-of-day selector on the home page. */
export function periodOf(hour: number): Period {
  if (hour >= 6 && hour <= 9) return 'morning';
  if (hour >= 10 && hour <= 15) return 'noon';
  if (hour >= 16 && hour <= 20) return 'evening';
  return 'night';
}
