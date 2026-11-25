import { withinKm } from '../geo.ts';
import { bangkokHour } from '../time.ts';
import type { CitizenReport, CongestionResult, FlowReading, Hotspot, Level, RainIntensity, TrafficEvent } from '../types.ts';

/**
 * Free-flow speed implied by TomTom's Bangkok 2025 figures: 23.3 km/h at 88.4% (morning rush)
 * and 19.1 km/h at 126.5% (evening rush) both work back to about 43.5 km/h.
 */
export const FREE_FLOW_KMH = 43.5;

/**
 * Typical extra travel time by hour on a weekday, in percent. Shaped so the 07-09 and 17-19
 * averages match TomTom's 2025 morning (88.4%) and evening (126.5%) rush-hour levels.
 */
const WEEKDAY_EXTRA = [12, 8, 6, 6, 10, 22, 55, 82, 96, 87, 64, 60, 62, 60, 58, 66, 92, 118, 135, 126, 92, 62, 40, 22];
const WEEKEND_FACTOR = 0.75;
/** Junctions are slower than the city average; sourced over-capacity junctions more so. */
const JUNCTION_FACTOR = 1.1;
const OVER_CAPACITY_FACTOR = 1.25;
/**
 * Extra-time breakpoints for index 0/20/40/60/80/100. The level bands follow the travel-time
 * ratio: under 1.25x free flow is free, 1.6x is busy, 2x congested, 2.6x heavy, 3.6x saturates.
 */
const INDEX_BREAKS = [0, 25, 60, 100, 160, 260];

export function baselineExtra(hour: number, weekend: boolean) {
  return WEEKDAY_EXTRA[hour] * (weekend ? WEEKEND_FACTOR : 1);
}

export function extraToIndex(extraPct: number) {
  const x = Math.max(0, extraPct);
  for (let i = 1; i < INDEX_BREAKS.length; i++) {
    const lo = INDEX_BREAKS[i - 1];
    const hi = INDEX_BREAKS[i];
    if (x < hi) return Math.round((i - 1) * 20 + ((x - lo) / (hi - lo)) * 20);
  }
  return 100;
}

/** Same bands as the home page legend. */
export function toLevel(index: number): Level {
  if (index < 20) return 0;
  if (index < 40) return 1;
  if (index < 60) return 2;
  if (index < 80) return 3;
  return 4;
}

export function speedFor(extraPct: number) {
  return FREE_FLOW_KMH / (1 + extraPct / 100);
}

export function tenKmMinutes(extraPct: number) {
  return (10 / speedFor(extraPct)) * 60;
}

export type Signals = {
  nowMs: number;
  weekend: boolean;
  rain: RainIntensity;
  events: TrafficEvent[];
  reports: CitizenReport[];
};

export function activeEvents(events: TrafficEvent[], nowMs: number) {
  return events.filter((e) => e.startMs <= nowMs && (e.endMs === null || e.endMs >= nowMs));
}

export function recentReports(reports: CitizenReport[], nowMs: number, hours: number) {
  return reports.filter((r) => r.reportedMs <= nowMs && r.reportedMs >= nowMs - hours * 3600_000);
}

const km = (d: number) => `${d.toFixed(1)} กม.`;

/** Rule-based estimate from the time of day plus live signals near the junction. */
export function estimateCongestion(h: Hotspot, s: Signals): CongestionResult {
  const base = baselineExtra(bangkokHour(s.nowMs), s.weekend) * (h.overCapacity ? OVER_CAPACITY_FACTOR : JUNCTION_FACTOR);
  const adjustments: string[] = [];
  let extra = base;
  const add = (pct: number, why: string) => {
    extra += pct;
    adjustments.push(`${why} +${pct}%`);
  };

  if (s.rain === 'heavy') add(40, 'ฝนตกหนัก');
  else if (s.rain === 'light') add(15, 'ฝนตก');

  const live = activeEvents(s.events, s.nowMs);
  const nearest = (kinds: TrafficEvent['kind'][], radius: number) =>
    withinKm(
      live.filter((e) => kinds.includes(e.kind)),
      h.at,
      radius,
    )[0];

  const accident = nearest(['accident'], 2);
  if (accident) add(accident.km <= 1 ? 35 : 15, `อุบัติเหตุห่าง ${km(accident.km)}`);
  const works = nearest(['roadwork', 'closure'], 1.5);
  if (works) add(works.km <= 1 ? 20 : 8, `ปิด/เบี่ยงจราจรห่าง ${km(works.km)}`);
  const ev = nearest(['event'], 2);
  if (ev) add(15, `มีงาน/กิจกรรมห่าง ${km(ev.km)}`);
  const fire = nearest(['fire'], 1);
  if (fire) add(15, `เพลิงไหม้ห่าง ${km(fire.km)}`);
  const breakdown = nearest(['breakdown', 'jam'], 1);
  if (breakdown) add(15, `รถเสีย/รถติดสะสมห่าง ${km(breakdown.km)}`);

  const floodEvent = nearest(['flood'], 2);
  const floodReports = withinKm(
    recentReports(s.reports, s.nowMs, 3).filter((r) => r.category === 'flood'),
    h.at,
    1.5,
  );
  if (floodEvent || floodReports.length > 0) add(25, 'มีรายงานน้ำท่วมใกล้จุดนี้');

  const jams = withinKm(
    recentReports(s.reports, s.nowMs, 2).filter((r) => r.category === 'traffic'),
    h.at,
    1,
  );
  if (jams.length > 0) add(10, `ประชาชนแจ้งปัญหาจราจร ${jams.length} เรื่อง`);

  const index = extraToIndex(extra);
  return {
    extraPct: Math.round(extra),
    index,
    level: toLevel(index),
    speedKmh: Math.round(speedFor(extra)),
    basis: 'estimated',
    confidence: null,
    adjustments,
  };
}

/** TomTom's measured speed against free flow on the road segment at the junction. */
export function measuredCongestion(flow: FlowReading): CongestionResult {
  if (flow.roadClosed || flow.currentKmh <= 0) {
    return { extraPct: 999, index: 100, level: 4, speedKmh: 0, basis: 'measured', confidence: flow.confidence, adjustments: [] };
  }
  const extra = (flow.freeFlowKmh / flow.currentKmh - 1) * 100;
  const index = extraToIndex(extra);
  return {
    extraPct: Math.round(extra),
    index,
    level: toLevel(index),
    speedKmh: Math.round(flow.currentKmh),
    basis: 'measured',
    confidence: flow.confidence,
    adjustments: [],
  };
}
