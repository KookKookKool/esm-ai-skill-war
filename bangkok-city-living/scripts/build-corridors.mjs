#!/usr/bin/env node
/**
 * Builds src/live/corridors.ts: one corridor per direction of travel through each hotspot,
 * following real roads.
 *
 * - Road geometry: OSRM route through start -> junction -> end (OpenStreetMap data, ODbL).
 * - Landmarks: BTS/MRT stations and named signalised junctions from the Overpass API.
 *
 * Both are public demo services: this script sends ~35 requests, one per second, and only
 * needs to run again when a corridor is added or moved. Usage: node scripts/build-corridors.mjs
 */
import { writeFileSync } from 'node:fs';

const UA = 'BangkokCityLiving/1.0 (corridor build script)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// [name, lat, lon]. Start and end sit on the road about 1-2 km either side of the junction.
const P = (name, lat, lon) => ({ name, lat, lon });
const DEFS = [
  // แยกอโศก: Sukhumvit x Asok Montri / Ratchadaphisek
  ['asok-skv-w', 'asok', 'ถ.สุขุมวิท', 'ขาเข้าเมือง', true, P('สถานีพร้อมพงษ์', 13.7305, 100.5697), P('แยกอโศกมนตรี', 13.73636, 100.56121), P('สถานีนานา', 13.7405, 100.5549)],
  ['asok-skv-e', 'asok', 'ถ.สุขุมวิท', 'ขาออกเมือง', false, P('สถานีนานา', 13.7405, 100.5549), P('แยกอโศกมนตรี', 13.73636, 100.56121), P('สถานีพร้อมพงษ์', 13.7305, 100.5697)],
  ['asok-rc-s', 'asok', 'ถ.อโศกมนตรี-รัชดาภิเษก', 'ขาลง', true, P('แยกอโศก-เพชรบุรี', 13.74895, 100.56339), P('แยกอโศกมนตรี', 13.73636, 100.56121), P('ศูนย์ฯ สิริกิติ์', 13.724, 100.5595)],
  ['asok-rc-n', 'asok', 'ถ.รัชดาภิเษก-อโศกมนตรี', 'ขาขึ้น', false, P('ศูนย์ฯ สิริกิติ์', 13.724, 100.5595), P('แยกอโศกมนตรี', 13.73636, 100.56121), P('แยกอโศก-เพชรบุรี', 13.74895, 100.56339)],
  // ห้าแยกลาดพร้าว
  ['hayaek-ph-s', 'hayaek', 'ถ.พหลโยธิน', 'ขาเข้าเมือง', true, P('แยกรัชโยธิน', 13.8287, 100.5697), P('ห้าแยกลาดพร้าว', 13.816, 100.5617), P('สถานีหมอชิต', 13.8026, 100.5538)],
  ['hayaek-ph-n', 'hayaek', 'ถ.พหลโยธิน', 'ขาออกเมือง', false, P('สถานีหมอชิต', 13.8026, 100.5538), P('ห้าแยกลาดพร้าว', 13.816, 100.5617), P('แยกรัชโยธิน', 13.8287, 100.5697)],
  ['hayaek-lp-w', 'hayaek', 'ถ.ลาดพร้าว', 'มุ่งหน้าห้าแยกลาดพร้าว', true, P('แยกรัชดา-ลาดพร้าว', 13.8062, 100.5738), P('ห้าแยกลาดพร้าว', 13.816, 100.5617), P('สถานีหมอชิต', 13.8026, 100.5538)],
  // อนุสาวรีย์ชัยฯ
  ['victory-ph-s', 'victory', 'ถ.พหลโยธิน', 'ขาเข้าเมือง', true, P('สถานีอารีย์', 13.7797, 100.5446), P('อนุสาวรีย์ชัยฯ', 13.7652, 100.5382), P('สถานีพญาไท', 13.757, 100.534)],
  ['victory-pt-n', 'victory', 'ถ.พญาไท', 'ขาขึ้น', false, P('สถานีราชเทวี', 13.7517, 100.5317), P('อนุสาวรีย์ชัยฯ', 13.7652, 100.5382), P('สถานีสนามเป้า', 13.7726, 100.542)],
  ['victory-dd-w', 'victory', 'ถ.ดินแดง', 'มุ่งหน้าอนุสาวรีย์ชัยฯ', true, P('ถ.ดินแดง', 13.7642, 100.552), P('อนุสาวรีย์ชัยฯ', 13.7652, 100.5382), P('สถานีพญาไท', 13.757, 100.534)],
  // ประตูน้ำ-ราชประสงค์
  ['pratunam-rd-n', 'pratunam', 'ถ.ราชดำริ-ราชปรารภ', 'ขาขึ้น', false, P('สถานีราชดำริ', 13.7395, 100.5393), P('แยกประตูน้ำ', 13.7512, 100.5409), P('ถ.ราชปรารภ', 13.757, 100.5428)],
  ['pratunam-rp-s', 'pratunam', 'ถ.ราชปรารภ-ราชดำริ', 'ขาลง', true, P('ถ.ราชปรารภ', 13.759, 100.543), P('แยกประตูน้ำ', 13.7512, 100.5409), P('แยกราชประสงค์', 13.7466, 100.54)],
  ['pratunam-pb-w', 'pratunam', 'ถ.เพชรบุรี', 'ขาเข้าเมือง', true, P('ถ.เพชรบุรี', 13.75, 100.552), P('แยกประตูน้ำ', 13.7512, 100.5409), P('สถานีราชเทวี', 13.7517, 100.5317)],
  ['pratunam-pl-w', 'pratunam', 'ถ.เพลินจิต-พระราม 1', 'ขาเข้าเมือง', true, P('สถานีเพลินจิต', 13.743, 100.5487), P('แยกราชประสงค์', 13.7466, 100.54), P('สถานีสยาม', 13.7456, 100.5341)],
  ['pratunam-r1-e', 'pratunam', 'ถ.พระราม 1-เพลินจิต', 'ขาออกเมือง', false, P('สถานีสยาม', 13.7456, 100.5341), P('แยกราชประสงค์', 13.7466, 100.54), P('สถานีเพลินจิต', 13.743, 100.5487)],
  // แยกศาลาแดง
  ['sd-r4-w', 'saladaeng', 'ถ.พระราม 4', 'ขาเข้าเมือง', true, P('สถานีลุมพินี', 13.7255, 100.5459), P('แยกศาลาแดง', 13.72903, 100.53632), P('สถานีสามย่าน', 13.7325, 100.5294)],
  ['sd-r4-e', 'saladaeng', 'ถ.พระราม 4', 'ขาออกเมือง', false, P('สถานีสามย่าน', 13.7325, 100.5294), P('แยกศาลาแดง', 13.72903, 100.53632), P('สถานีลุมพินี', 13.7255, 100.5459)],
  ['sd-rd-s', 'saladaeng', 'ถ.ราชดำริ-สีลม', 'ขาลง', true, P('สถานีราชดำริ', 13.7395, 100.5393), P('แยกศาลาแดง', 13.72903, 100.53632), P('ถ.สีลม', 13.7258, 100.5315)],
  // รัชดา-พระราม 9
  ['r9-rc-s', 'rama9', 'ถ.รัชดาภิเษก', 'ขาลง', true, P('สถานีศูนย์วัฒนธรรมฯ', 13.766, 100.5701), P('แยกพระราม 9', 13.7576, 100.5654), P('สถานีเพชรบุรี', 13.7487, 100.5633)],
  ['r9-rc-n', 'rama9', 'ถ.รัชดาภิเษก', 'ขาขึ้น', false, P('สถานีเพชรบุรี', 13.7487, 100.5633), P('แยกพระราม 9', 13.7576, 100.5654), P('สถานีศูนย์วัฒนธรรมฯ', 13.766, 100.5701)],
  ['r9-r9-w', 'rama9', 'ถ.พระราม 9', 'ขาเข้าเมือง', true, P('ถ.พระราม 9', 13.756, 100.579), P('แยกพระราม 9', 13.7576, 100.5654), P('ถ.พระราม 9 ฝั่งดินแดง', 13.7595, 100.556)],
  ['r9-r9-e', 'rama9', 'ถ.พระราม 9', 'ขาออกเมือง', false, P('ถ.พระราม 9 ฝั่งดินแดง', 13.7595, 100.556), P('แยกพระราม 9', 13.7576, 100.5654), P('ถ.พระราม 9', 13.756, 100.579)],
  // รัชดา-ลาดพร้าว
  ['rl-rc-s', 'ratchadaLatphrao', 'ถ.รัชดาภิเษก', 'ขาลง', true, P('ถ.รัชดาภิเษก ฝั่งรัชโยธิน', 13.818, 100.5733), P('แยกรัชดา-ลาดพร้าว', 13.8062, 100.5738), P('สถานีรัชดาภิเษก', 13.7989, 100.5736)],
  ['rl-rc-n', 'ratchadaLatphrao', 'ถ.รัชดาภิเษก', 'ขาขึ้น', false, P('สถานีรัชดาภิเษก', 13.7989, 100.5736), P('แยกรัชดา-ลาดพร้าว', 13.8062, 100.5738), P('ถ.รัชดาภิเษก ฝั่งรัชโยธิน', 13.818, 100.5733)],
  ['rl-lp-w', 'ratchadaLatphrao', 'ถ.ลาดพร้าว', 'ขาเข้าเมือง', true, P('ถ.ลาดพร้าว ฝั่งโชคชัย 4', 13.803, 100.584), P('แยกรัชดา-ลาดพร้าว', 13.8062, 100.5738), P('ถ.ลาดพร้าว ฝั่งห้าแยก', 13.81, 100.566)],
  ['rl-lp-e', 'ratchadaLatphrao', 'ถ.ลาดพร้าว', 'ขาออกเมือง', false, P('ถ.ลาดพร้าว ฝั่งห้าแยก', 13.81, 100.566), P('แยกรัชดา-ลาดพร้าว', 13.8062, 100.5738), P('ถ.ลาดพร้าว ฝั่งโชคชัย 4', 13.803, 100.584)],
  // แยกบางนา
  ['bn-skv-n', 'bangna', 'ถ.สุขุมวิท', 'ขาเข้าเมือง', true, P('สถานีแบริ่ง', 13.6614, 100.6017), P('แยกบางนา', 13.6683, 100.604), P('สถานีอุดมสุข', 13.6797, 100.6093)],
  ['bn-skv-s', 'bangna', 'ถ.สุขุมวิท', 'ขาออกเมือง', false, P('สถานีอุดมสุข', 13.6797, 100.6093), P('แยกบางนา', 13.6683, 100.604), P('สถานีแบริ่ง', 13.6614, 100.6017)],
  ['bn-bt-w', 'bangna', 'ถ.บางนา-ตราด', 'ขาเข้าเมือง', true, P('ถ.บางนา-ตราด', 13.667, 100.625), P('แยกบางนา', 13.6683, 100.604), P('สถานีอุดมสุข', 13.6797, 100.6093)],
  // แยกปิ่นเกล้า
  ['pk-brc-e', 'pinklao', 'ถ.บรมราชชนนี', 'ขาเข้าเมือง', true, P('ถ.บรมราชชนนี', 13.781, 100.456), P('แยกปิ่นเกล้า', 13.7787, 100.4765), P('สะพานพระปิ่นเกล้า', 13.77, 100.49)],
  ['pk-brc-w', 'pinklao', 'ถ.บรมราชชนนี', 'ขาออกเมือง', false, P('สะพานพระปิ่นเกล้า', 13.77, 100.49), P('แยกปิ่นเกล้า', 13.7787, 100.4765), P('ถ.บรมราชชนนี', 13.781, 100.456)],
];

