import { withinKm } from '../geo.ts';
import { bangkokClock, bangkokHour } from '../time.ts';
import type { CauseKey, CauseResult, Hotspot, RankedCause, TrafficEvent, WeatherNow } from '../types.ts';
import { activeEvents, recentReports, type Signals } from './congestion.ts';

export type CauseContext = Signals & { weather: WeatherNow | null };

/** Rush hours from Transit Bangkok (07:00-09:00 and 17:30-20:00), with shoulders either side. */
const RUSH = new Set([7, 8, 9, 17, 18, 19]);
const SHOULDER = new Set([6, 16, 20]);
/** Tie-break order: specific, live causes before general ones. */
const ORDER: CauseKey[] = ['accident', 'rain', 'construction', 'event', 'rush', 'junction'];

const km = (d: number) => `${d.toFixed(1)} กม.`;

/** Scores each cause from 0 to 1 using live evidence near the junction. */
export function classifyCauses(h: Hotspot, c: CauseContext): CauseResult {
  const scores = new Map<CauseKey, { score: number; reasons: string[] }>();
  const add = (cause: CauseKey, score: number, reason: string) => {
    const cur = scores.get(cause) ?? { score: 0, reasons: [] };
    cur.score = Math.min(1, cur.score + score);
    cur.reasons.push(reason);
    scores.set(cause, cur);
  };

  const hour = bangkokHour(c.nowMs);
  if (RUSH.has(hour)) add('rush', c.weekend ? 0.3 : 0.6, 'อยู่ในชั่วโมงเร่งด่วน');
  else if (SHOULDER.has(hour)) add('rush', c.weekend ? 0.15 : 0.35, 'ใกล้ชั่วโมงเร่งด่วน');

  if (c.rain === 'heavy') add('rain', 0.85, 'ฝนตกหนักอยู่ตอนนี้');
  else if (c.rain === 'light') add('rain', 0.5, 'ฝนตกอยู่ตอนนี้');
  else {
    const chance = Math.max(0, ...(c.weather?.hours.slice(0, 2).map((x) => x.rainProbability) ?? []));
    if (chance >= 60) add('rain', 0.25, `มีโอกาสฝนตก ${chance}% ภายในชั่วโมงหน้า`);
  }

  const live = activeEvents(c.events, c.nowMs);
  const near = (kinds: TrafficEvent['kind'][], radius: number) =>
    withinKm(
      live.filter((e) => kinds.includes(e.kind)),
      h.at,
      radius,
    );

  for (const f of near(['flood'], 2).slice(0, 1)) add('rain', 0.5, `น้ำท่วม: ${f.item.title} (ห่าง ${km(f.km)})`);
  const floods = withinKm(
    recentReports(c.reports, c.nowMs, 3).filter((r) => r.category === 'flood'),
    h.at,
    1.5,
  );
  if (floods.length > 0) add('rain', Math.min(0.6, 0.3 * floods.length), `ประชาชนแจ้งน้ำท่วม ${floods.length} เรื่องในรัศมี 1.5 กม.`);

  const accident = near(['accident'], 2)[0];
  if (accident) {
    add('accident', 0.95 - 0.35 * (accident.km / 2), `${accident.item.title} (ห่าง ${km(accident.km)} เริ่ม ${bangkokClock(accident.item.startMs)} น.)`);
  }
  const fire = near(['fire'], 1)[0];
  if (fire) add('accident', 0.5, `${fire.item.title} (ห่าง ${km(fire.km)})`);
  const breakdown = near(['breakdown', 'jam'], 1)[0];
  if (breakdown) add('accident', 0.45, `${breakdown.item.title} (ห่าง ${km(breakdown.km)})`);

  const works = near(['roadwork', 'closure'], 1.5)[0];
  if (works) add('construction', 0.7 - 0.2 * (works.km / 1.5), `${works.item.title} (ห่าง ${km(works.km)})`);
  const roadReports = withinKm(
    recentReports(c.reports, c.nowMs, 6).filter((r) => r.category === 'roadwork' || r.category === 'obstruction'),
    h.at,
    1,
  );
  if (roadReports.length > 0) {
    add('construction', Math.min(0.3, 0.1 * roadReports.length), `ประชาชนแจ้งปัญหาถนน/กีดขวาง ${roadReports.length} เรื่องในรัศมี 1 กม.`);
  }

  const ev = near(['event'], 2)[0];
  if (ev) add('event', 0.6, `${ev.item.title} (ห่าง ${km(ev.km)})`);

  add('junction', 0.35, 'ทางแยกใหญ่ที่รับรถหลายทิศทาง');
  if (h.overCapacity) add('junction', 0.15, h.overCapacity);
  const jams = withinKm(
    recentReports(c.reports, c.nowMs, 2).filter((r) => r.category === 'traffic'),
    h.at,
    1,
  );
  if (jams.length > 0) add('junction', Math.min(0.3, 0.1 * jams.length), `ประชาชนแจ้งปัญหาจราจร ${jams.length} เรื่องในรัศมี 1 กม.`);

  const ranked: RankedCause[] = ORDER.filter((k) => scores.has(k))
    .map((cause) => ({ cause, score: Math.round(scores.get(cause)!.score * 100) / 100, reasons: scores.get(cause)!.reasons }))
    .sort((a, b) => b.score - a.score);
  return { top: ranked[0].cause, ranked };
}
