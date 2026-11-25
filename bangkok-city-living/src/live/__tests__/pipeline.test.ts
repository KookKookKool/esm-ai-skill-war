/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCachedSource } from '../server/cache.ts';
import { buildSnapshot, type SnapshotInput } from '../snapshot.ts';
import type { CitizenReport, Hotspot, TrafficEvent } from '../types.ts';

// ---- Per-source cache

function counter<T>(results: (T | Error)[]) {
  let calls = 0;
  return {
    get calls() {
      return calls;
    },
    load: async () => {
      const r = results[Math.min(calls, results.length - 1)];
      calls++;
      if (r instanceof Error) throw r;
      return r;
    },
  };
}

test('cache: serves the cached value inside the TTL without reloading', async () => {
  const src = counter(['v1']);
  const cache = createCachedSource({ ttlMs: 1000, load: src.load });
  await cache.get(0);
  const r = await cache.get(999);
  assert.equal(src.calls, 1);
  assert.deepEqual([r.state, r.value, r.fetchedMs], ['ok', 'v1', 0]);
});

test('cache: reloads once the TTL has passed', async () => {
  const src = counter(['v1', 'v2']);
  const cache = createCachedSource({ ttlMs: 1000, load: src.load });
  await cache.get(0);
  const r = await cache.get(1000);
  assert.equal(src.calls, 2);
  assert.equal(r.value, 'v2');
});

test('cache: a failed refresh keeps the previous value and reports stale', async () => {
  const src = counter<string>(['v1', new Error('timeout')]);
  const cache = createCachedSource({ ttlMs: 1000, load: src.load });
  await cache.get(0);
  const r = await cache.get(5000);
  assert.deepEqual([r.state, r.value, r.fetchedMs, r.error], ['stale', 'v1', 0, 'timeout']);
});

test('cache: a failure with nothing cached is an error', async () => {
  const cache = createCachedSource({ ttlMs: 1000, load: counter<string>([new Error('HTTP 503')]).load });
  const r = await cache.get(0);
  assert.deepEqual([r.state, r.value, r.error], ['error', null, 'HTTP 503']);
});

test('cache: concurrent requests share one load', async () => {
  const src = counter(['v1']);
  const cache = createCachedSource({ ttlMs: 1000, load: src.load });
  await Promise.all([cache.get(0), cache.get(0), cache.get(0)]);
  assert.equal(src.calls, 1);
});

test('cache: a slow first load reports loading, then the value without a second load', async () => {
  let calls = 0;
  let release: (v: string) => void = () => {};
  const cache = createCachedSource({
    ttlMs: 1000,
    load: () =>
      new Promise<string>((resolve) => {
        calls++;
        release = resolve;
      }),
  });
  const first = await cache.get(0, 5);
  assert.deepEqual([first.state, first.value], ['loading', null]);
  release('v1');
  await new Promise((r) => setTimeout(r, 0));
  const second = await cache.get(10, 5);
  assert.deepEqual([second.state, second.value, calls], ['ok', 'v1', 1]);
});

// ---- Snapshot

const at = (hour: number, minute = 0, day = 25) => Date.UTC(2026, 10, day, hour - 7, minute);
const hotspots: Hotspot[] = [
  { id: 'asok', name: 'แยกอโศก', at: { lat: 13.7371, lon: 100.5603 } },
  { id: 'victory', name: 'อนุสาวรีย์ชัยฯ', at: { lat: 13.765, lon: 100.5383 } },
];

function input(over: Partial<SnapshotInput> = {}): SnapshotInput {
  return {
    nowMs: at(16, 40),
    hotspots,
    events: [],
    reports: [],
    air: [],
    weather: null,
    weatherHours: [],
    flows: {},
    sources: [],
    trafficTiles: false,
    corridors: [],
    ...over,
  };
}

function report(id: string, reportedMs: number): CitizenReport {
  return { id, category: 'traffic', text: '', district: null, at: hotspots[0].at, reportedMs, state: '' };
}

test('snapshot: junctions with a TomTom reading are measured, the rest estimated', () => {
  const s = buildSnapshot(input({ flows: { asok: { currentKmh: 12, freeFlowKmh: 40, confidence: 0.8, roadClosed: false } } }));
  assert.deepEqual(
    s.hotspots.map((h) => [h.id, h.congestion.basis]),
    [
      ['asok', 'measured'],
      ['victory', 'estimated'],
    ],
  );
});

test('snapshot: period and weekend come from Bangkok time', () => {
  const s = buildSnapshot(input({ nowMs: at(18, 0, 28) }));
  assert.equal(s.period, 'evening');
  assert.equal(s.weekend, true);
});

test('snapshot: keeps reports from the last 12 hours, newest first', () => {
  const s = buildSnapshot(input({ reports: [report('a', at(10)), report('b', at(16)), report('c', at(3)), report('d', at(13))] }));
  assert.deepEqual(
    s.reports.map((r) => r.id),
    ['b', 'd', 'a'],
  );
});

test('snapshot: events are listed newest start first', () => {
  const ev = (id: string, startMs: number): TrafficEvent => ({ id, kind: 'roadwork', title: id, detail: '', at: hotspots[0].at, startMs, endMs: null });
  const s = buildSnapshot(input({ events: [ev('old', at(1)), ev('new', at(16)), ev('mid', at(9))] }));
  assert.deepEqual(
    s.events.map((e) => e.id),
    ['new', 'mid', 'old'],
  );
});

test('snapshot: queues are laid along the corridors of congested junctions', () => {
  const line: [number, number][] = [
    [100.5603, 13.725],
    [100.5603, 13.7371],
    [100.5603, 13.745],
  ];
  const corridor = {
    id: 'asok-n',
    hotspotId: 'asok',
    road: 'ถ.ทดสอบ',
    direction: 'ขาขึ้น',
    inbound: false,
    line,
    junctionKm: 1.345,
    landmarks: [
      { name: 'ต้นทาง', km: 0 },
      { name: 'แยกอโศก', km: 1.345 },
      { name: 'ปลายทาง', km: 2.224 },
    ],
  };
  const s = buildSnapshot(input({ nowMs: at(12), corridors: [corridor], flows: { asok: { currentKmh: 8, freeFlowKmh: 45, confidence: 0.9, roadClosed: false } } }));
  assert.deepEqual(
    s.jams.map((j) => [j.corridorId, j.toName]),
    [['asok-n', 'แยกอโศก']],
  );
});
