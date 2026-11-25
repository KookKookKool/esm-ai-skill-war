import { inBangkok } from '../geo.ts';
import { parseBangkokLocal } from '../time.ts';
import type { EventKind, TrafficEvent } from '../types.ts';
import { isObject, num, str, tidy } from './util.ts';

/** Longdo's public event feed. Events are entered by iTIC staff and partners (police radio, DDPM). */
export const ITIC_FEED_URL = 'https://event.longdo.com/feed/json';

const KIND_BY_ICON: Record<string, EventKind> = {
  accident: 'accident',
  diversion: 'roadwork',
  construction: 'roadwork',
  roadwork: 'roadwork',
  roadclosed: 'closure',
  closure: 'closure',
  flood: 'flood',
  rain: 'flood',
  event: 'event',
  demonstration: 'event',
  fire: 'fire',
  trafficjam: 'jam',
  jam: 'jam',
  breakdown: 'breakdown',
  carbreakdown: 'breakdown',
};

/** Icons in the feed that are not about traffic. */
const IGNORED = new Set(['information', 'news']);

export function normalizeIticEvents(raw: unknown, nowMs: number): TrafficEvent[] {
  if (!Array.isArray(raw)) return [];
  const out: TrafficEvent[] = [];
  for (const e of raw) {
    if (!isObject(e)) continue;
    const icon = str(e.icon).toLowerCase();
    if (IGNORED.has(icon)) continue;
    const lat = num(e.latitude);
    const lon = num(e.longitude);
    const startMs = parseBangkokLocal(str(e.start));
    if (lat === null || lon === null || startMs === null) continue;
    const at = { lat, lon };
    if (!inBangkok(at)) continue;
    const endMs = parseBangkokLocal(str(e.stop));
    if (startMs > nowMs || (endMs !== null && endMs < nowMs)) continue;
    out.push({
      id: `itic-${str(e.eid)}`,
      kind: KIND_BY_ICON[icon] ?? 'other',
      title: tidy(str(e.title) || str(e.title_en), 90),
      detail: tidy(str(e.description) || str(e.description_en), 160),
      at,
      startMs,
      endMs,
    });
  }
  return out;
}
