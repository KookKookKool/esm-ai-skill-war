import { lineLengthKm, projectOnLine, sliceLine } from '../route-geo.ts';
import { bangkokHour } from '../time.ts';
import type { CauseKey, Corridor, HotspotStatus, JamSegment, Level, TrafficEvent } from '../types.ts';
import { activeEvents, FREE_FLOW_KMH, speedFor, toLevel } from './congestion.ts';

export type { Corridor } from '../types.ts';

/** Queue length behind a junction by congestion index: busy, congested, heavy. */
function jamLengthKm(index: number) {
  if (index < 40) return 0;
  if (index < 60) return 0.4;
  if (index < 80) return 0.9;
  return 1.5;
}

/** Weekday commute: into the city in the morning, out of it in the evening. */
function directionFactor(hour: number, weekend: boolean, inbound: boolean) {
  if (weekend) return 1;
  if (hour >= 6 && hour <= 9) return inbound ? 1.25 : 0.75;
  if (hour >= 16 && hour <= 20) return inbound ? 0.75 : 1.25;
  return 1;
}

/** How far traffic backs up behind an incident on the road, and how bad it gets. */
const EVENT_QUEUE: Partial<Record<TrafficEvent['kind'], { km: number; level: Level; cause: CauseKey }>> = {
  accident: { km: 0.8, level: 4, cause: 'accident' },
  closure: { km: 1.2, level: 4, cause: 'construction' },
  breakdown: { km: 0.5, level: 3, cause: 'accident' },
  fire: { km: 0.5, level: 3, cause: 'accident' },
  roadwork: { km: 0.6, level: 3, cause: 'construction' },
  jam: { km: 0.8, level: 3, cause: 'junction' },
  flood: { km: 0.8, level: 3, cause: 'rain' },
};
/** An incident within this distance of a corridor is on it. */
const ON_ROAD_KM = 0.12;
const CLEAR_KM = 0.35;

type Interval = { from: number; to: number; level: Level; cause: CauseKey; speed: number; toName: string; basis: JamSegment['basis']; fromEvent: boolean };

function nameAround(c: Corridor, km: number) {
  return c.landmarks.reduce((a, b) => (Math.abs(b.km - km) < Math.abs(a.km - km) ? b : a)).name;
}

export function buildJams(corridors: Corridor[], hotspots: HotspotStatus[], events: TrafficEvent[], nowMs: number, weekend: boolean): JamSegment[] {
  const hour = bangkokHour(nowMs);
  const byCorridor = new Map<string, Interval[]>(corridors.map((c) => [c.id, []]));

  // Queues behind the junctions.
  for (const c of corridors) {
    const h = hotspots.find((x) => x.id === c.hotspotId);
    if (!h) continue;
    const f = directionFactor(hour, weekend, c.inbound);
    const index = Math.min(100, h.congestion.index * f);
    const length = Math.min(jamLengthKm(index), c.junctionKm);
    if (length <= 0) continue;
    const measured = h.congestion.basis === 'measured';
    byCorridor.get(c.id)!.push({
      from: c.junctionKm - length,
      to: c.junctionKm,
      level: toLevel(index),
      cause: h.causes.top,
      speed: measured ? h.congestion.speedKmh : speedFor(h.congestion.extraPct * f),
      toName: nameAround(c, c.junctionKm),
      basis: measured ? 'measured' : 'estimated',
      fromEvent: false,
    });
  }

  // Queues behind incidents that sit on a corridor. When both directions of a road are equally
  // close, the feed doesn't say which carriageway, so both get the queue.
  for (const e of activeEvents(events, nowMs)) {
    const q = EVENT_QUEUE[e.kind];
    if (!q) continue;
    const hits = corridors
      .map((c) => ({ c, p: projectOnLine(c.line, e.at) }))
      .filter((x) => x.p.offsetKm <= ON_ROAD_KM);
    for (const { c, p } of hits) {
      const best = Math.min(...hits.filter((x) => x.c.road === c.road).map((x) => x.p.offsetKm));
      if (p.offsetKm - best > 0.012) continue;
      byCorridor.get(c.id)!.push({
        from: Math.max(0, p.km - q.km),
        to: p.km,
        level: q.level,
        cause: q.cause,
        speed: q.level === 4 ? 8 : 15,
        toName: `จุดเกิดเหตุ: ${e.title}`,
        basis: 'event',
        fromEvent: true,
      });
    }
  }

  const out: JamSegment[] = [];
  for (const c of corridors) {
    const intervals = byCorridor.get(c.id)!.sort((a, b) => a.from - b.from);
    const merged: Interval[] = [];
    for (const i of intervals) {
      const last = merged[merged.length - 1];
      if (last && i.from <= last.to + 0.05) {
        const stronger = i.level > last.level || (i.level === last.level && i.fromEvent);
        if (i.to > last.to) last.toName = i.toName;
        last.to = Math.max(last.to, i.to);
        if (stronger) {
          last.level = i.level;
          last.cause = i.cause;
          last.basis = i.basis;
          last.fromEvent = i.fromEvent;
        }
        last.speed = Math.min(last.speed, i.speed);
      } else {
        merged.push({ ...i });
      }
    }

    const total = lineLengthKm(c.line);
    for (const m of merged) {
      const length = m.to - m.from;
      const upstream = c.landmarks.filter((l) => l.km <= m.from + 0.15);
      const after = c.landmarks.find((l) => l.km > m.to + 0.05);
      out.push({
        id: `${c.id}:${m.from.toFixed(2)}`,
        corridorId: c.id,
        hotspotId: c.hotspotId,
        road: c.road,
        direction: c.direction,
        cause: m.cause,
        level: m.level,
        speedKmh: Math.round(m.speed),
        delayMin: Math.max(0, Math.round((length / m.speed - length / FREE_FLOW_KMH) * 60)),
        fromKm: m.from,
        toKm: m.to,
        fromName: (upstream[upstream.length - 1] ?? c.landmarks[0]).name,
        toName: m.toName,
        clearName: after ? after.name : `หลัง${m.toName}`,
        line: sliceLine(c.line, m.from, m.to),
        clearLine: sliceLine(c.line, m.to, Math.min(total, m.to + CLEAR_KM)),
        basis: m.basis,
      });
    }
  }
  return out.sort((a, b) => b.level - a.level || b.toKm - b.fromKm - (a.toKm - a.fromKm));
}
