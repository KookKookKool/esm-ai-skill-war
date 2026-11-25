/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeAirStations, pm25Level } from '../sources/air4thai.ts';
import { normalizeIticEvents } from '../sources/itic.ts';
import { normalizeWeather } from '../sources/openmeteo.ts';
import { normalizeFlowSegment, parseTileParams, tileInBangkok, tomtomFlowUrl, tomtomTileUrl } from '../sources/tomtom.ts';
import { normalizeTraffyReports } from '../sources/traffy.ts';
import { airResponse, iticFeed, NOW, openMeteo, tomtomFlow, traffyResponse } from './fixtures.ts';

// ---- iTIC / Longdo events

test('iTIC: keeps only active Bangkok traffic events', () => {
  const ids = normalizeIticEvents(iticFeed, NOW).map((e) => e.id);
  assert.deepEqual(ids, ['itic-993700', 'itic-993701', 'itic-993705']);
});

test('iTIC: maps feed icons onto event kinds', () => {
  const kinds = normalizeIticEvents(iticFeed, NOW).map((e) => e.kind);
  assert.deepEqual(kinds, ['accident', 'roadwork', 'closure']);
});

test('iTIC: a broken-down car is its own event kind', () => {
  const [e] = normalizeIticEvents([{ ...iticFeed[0], eid: '993799', icon: 'carbreakdown', type: '1' }], NOW);
  assert.equal(e.kind, 'breakdown');
});

test('iTIC: reads start and stop as Bangkok time and tidies the detail text', () => {
  const [accident] = normalizeIticEvents(iticFeed, NOW);
  assert.equal(accident.startMs, Date.UTC(2026, 10, 25, 9, 18));
  assert.equal(accident.endMs, Date.UTC(2026, 10, 25, 10, 18));
  assert.equal(accident.detail, 'รถชนกัน 2 คัน กีดขวางช่องซ้าย');
  assert.deepEqual(accident.at, { lat: 13.7372, lon: 100.5606 });
});

test('iTIC: anything that is not an array yields no events', () => {
  assert.deepEqual(normalizeIticEvents({ error: 'down' }, NOW), []);
});

// ---- Traffy Fondue

test('Traffy: keeps road, traffic and flood reports inside Bangkok', () => {
  const ids = normalizeTraffyReports(traffyResponse).map((r) => r.id);
  assert.deepEqual(ids, ['traffy-2026-AAAA01', 'traffy-2026-AAAA02', 'traffy-2026-AAAA05', 'traffy-2026-AAAA06']);
});

test('Traffy: classifies by keyword, and flooding wins over parking', () => {
  const cats = normalizeTraffyReports(traffyResponse).map((r) => r.category);
  assert.deepEqual(cats, ['flood', 'traffic', 'flood', 'roadwork']);
});

test('Traffy: extracts the district and swaps [lon, lat] into a point', () => {
  const [first] = normalizeTraffyReports(traffyResponse);
  assert.equal(first.district, 'ดินแดง');
  assert.deepEqual(first.at, { lat: 13.763, lon: 100.553 });
  assert.equal(first.reportedMs, Date.UTC(2026, 10, 25, 9, 10, 0, 123));
});

test('Traffy: a report without a district gets null, and long text is shortened', () => {
  const long = normalizeTraffyReports(traffyResponse).find((r) => r.id === 'traffy-2026-AAAA06');
  assert.ok(long);
  assert.equal(long.district, null);
  assert.ok(long.text.length <= 91, `length ${long.text.length}`);
  assert.ok(long.text.endsWith('…'));
});

test('Traffy: follow-ups about flood compensation are not flood reports', () => {
  const raw = {
    status: true,
    total: 2,
    results: [
      { ...traffyResponse.results[0], ticket_id: 'X1', description: 'ขอติดตามสถานะคำร้องเยียวยาน้ำท่วม ยังไม่ได้รับเงิน' },
      { ...traffyResponse.results[0], ticket_id: 'X2', description: 'ผู้ร้องได้ลงทะเบียนขอรับเงินช่วยเหลือ จุดจราจรหน้าเขต' },
    ],
  };
  assert.deepEqual(normalizeTraffyReports(raw), []);
});

test('Traffy: a response without results yields no reports', () => {
  assert.deepEqual(normalizeTraffyReports({ status: false }), []);
});

// ---- Air4Thai

test('Air4Thai: keeps Bangkok stations with a valid PM2.5 reading', () => {
  const ids = normalizeAirStations(airResponse).map((s) => s.id);
  assert.deepEqual(ids, ['02t', '52t']);
});

