/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildJams, type Corridor } from '../engine/jams.ts';
import { lineLengthKm, pointAt, projectOnLine, sliceLine, type Line } from '../route-geo.ts';
import type { HotspotStatus, TrafficEvent } from '../types.ts';

/** A straight north-bound road along 100.5°E: 0.01° of latitude is 1.112 km. */
const KM_PER_DEG = 111.195;
const road: Line = [
  [100.5, 13.7],
  [100.5, 13.71],
  [100.5, 13.72],
];
const lat = (km: number) => 13.7 + km / KM_PER_DEG;
const near = (a: number, b: number, tol: number, what: string) => assert.ok(Math.abs(a - b) <= tol, `${what}: ${a} vs ${b}`);

// ---- Geometry along a road

test('lineLengthKm adds up the segments', () => {
  near(lineLengthKm(road), 2.224, 0.005, 'length');
});

test('pointAt interpolates inside a segment', () => {
  const [lon, la] = pointAt(road, 0.5);
  assert.equal(lon, 100.5);
  near(la, lat(0.5), 1e-5, 'lat');
});

test('sliceLine keeps interior vertices and cuts both ends', () => {
  const part = sliceLine(road, 0.5, 1.5);
  assert.equal(part.length, 3);
  near(part[0][1], lat(0.5), 1e-5, 'start');
  assert.deepEqual(part[1], [100.5, 13.71]);
  near(part[2][1], lat(1.5), 1e-5, 'end');
});

test('projectOnLine gives the distance along the road and the sideways offset', () => {
  // 50 m east of the road, level with the 0.556 km mark.
  const p = { lat: 13.705, lon: 100.5 + 0.05 / (111.32 * Math.cos((13.705 * Math.PI) / 180)) };
  const r = projectOnLine(road, p);
  near(r.km, 0.556, 0.005, 'km');
  near(r.offsetKm, 0.05, 0.003, 'offset');
});

// ---- Jam segments

const corridor = (over: Partial<Corridor> = {}): Corridor => ({
  id: 'c1',
  hotspotId: 'h1',
  road: 'ถ.ทดสอบ',
  direction: 'ขาเข้าเมือง',
  inbound: true,
  line: road,
  junctionKm: 1.5,
  landmarks: [
    { name: 'ต้นทาง', km: 0 },
    { name: 'กลางทาง', km: 0.75 },
    { name: 'แยกทดสอบ', km: 1.5 },
    { name: 'ปลายทาง', km: 2.224 },
  ],
  ...over,
});

function hotspot(index: number): HotspotStatus {
  return {
    id: 'h1',
    name: 'แยกทดสอบ',
    at: { lat: lat(1.5), lon: 100.5 },
    congestion: { extraPct: index * 1.6, index, level: index >= 80 ? 4 : index >= 60 ? 3 : index >= 40 ? 2 : 1, speedKmh: 15, basis: 'estimated', confidence: null, adjustments: [] },
    causes: { top: 'rush', ranked: [{ cause: 'rush', score: 0.6, reasons: [] }] },
  };
}

const NOON = Date.UTC(2026, 10, 25, 5); // Wednesday 12:00 Bangkok
const MORNING = Date.UTC(2026, 10, 25, 1); // Wednesday 08:00 Bangkok

function accident(km: number, eastMetres: number): TrafficEvent {
  const offsetDeg = eastMetres / 1000 / (111.32 * Math.cos((13.71 * Math.PI) / 180));
  return { id: 'acc', kind: 'accident', title: 'อุบัติเหตุ ถนนทดสอบ', detail: '', at: { lat: lat(km), lon: 100.5 + offsetDeg }, startMs: NOON - 600_000, endMs: null };
}

test('jams: a free-flowing junction has no jam', () => {
  assert.deepEqual(buildJams([corridor()], [hotspot(30)], [], NOON, false), []);
});

test('jams: a gridlocked junction queues back from the junction, no further than the road goes', () => {
  const [jam] = buildJams([corridor()], [hotspot(90)], [], NOON, false);
  near(jam.toKm, 1.5, 1e-9, 'ends at the junction');
  assert.ok(jam.fromKm >= 0 && jam.fromKm < 1.5, `starts at ${jam.fromKm}`);
  assert.equal(jam.level, 4);
  assert.equal(jam.toName, 'แยกทดสอบ');
});

test('jams: the jam is named from the landmark where it starts to the point where it clears', () => {
  const [jam] = buildJams([corridor()], [hotspot(90)], [], NOON, false);
  assert.equal(jam.fromName, 'ต้นทาง');
  assert.equal(jam.clearName, 'ปลายทาง');
});

test('jams: in the morning, inbound queues are longer than outbound ones', () => {
  const inbound = buildJams([corridor()], [hotspot(70)], [], MORNING, false)[0];
  const outbound = buildJams([corridor({ id: 'c2', inbound: false })], [hotspot(70)], [], MORNING, false)[0];
  assert.ok(inbound.toKm - inbound.fromKm > outbound.toKm - outbound.fromKm);
});

test('jams: an accident on the road queues traffic back from where it happened', () => {
  const [jam] = buildJams([corridor()], [hotspot(10)], [accident(1.9, 20)], NOON, false);
  near(jam.toKm, 1.9, 0.01, 'ends at the accident');
  assert.ok(jam.fromKm < jam.toKm);
  assert.equal(jam.cause, 'accident');
  assert.ok(jam.toName.includes('อุบัติเหตุ ถนนทดสอบ'), jam.toName);
});

test('jams: an accident 300 m off the road is not on this route', () => {
  assert.deepEqual(buildJams([corridor()], [hotspot(10)], [accident(1.9, 300)], NOON, false), []);
});

test('jams: overlapping queues merge into one segment', () => {
  const jams = buildJams([corridor()], [hotspot(90)], [accident(1.4, 10)], NOON, false);
  assert.equal(jams.length, 1);
  near(jams[0].toKm, 1.5, 1e-9, 'merged end');
});

test('jams: the clear stretch starts where the jam ends', () => {
  const [jam] = buildJams([corridor()], [hotspot(90)], [], NOON, false);
  near(jam.clearLine[0][1], jam.line[jam.line.length - 1][1], 1e-9, 'continuity');
  assert.ok(lineLengthKm(jam.clearLine) <= 0.36);
});
