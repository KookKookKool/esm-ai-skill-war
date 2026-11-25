/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { distanceKm, inBangkok, withinKm } from '../geo.ts';
import { bangkokClock, bangkokHour, isBangkokWeekend, parseBangkokLocal, parseTraffyTimestamp, periodOf } from '../time.ts';

test('parseBangkokLocal reads "YYYY-MM-DD HH:mm:ss" as UTC+7', () => {
  assert.equal(parseBangkokLocal('2026-11-25 16:54:25'), Date.UTC(2026, 10, 25, 9, 54, 25));
});

test('parseBangkokLocal accepts a time without seconds', () => {
  assert.equal(parseBangkokLocal('2026-11-25 16:00'), Date.UTC(2026, 10, 25, 9, 0, 0));
});

test('parseBangkokLocal returns null for text that is not a timestamp', () => {
  assert.equal(parseBangkokLocal('soon'), null);
  assert.equal(parseBangkokLocal(''), null);
});

test('parseTraffyTimestamp reads microsecond UTC timestamps', () => {
  assert.equal(parseTraffyTimestamp('2026-11-25 09:55:55.475515+00'), Date.UTC(2026, 10, 25, 9, 55, 55, 475));
});

test('parseTraffyTimestamp returns null for malformed input', () => {
  assert.equal(parseTraffyTimestamp('yesterday'), null);
});

test('bangkokHour shifts UTC by seven hours across midnight', () => {
  assert.equal(bangkokHour(Date.UTC(2026, 10, 25, 18, 30)), 1);
});

test('bangkokClock formats Bangkok time as HH:mm', () => {
  assert.equal(bangkokClock(Date.UTC(2026, 10, 25, 9, 5)), '16:05');
});

test('periodOf follows the time bands used on the page', () => {
  const cases: [number, string][] = [
    [0, 'night'],
    [5, 'night'],
    [6, 'morning'],
    [9, 'morning'],
    [10, 'noon'],
    [15, 'noon'],
    [16, 'evening'],
    [20, 'evening'],
    [21, 'night'],
  ];
  for (const [hour, want] of cases) assert.equal(periodOf(hour), want, `hour ${hour}`);
});

test('isBangkokWeekend uses the Bangkok calendar day, not UTC', () => {
  // Friday 20:00 UTC is already Saturday 03:00 in Bangkok.
  assert.equal(isBangkokWeekend(Date.UTC(2026, 10, 27, 20, 0)), true);
  // Friday 10:00 UTC is Friday 17:00 in Bangkok.
  assert.equal(isBangkokWeekend(Date.UTC(2026, 10, 27, 10, 0)), false);
});

test('distanceKm between Victory Monument and Asok is about 3.9 km', () => {
  const d = distanceKm({ lat: 13.765, lon: 100.5383 }, { lat: 13.7371, lon: 100.5603 });
  assert.ok(Math.abs(d - 3.91) < 0.05, `got ${d}`);
});

test('inBangkok accepts Siam and rejects Chiang Mai and Phatthalung', () => {
  assert.equal(inBangkok({ lat: 13.7456, lon: 100.5341 }), true);
  assert.equal(inBangkok({ lat: 18.5833, lon: 99.0576 }), false);
  assert.equal(inBangkok({ lat: 7.7666, lon: 100.034 }), false);
});

test('withinKm keeps items inside the radius, nearest first', () => {
  const asok = { lat: 13.7371, lon: 100.5603 };
  const items = [
    { id: 'victory', at: { lat: 13.765, lon: 100.5383 } },
    { id: 'terminal21', at: { lat: 13.7377, lon: 100.5604 } },
    { id: 'nana', at: { lat: 13.7405, lon: 100.5551 } },
  ];
  const got = withinKm(items, asok, 1.5).map((x) => x.item.id);
  assert.deepEqual(got, ['terminal21', 'nana']);
});
