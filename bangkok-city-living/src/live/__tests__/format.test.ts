/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ago, clockWithSeconds, thaiDate } from '../format.ts';

const NOW = Date.UTC(2026, 10, 25, 10, 52, 31); // 17:52:31 Bangkok

test('ago: under a minute reads as just now', () => {
  assert.equal(ago(NOW - 45_000, NOW), 'เมื่อสักครู่');
});

test('ago: minutes, then hours and minutes, then days', () => {
  assert.equal(ago(NOW - 12 * 60_000, NOW), '12 นาทีที่แล้ว');
  assert.equal(ago(NOW - (2 * 60 + 5) * 60_000, NOW), '2 ชม. 5 นาทีที่แล้ว');
  assert.equal(ago(NOW - 3 * 86_400_000, NOW), '3 วันที่แล้ว');
});

test('ago: a time slightly in the future (clock skew) still reads as just now', () => {
  assert.equal(ago(NOW + 20_000, NOW), 'เมื่อสักครู่');
});

test('clockWithSeconds formats Bangkok time', () => {
  assert.equal(clockWithSeconds(NOW), '17:52:31');
});

test('thaiDate names the Bangkok day and uses the Buddhist year', () => {
  assert.equal(thaiDate(NOW), 'วันพุธที่ 25 พฤศจิกายน 2569');
  // 23:30 UTC on the 25th is already Thursday the 26th in Bangkok.
  assert.equal(thaiDate(Date.UTC(2026, 10, 25, 23, 30)), 'วันพฤหัสบดีที่ 26 พฤศจิกายน 2569');
});