// ---- geometry (same maths as src/live/route-geo.ts)
const R = 6371;
const rad = (d) => (d * Math.PI) / 180;
function dist([lon1, lat1], [lon2, lat2]) {
  const h = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function cum(line) {
  const out = [0];
  for (let i = 1; i < line.length; i++) out.push(out[i - 1] + dist(line[i - 1], line[i]));
  return out;
}
function project(line, [lon, lat]) {
  const c = cum(line);
  const ky = (R * Math.PI) / 180;
  const kx = ky * Math.cos(rad(lat));
  let best = { km: 0, off: Infinity };
  for (let i = 1; i < line.length; i++) {
    const ax = line[i - 1][0] * kx, ay = line[i - 1][1] * ky;
    const dx = line[i][0] * kx - ax, dy = line[i][1] * ky - ay;
    const l2 = dx * dx + dy * dy;
    const t = l2 ? Math.max(0, Math.min(1, ((lon * kx - ax) * dx + (lat * ky - ay) * dy) / l2)) : 0;
    const off = Math.hypot(lon * kx - (ax + t * dx), lat * ky - (ay + t * dy));
    if (off < best.off) best = { km: c[i - 1] + t * (c[i] - c[i - 1]), off };
  }
  return best;
}
/** Douglas-Peucker in local km coordinates. */
function simplify(line, tolKm) {
  if (line.length < 3) return line;
  const lat0 = rad(line[0][1]);
  const xy = line.map(([x, y]) => [x * 111.195 * Math.cos(lat0), y * 111.195]);
  const keep = new Array(line.length).fill(false);
  keep[0] = keep[line.length - 1] = true;
  const stack = [[0, line.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let max = 0, idx = -1;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = xy[i], [ax, ay] = xy[a], [bx, by] = xy[b];
      const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
      const t = l2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
      const d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
      if (d > max) [max, idx] = [d, i];
    }
    if (max > tolKm) {
      keep[idx] = true;
      stack.push([a, idx], [idx, b]);
    }
  }
  return line.filter((_, i) => keep[i]);
}

// ---- landmarks from OpenStreetMap
async function landmarks() {
  const q = `[out:json][timeout:60];
(
  node["railway"="station"](13.6,100.4,13.9,100.7);
  node["highway"="traffic_signals"]["name"~"^แยก"](13.6,100.4,13.9,100.7);
  node["junction"="yes"]["name"~"^แยก"](13.6,100.4,13.9,100.7);
);
out body;`;
  // Public Overpass servers are often busy: retry, then fall back to a mirror.
  const servers = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
  let data = null;
  for (let attempt = 0; attempt < 6 && !data; attempt++) {
    const server = servers[attempt % servers.length];
    try {
      const res = await fetch(server, {
        method: 'POST',
        headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(q),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      data = await res.json();
    } catch (e) {
      console.log(`Overpass ${server}: ${e.message}, retrying`);
      await sleep(5000);
    }
  }
  if (!data) throw new Error('Overpass unavailable');
  return data.elements
    .map((e) => {
      const name = (e.tags['name:th'] || e.tags.name || '').trim();
      if (!name) return null;
      const station = e.tags.railway === 'station';
      const label = station ? (name.startsWith('สถานี') ? name : `สถานี${name}`) : name;
      return { name: label, lon: e.lon, lat: e.lat, station };
    })
    .filter(Boolean);
}

function bearing(a, b) {
  const y = Math.sin(rad(b.lon - a.lon)) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lon - a.lon));
  return Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);
}

