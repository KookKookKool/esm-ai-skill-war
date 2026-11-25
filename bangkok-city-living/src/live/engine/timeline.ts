import type { CitizenReport, TimelineItem, TrafficEvent } from '../types.ts';
import { bangkokDayStart } from './forecast.ts';

const DAY_MS = 24 * 3600_000;

/** Today's events and reports, clipped to the Bangkok day, earliest first. */
export function buildTimelineItems(nowMs: number, events: TrafficEvent[], reports: CitizenReport[]): TimelineItem[] {
  const dayStart = bangkokDayStart(nowMs);
  const dayEnd = dayStart + DAY_MS;
  const items: TimelineItem[] = [];

  for (const e of events) {
    const end = e.endMs ?? nowMs;
    if (e.startMs >= dayEnd || end <= dayStart) continue;
    items.push({
      id: e.id,
      source: 'itic',
      kind: e.kind,
      title: e.title,
      startMs: Math.max(e.startMs, dayStart),
      endMs: Math.min(end, dayEnd),
      fromEarlier: e.startMs < dayStart,
      untilLater: e.endMs === null || e.endMs > dayEnd,
    });
  }
  for (const r of reports) {
    if (r.reportedMs < dayStart || r.reportedMs >= dayEnd) continue;
    items.push({
      id: r.id,
      source: 'traffy',
      kind: r.category,
      title: r.district ? `${r.text} (เขต${r.district})` : r.text,
      startMs: r.reportedMs,
      endMs: null,
      fromEarlier: false,
      untilLater: false,
    });
  }
  return items.sort((a, b) => a.startMs - b.startMs);
}
