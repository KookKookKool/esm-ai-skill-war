/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { advise } from '../engine/advisor.ts';
import { classifyCauses } from '../engine/causes.ts';
import { estimateCongestion, measuredCongestion, tenKmMinutes } from '../engine/congestion.ts';
import { dayHours, forecastHours } from '../engine/forecast.ts';
import { buildTimelineItems } from '../engine/timeline.ts';
import type { CitizenReport, ForecastHour, Hotspot, HotspotStatus, TrafficEvent, WeatherNow } from '../types.ts';

/** Bangkok wall-clock time on Wednesday 25 Nov 2026 (Saturday when `day` is 28). */
const at = (hour: number, minute = 0, day = 25) => Date.UTC(2026, 10, day, hour - 7, minute);

const junction: Hotspot = { id: 'victory', name: 'อนุสาวรีย์ชัยฯ', at: { lat: 13.765, lon: 100.5383 } };
const overloaded: Hotspot = { id: 'asok', name: 'แยกอโศก', at: { lat: 13.7371, lon: 100.5603 }, overCapacity: 'เกินความจุ' };
/** About 0.44 km north of Victory Monument. */
const near = { lat: 13.769, lon: 100.5383 };

function event(kind: TrafficEvent['kind'], startMs = at(11), endMs: number | null = at(14)): TrafficEvent {
  return { id: `e-${kind}`, kind, title: kind, detail: '', at: near, startMs, endMs };
}

function report(category: CitizenReport['category'], reportedMs: number, id = `r-${category}-${reportedMs}`): CitizenReport {
  return { id, category, text: '', district: null, at: near, reportedMs, state: 'รอรับเรื่อง' };
}

function weather(rain: WeatherNow['rain']): WeatherNow {
  return { observedMs: at(12), temperatureC: 31, precipitationMm: 0, weatherCode: 0, rain, hours: [] };
}

const quiet = (nowMs: number) => ({ nowMs, weekend: false, rain: 'none' as const, events: [], reports: [], weather: null });

// ---- Congestion engine

test('congestion: an over-capacity junction at 18:00 on a weekday is gridlocked', () => {
  const c = estimateCongestion(overloaded, quiet(at(18)));
  assert.equal(c.level, 4);
  assert.equal(c.basis, 'estimated');
});

test('congestion: 03:00 is free flow', () => {
  assert.equal(estimateCongestion(junction, quiet(at(3))).level, 0);
});

test('congestion: midday is moderate', () => {
  assert.equal(estimateCongestion(junction, quiet(at(12))).level, 2);
});

test('congestion: the same hour is lighter at the weekend', () => {
  const weekday = estimateCongestion(junction, quiet(at(18)));
  const weekend = estimateCongestion(junction, { ...quiet(at(18, 0, 28)), weekend: true });
  assert.ok(weekend.extraPct < weekday.extraPct, `${weekend.extraPct} vs ${weekday.extraPct}`);
});

test('congestion: a nearby accident raises the estimate and says why', () => {
  const base = estimateCongestion(junction, quiet(at(12)));
  const hit = estimateCongestion(junction, { ...quiet(at(12)), events: [event('accident')] });
  assert.ok(hit.extraPct > base.extraPct);
  assert.equal(hit.adjustments.length, 1);
});

test('congestion: an accident that has not started yet changes nothing', () => {
  const later = estimateCongestion(junction, { ...quiet(at(12)), events: [event('accident', at(13), at(15))] });
  assert.equal(later.extraPct, estimateCongestion(junction, quiet(at(12))).extraPct);
});

test('congestion: heavy rain raises the estimate more than light rain', () => {
  const light = estimateCongestion(junction, { ...quiet(at(12)), rain: 'light' });
  const heavy = estimateCongestion(junction, { ...quiet(at(12)), rain: 'heavy' });
  assert.ok(heavy.extraPct > light.extraPct);
});

test('congestion: a measured reading replaces the estimate', () => {
  const c = measuredCongestion({ currentKmh: 40, freeFlowKmh: 44, confidence: 0.9, roadClosed: false });
  assert.equal(c.basis, 'measured');
  assert.equal(c.level, 0);
  assert.equal(c.speedKmh, 40);
  assert.equal(c.confidence, 0.9);
});

test('congestion: a third of free-flow speed is heavy congestion', () => {
  assert.equal(measuredCongestion({ currentKmh: 15, freeFlowKmh: 45, confidence: 0.9, roadClosed: false }).level, 4);
});

test('congestion: junctions keep their order at the evening peak instead of all reading 100', () => {
  const rain = { ...quiet(at(18)), rain: 'light' as const };
  const plain = estimateCongestion(junction, rain);
  const crash = estimateCongestion(junction, { ...rain, events: [event('accident', at(17), at(19))] });
  assert.ok(plain.index < 100, `plain ${plain.index}`);
  assert.ok(crash.index > plain.index, `crash ${crash.index} vs plain ${plain.index}`);
});

test('congestion: a closed road reads as gridlock with zero speed', () => {
  const c = measuredCongestion({ currentKmh: 30, freeFlowKmh: 44, confidence: 1, roadClosed: true });
  assert.equal(c.index, 100);
  assert.equal(c.speedKmh, 0);
});

test('congestion: an evening-rush level of 126.5% gives TomTom’s 31 minutes per 10 km', () => {
  assert.equal(Math.round(tenKmMinutes(126.5)), 31);
});