async function route(def) {
  const [, , , , , start, , end] = def;
  const coords = [start, end].map((p) => `${p.lon},${p.lat}`).join(';');
  // Only the two ends are waypoints, so OSRM drives straight through the junction instead of
  // snapping a middle point onto the wrong carriageway. The travel bearing at each end picks the
  // carriageway going our way on divided roads.
  const b = bearing(start, end);
  const url =
    `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson` +
    `&continue_straight=true&bearings=${b},60;${b},60&radiuses=150;150`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
  const data = await res.json();
  if (data.code !== 'Ok') throw new Error(`OSRM ${data.code}`);
  return data;
}

const round = (n) => Math.round(n * 1e5) / 1e5;

const osm = await landmarks();
console.log(`landmarks from OSM: ${osm.length}`);

const out = [];
for (const def of DEFS) {
  const [id, hotspotId, road, direction, inbound, start, via, end] = def;
  await sleep(1100);
  let data;
  try {
    data = await route(def);
  } catch (e) {
    console.log(`SKIP ${id}: ${e.message}`);
    continue;
  }
  const r = data.routes[0];
  const snap = data.waypoints.map((w) => Math.round(w.distance));
  const raw = r.geometry.coordinates;
  const line = simplify(raw, 0.004).map(([x, y]) => [round(x), round(y)]);
  const total = cum(line).at(-1);
  const straight = dist([start.lon, start.lat], [via.lon, via.lat]) + dist([via.lon, via.lat], [end.lon, end.lat]);
  const junction = project(line, [via.lon, via.lat]);
  const ratio = total / straight;
  const problems = [];
  if (junction.off > 0.09) problems.push(`passes ${Math.round(junction.off * 1000)} m from the junction`);
  if (snap[0] > 150 || snap[1] > 150) problems.push(`ends snapped ${snap[0]}/${snap[1]} m away`);
  if (ratio > 1.6) problems.push(`route is ${ratio.toFixed(2)}x the straight line`);
  if (junction.km < 0.3) problems.push(`approach only ${junction.km.toFixed(2)} km`);
  console.log(`${problems.length ? 'SKIP' : 'ok  '} ${id.padEnd(15)} ${total.toFixed(2)} km, junction at ${junction.km.toFixed(2)} km (${Math.round(junction.off * 1000)} m off), x${ratio.toFixed(2)}, snaps ${snap.join('/')} m, ${line.length} pts ${problems.join('; ')}`);
  if (problems.length) continue;

  const marks = [
    { name: start.name, km: 0 },
    { name: via.name, km: junction.km },
    { name: end.name, km: total },
  ];
  for (const l of osm) {
    const p = project(line, [l.lon, l.lat]);
    if (p.off > (l.station ? 0.2 : 0.05) || p.km < 0.05 || p.km > total - 0.05) continue;
    if (marks.some((m) => Math.abs(m.km - p.km) < 0.15 || m.name === l.name)) continue;
    marks.push({ name: l.name, km: p.km });
  }
  marks.sort((a, b) => a.km - b.km);
  out.push({
    id,
    hotspotId,
    road,
    direction,
    inbound,
    line,
    junctionKm: Math.round(junction.km * 1000) / 1000,
    landmarks: marks.map((m) => ({ name: m.name, km: Math.round(m.km * 1000) / 1000 })),
  });
}

const header = `/**
 * Generated by scripts/build-corridors.mjs. Do not edit by hand; change the script and re-run it.
 * Road geometry © OpenStreetMap contributors (ODbL), routed with OSRM. Landmarks from OpenStreetMap.
 */
import type { Corridor } from './types.ts';

export const CORRIDORS: Corridor[] = `;
writeFileSync(new URL('../src/live/corridors.ts', import.meta.url), header + JSON.stringify(out, null, 1) + ';\n');
console.log(`wrote ${out.length} of ${DEFS.length} corridors`);