test('Air4Thai: reads value, position and measurement time', () => {
  const [first] = normalizeAirStations(airResponse);
  assert.equal(first.pm25, 20.5);
  assert.deepEqual(first.at, { lat: 13.732846, lon: 100.487662 });
  assert.equal(first.measuredMs, Date.UTC(2026, 10, 25, 9, 0));
});

test('Air4Thai: PM2.5 bands follow the Pollution Control Department thresholds', () => {
  const cases: [number, number][] = [
    [15, 0],
    [15.1, 1],
    [25, 1],
    [25.1, 2],
    [37.5, 2],
    [37.6, 3],
    [75, 3],
    [75.1, 4],
  ];
  for (const [value, want] of cases) assert.equal(pm25Level(value), want, `PM2.5 ${value}`);
});

// ---- Open-Meteo

test('Open-Meteo: drizzle counts as light rain', () => {
  assert.equal(normalizeWeather(openMeteo({ precipitation: 0.1, weather_code: 51 }), NOW)?.rain, 'light');
});

test('Open-Meteo: a clear sky is no rain, a thunderstorm is heavy rain', () => {
  assert.equal(normalizeWeather(openMeteo({ precipitation: 0, weather_code: 0 }), NOW)?.rain, 'none');
  assert.equal(normalizeWeather(openMeteo({ precipitation: 0.4, weather_code: 95 }), NOW)?.rain, 'heavy');
});

test('Open-Meteo: the hour list starts at the current Bangkok hour', () => {
  const w = normalizeWeather(openMeteo({ precipitation: 0, weather_code: 0 }), NOW);
  assert.ok(w);
  assert.deepEqual(
    w.hours.map((h) => [h.startMs, h.rainProbability, h.precipitationMm]),
    [
      [Date.UTC(2026, 10, 25, 9), 69, 0],
      [Date.UTC(2026, 10, 25, 10), 64, 1.4],
      [Date.UTC(2026, 10, 25, 11), 54, 0],
      [Date.UTC(2026, 10, 25, 12), 43, 0],
    ],
  );
});

test('Open-Meteo: a response without current data yields null', () => {
  assert.equal(normalizeWeather({ error: true, reason: 'bad' }, NOW), null);
});

// ---- TomTom

test('TomTom: reads a flow segment', () => {
  assert.deepEqual(normalizeFlowSegment(tomtomFlow), { currentKmh: 41, freeFlowKmh: 70, confidence: 0.59, roadClosed: true });
});

test('TomTom: an error body yields no reading', () => {
  assert.equal(normalizeFlowSegment({ error: 'Missing point parameter.', httpStatusCode: 400 }), null);
});

test('TomTom: the flow request carries the point and an encoded key', () => {
  const url = new URL(tomtomFlowUrl({ lat: 13.7371, lon: 100.5603 }, 'a+b/c'));
  assert.equal(url.origin + url.pathname, 'https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json');
  assert.equal(url.searchParams.get('point'), '13.7371,100.5603');
  assert.equal(url.searchParams.get('key'), 'a+b/c');
});

test('TomTom tiles: the tile request uses the dark relative style and the given key', () => {
  const url = new URL(tomtomTileUrl({ z: 12, x: 3191, y: 1890 }, 'k1'));
  assert.equal(url.origin + url.pathname, 'https://api.tomtom.com/traffic/map/4/tile/flow/relative0-dark/12/3191/1890.png');
  assert.equal(url.searchParams.get('key'), 'k1');
});

test('TomTom tiles: accepts integer coordinates inside the zoom grid only', () => {
  assert.deepEqual(parseTileParams({ z: '12', x: '3191', y: '1890' }), { z: 12, x: 3191, y: 1890 });
  assert.equal(parseTileParams({ z: '12', x: '4096', y: '1890' }), null);
  assert.equal(parseTileParams({ z: '12', x: '3191.5', y: '1890' }), null);
  assert.equal(parseTileParams({ z: '12', x: '-1', y: '1890' }), null);
  assert.equal(parseTileParams({ z: '25', x: '1', y: '1' }), null);
  assert.equal(parseTileParams({ z: '12', x: '3191' }), null);
});

test('TomTom tiles: only tiles that touch Bangkok are served', () => {
  assert.equal(tileInBangkok({ z: 12, x: 3191, y: 1890 }), true);
  assert.equal(tileInBangkok({ z: 9, x: 398, y: 236 }), true);
  assert.equal(tileInBangkok({ z: 12, x: 0, y: 0 }), false);
});