// ---- Cause classifier

test('causes: a quiet weekday evening is blamed on rush hour', () => {
  assert.equal(classifyCauses(junction, quiet(at(18))).top, 'rush');
});

test('causes: with nothing going on at 03:00 the junction itself is the cause', () => {
  assert.equal(classifyCauses(junction, quiet(at(3))).top, 'junction');
});

test('causes: an active accident nearby comes first and carries a reason', () => {
  const r = classifyCauses(junction, { ...quiet(at(12)), events: [event('accident')] });
  assert.equal(r.top, 'accident');
  assert.ok(r.ranked[0].reasons.length > 0);
});

test('causes: heavy rain at night is blamed on the rain', () => {
  const r = classifyCauses(junction, { ...quiet(at(23)), rain: 'heavy', weather: weather('heavy') });
  assert.equal(r.top, 'rain');
});

test('causes: a road diversion nearby is blamed on roadworks', () => {
  assert.equal(classifyCauses(junction, { ...quiet(at(12)), events: [event('roadwork', at(8), null)] }).top, 'construction');
});

test('causes: flood reports from the last three hours point to rain', () => {
  const reports = [report('flood', at(11, 30)), report('flood', at(11, 50))];
  assert.equal(classifyCauses(junction, { ...quiet(at(12)), reports }).top, 'rain');
});

test('causes: flood reports older than three hours are ignored', () => {
  const reports = [report('flood', at(7)), report('flood', at(8))];
  assert.equal(classifyCauses(junction, { ...quiet(at(12)), reports }).top, 'junction');
});

test('causes: results are ranked from the strongest score down', () => {
  const r = classifyCauses(junction, { ...quiet(at(18)), events: [event('event', at(17), at(22))] });
  const scores = r.ranked.map((c) => c.score);
  assert.deepEqual(scores, [...scores].sort((a, b) => b - a));
  assert.ok(r.ranked.some((c) => c.cause === 'event'));
});

// ---- Forecast and the day timeline

test('forecast: starts at the current hour and steps hourly', () => {
  assert.deepEqual(
    forecastHours(at(16, 40), false, []).map((h) => h.startMs),
    [at(16), at(17), at(18), at(19)],
  );
});

test('forecast: a likely-rain hour is worse than the same hour without rain', () => {
  const dry = forecastHours(at(16, 40), false, []);
  const wet = forecastHours(at(16, 40), false, [{ startMs: at(17), rainProbability: 80, precipitationMm: 2 }]);
  assert.ok(wet[1].extraPct > dry[1].extraPct);
  assert.equal(wet[1].rainProbability, 80);
  assert.equal(wet[0].rainProbability, 0);
});

test('day timeline: 24 hours from Bangkok midnight with exactly one current hour', () => {
  const hours = dayHours(at(16, 40), false, []);
  assert.equal(hours.length, 24);
  assert.equal(hours[0].startMs, at(0));
  assert.deepEqual(
    hours.flatMap((h, i) => (h.now ? [i] : [])),
    [16],
  );
  assert.equal(hours.filter((h) => h.past).length, 16);
});

test('day timeline: a diversion running for weeks is clipped to today and marked as continuing', () => {
  const diversion = event('roadwork', Date.UTC(2026, 9, 22, 17), Date.UTC(2026, 11, 25, 16, 59));
  const [item] = buildTimelineItems(at(16, 40), [diversion], []);
  assert.equal(item.startMs, at(0));
  assert.equal(item.endMs, at(24));
  assert.equal(item.fromEarlier, true);
  assert.equal(item.untilLater, true);
});

test('day timeline: keeps today’s reports only, in time order', () => {
  const items = buildTimelineItems(at(16, 40), [event('accident', at(16, 18), at(17, 18))], [
    report('traffic', at(15, 0)),
    report('flood', at(9, 0)),
    report('flood', Date.UTC(2026, 10, 24, 10)),
  ]);
  assert.deepEqual(
    items.map((i) => i.startMs),
    [at(9), at(15), at(16, 18)],
  );
});

// ---- Route advisor

function hour(startMs: number, extraPct: number): ForecastHour {
  return { startMs, extraPct, index: Math.min(100, Math.round((extraPct / 150) * 100)), level: 0, rainProbability: 0 };
}

function status(id: string, index: number): HotspotStatus {
  return {
    ...junction,
    id,
    congestion: { extraPct: index, index, level: 0, speedKmh: 20, basis: 'estimated', confidence: null, adjustments: [] },
    causes: { top: 'rush', ranked: [{ cause: 'rush', score: 0.6, reasons: [] }] },
  };
}

test('advisor: recommends the lightest hour and how much time it saves', () => {
  const a = advise([hour(at(18), 135), hour(at(19), 126), hour(at(20), 92), hour(at(21), 62)], []);
  assert.equal(a.best.startMs, at(21));
  assert.equal(a.savingPct, 31);
});

test('advisor: when now is already the lightest hour there is nothing to save', () => {
  const a = advise([hour(at(21), 62), hour(at(22), 70)], []);
  assert.equal(a.best.startMs, at(21));
  assert.equal(a.savingPct, 0);
});

test('advisor: lists the three most congested junctions, worst first', () => {
  const a = advise([hour(at(18), 135)], [status('a', 40), status('b', 90), status('c', 70), status('d', 95)]);
  assert.deepEqual(
    a.avoid.map((x) => x.id),
    ['d', 'b', 'c'],
  );
});
