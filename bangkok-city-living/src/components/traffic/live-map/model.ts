/**
 * Traffic simulation for the live map.
 *
 * Every car follows one lane (a road in one direction, offset to the left because Thailand
 * drives on the left). Its speed depends only on where it is: free-flow speed for the period,
 * reduced near hotspots. Cars therefore queue up at hotspots on their own, the same way
 * density rises wherever real traffic slows down.
 *
 * Geometry lives in flat module-level arrays so worklets can capture it cheaply.
 * The whole animated state is one number array inside a shared value, stepped every frame.
 */
import { Brand } from '@/constants/brand';
import { HOTSPOTS, MAX_SLOWDOWN, RAILS, ROADS, SIM, type Pt, type Viewport } from '@/data/bangkok-map';
import { Periods } from '@/data/traffic';

export const PERIOD_KEYS = Periods.map((p) => p.key);

export const CAR_L = 11;
export const CAR_W = 5;
export const TRAIN_L = 22;
export const TRAIN_W = 5.4;

const LANE_OFFSET = 3;
const TRACK_OFFSET = 2.4;
const TRAIN_SPEED = 64;
const EDGE_FADE = 22;

// Geometry tables, shared by every lane.
const SEG_X: number[] = [];
const SEG_Y: number[] = [];
const SEG_UX: number[] = [];
const SEG_UY: number[] = [];
const SEG_LEN: number[] = [];
const SEG_CUM: number[] = [];
const SEG_ANG: number[] = [];
const LANE_FIRST: number[] = [];
const LANE_COUNT: number[] = [];
const LANE_LEN: number[] = [];
const LANE_LOOP: number[] = [];
const LANE_PTS: Pt[][] = [];

function unit(x: number, y: number): [number, number] {
  const l = Math.hypot(x, y) || 1;
  return [x / l, y / l];
}

/** Shift a polyline to the left of its direction of travel, mitring the corners. */
function offsetLeft(pts: readonly Pt[], d: number, closed: boolean): Pt[] {
  const n = pts.length;
  return pts.map((p, i) => {
    const prev = i > 0 ? pts[i - 1] : closed ? pts[n - 1] : null;
    const next = i < n - 1 ? pts[i + 1] : closed ? pts[0] : null;
    let nx = 0;
    let ny = 0;
    let first: [number, number] | null = null;
    if (prev) {
      const [ux, uy] = unit(p[0] - prev[0], p[1] - prev[1]);
      nx += uy;
      ny -= ux;
      first = [uy, -ux];
    }
    if (next) {
      const [ux, uy] = unit(next[0] - p[0], next[1] - p[1]);
      nx += uy;
      ny -= ux;
      first = first ?? [uy, -ux];
    }
    const [mx, my] = unit(nx, ny);
    const cos = first ? Math.max(0.6, mx * first[0] + my * first[1]) : 1;
    return [p[0] + (mx * d) / cos, p[1] + (my * d) / cos] as const;
  });
}

function addLane(pts: Pt[], loop: boolean): number {
  const lane = LANE_FIRST.length;
  const first = SEG_X.length;
  const all = loop ? [...pts, pts[0]] : pts;
  let cum = 0;
  for (let i = 0; i < all.length - 1; i++) {
    const [x0, y0] = all[i];
    const [x1, y1] = all[i + 1];
    const len = Math.hypot(x1 - x0, y1 - y0);
    if (len < 0.01) continue;
    SEG_X.push(x0);
    SEG_Y.push(y0);
    SEG_UX.push((x1 - x0) / len);
    SEG_UY.push((y1 - y0) / len);
    SEG_LEN.push(len);
    SEG_CUM.push(cum);
    SEG_ANG.push(Math.atan2(y1 - y0, x1 - x0));
    cum += len;
  }
  LANE_FIRST.push(first);
  LANE_COUNT.push(SEG_X.length - first);
  LANE_LEN.push(cum);
  LANE_LOOP.push(loop ? 1 : 0);
  LANE_PTS.push(all);
  return lane;
}

const CAR_LANES: number[] = [];
for (const road of ROADS) {
  CAR_LANES.push(addLane(offsetLeft(road.pts, LANE_OFFSET, false), false));
  CAR_LANES.push(addLane(offsetLeft([...road.pts].reverse(), LANE_OFFSET, false), false));
}

const TRAIN_LANES: { lane: number; color: string }[] = [];
for (const rail of RAILS) {
  TRAIN_LANES.push({ lane: addLane(offsetLeft(rail.pts, TRACK_OFFSET, rail.loop), rail.loop), color: rail.color });
  TRAIN_LANES.push({
    lane: addLane(offsetLeft([...rail.pts].reverse(), TRACK_OFFSET, rail.loop), rail.loop),
    color: rail.color,
  });
}

const HOT_N = HOTSPOTS.length;
const HOT_X = HOTSPOTS.map((h) => h.at[0]);
const HOT_Y = HOTSPOTS.map((h) => h.at[1]);
const HOT_R = HOTSPOTS.map((h) => h.r);
/** Hotspot intensity, period-major: HOT_LEVEL[period * HOT_N + hotspot]. */
const HOT_LEVEL = PERIOD_KEYS.flatMap((p) => HOTSPOTS.map((h) => h.level[p]));
const BASE_SPEED = PERIOD_KEYS.map((p) => SIM[p].base);
const VISIBLE = PERIOD_KEYS.map((p) => SIM[p].visible);
const V_MAX = Math.max(...BASE_SPEED);

// State layout inside the shared array.
export const S_TIME = 0;
const S_BASE = 1;
const S_VIS = 2;
export const S_HOT = 3;
export const S_CARS = S_HOT + HOT_N;
/** Per car: distance, x, y, angle, speed (0-1 of night free flow), opacity, eased visibility. */
export const CAR_STRIDE = 7;
/** Per train: distance, x, y, angle, opacity. */
export const TRAIN_STRIDE = 5;

function locate(lane: number, s: number, out: number[], o: number) {
  'worklet';
  const first = LANE_FIRST[lane];
  const last = first + LANE_COUNT[lane] - 1;
  let j = first;
  while (j < last && SEG_CUM[j] + SEG_LEN[j] < s) j++;
  const t = s - SEG_CUM[j];
  out[o] = SEG_X[j] + SEG_UX[j] * t;
  out[o + 1] = SEG_Y[j] + SEG_UY[j] * t;
  out[o + 2] = SEG_ANG[j];
}

/** 0 = free flow, 1 = standstill. `levels[off + h]` is the current intensity of hotspot h. */
function slowAt(x: number, y: number, levels: number[], off: number) {
  'worklet';
  let slow = 0;
  for (let h = 0; h < HOT_N; h++) {
    const dx = x - HOT_X[h];
    const dy = y - HOT_Y[h];
    const r = HOT_R[h];
    const d2 = dx * dx + dy * dy;
    if (d2 < r * r) {
      const q = 1 - Math.sqrt(d2) / r;
      const f = levels[off + h] * q * q * (3 - 2 * q);
      if (f > slow) slow = f;
    }
  }
  return slow;
}

function edgeFade(s: number, len: number) {
  'worklet';
  return Math.max(0, Math.min(1, s / EDGE_FADE, (len - s) / EDGE_FADE));
}

export type Model = {
  nCars: number;
  carLane: number[];
  carRank: number[];
  nTrains: number;
  trainLane: number[];
  trainColor: string[];
  trainBase: number;
  initial: number[];
};

/** Deterministic PRNG so the server render and the client hydrate to the same cars. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function laneTouches(lane: number, v: Viewport) {
  const pad = 30;
  return LANE_PTS[lane].some(
    ([x, y]) => x >= v.x - pad && x <= v.x + v.w + pad && y >= v.y - pad && y <= v.y + v.h + pad,
  );
}

export type ModelOptions = {
  /** Average gap between cars on a lane, in map units. */
  spacing: number;
  trainsPerLane: number;
  period: number;
  seed: number;
  /** Only simulate lanes that reach into this viewport. */
  view?: Viewport;
};

export function createModel(opts: ModelOptions): Model {
  const rand = rng(opts.seed);
  const p = opts.period;
  const carLane: number[] = [];
  const carS: number[] = [];
  const tmp = [0, 0, 0];

  for (const lane of CAR_LANES) {
    if (opts.view && !laneTouches(lane, opts.view)) continue;
    const len = LANE_LEN[lane];
    const n = Math.floor(len / opts.spacing);
    if (n === 0) continue;
    // Spread cars evenly in travel time, not distance, so they start already queued at hotspots.
    const step = 6;
    const samples = Math.ceil(len / step);
    const cumT = [0];
    for (let k = 0; k < samples; k++) {
      const ds = Math.min(step, len - k * step);
      locate(lane, k * step + ds / 2, tmp, 0);
      const v = BASE_SPEED[p] * (1 - MAX_SLOWDOWN * slowAt(tmp[0], tmp[1], HOT_LEVEL, p * HOT_N));
      cumT.push(cumT[k] + ds / v);
    }
    const total = cumT[samples];
    const phase = rand();
    for (let c = 0; c < n; c++) {
      let u = (c + phase + (rand() - 0.5) * 0.35) / n;
      u -= Math.floor(u);
      const target = u * total;
      let k = 0;
      while (k < samples - 1 && cumT[k + 1] < target) k++;
      const frac = (target - cumT[k]) / (cumT[k + 1] - cumT[k] || 1);
      carLane.push(lane);
      carS.push(Math.min(len - 0.01, (k + frac) * step));
    }
  }
  const carRank = carLane.map(() => rand());

  const trainLane: number[] = [];
  const trainS: number[] = [];
  const trainColor: string[] = [];
  for (const { lane, color } of TRAIN_LANES) {
    if (opts.view && !laneTouches(lane, opts.view)) continue;
    for (let t = 0; t < opts.trainsPerLane; t++) {
      trainLane.push(lane);
      trainColor.push(color);
      trainS.push(((t + rand() * 0.3) / opts.trainsPerLane) * LANE_LEN[lane]);
    }
  }

  const nCars = carLane.length;
  const nTrains = trainLane.length;
  const trainBase = S_CARS + nCars * CAR_STRIDE;
  const a = new Array<number>(trainBase + nTrains * TRAIN_STRIDE).fill(0);
  a[S_BASE] = BASE_SPEED[p];
  a[S_VIS] = VISIBLE[p];
  for (let h = 0; h < HOT_N; h++) a[S_HOT + h] = HOT_LEVEL[p * HOT_N + h];

  for (let i = 0; i < nCars; i++) {
    const o = S_CARS + i * CAR_STRIDE;
    const lane = carLane[i];
    a[o] = carS[i];
    locate(lane, carS[i], a, o + 1);
    a[o + 4] = (a[S_BASE] * (1 - MAX_SLOWDOWN * slowAt(a[o + 1], a[o + 2], a, S_HOT))) / V_MAX;
    a[o + 6] = carRank[i] < a[S_VIS] ? 1 : 0;
    a[o + 5] = a[o + 6] * edgeFade(carS[i], LANE_LEN[lane]);
  }
  for (let i = 0; i < nTrains; i++) {
    const o = trainBase + i * TRAIN_STRIDE;
    const lane = trainLane[i];
    a[o] = trainS[i];
    locate(lane, trainS[i], a, o + 1);
    a[o + 4] = LANE_LOOP[lane] ? 1 : edgeFade(trainS[i], LANE_LEN[lane]);
  }

  return { nCars, carLane, carRank, nTrains, trainLane, trainColor, trainBase, initial: a };
}

/** Advance the simulation by `dt` seconds towards period `p`. Runs on the UI thread. */
export function stepSim(a: number[], dt: number, p: number, m: Model) {
  'worklet';
  a[S_TIME] += dt;
  const k = Math.min(1, dt * 1.4);
  a[S_BASE] += (BASE_SPEED[p] - a[S_BASE]) * k;
  a[S_VIS] += (VISIBLE[p] - a[S_VIS]) * k;
  const off = p * HOT_N;
  for (let h = 0; h < HOT_N; h++) a[S_HOT + h] += (HOT_LEVEL[off + h] - a[S_HOT + h]) * k;

  const fade = Math.min(1, dt * 2.5);
  for (let i = 0; i < m.nCars; i++) {
    const o = S_CARS + i * CAR_STRIDE;
    const lane = m.carLane[i];
    const len = LANE_LEN[lane];
    const v = a[S_BASE] * (1 - MAX_SLOWDOWN * slowAt(a[o + 1], a[o + 2], a, S_HOT));
    let s = a[o] + v * dt;
    if (s >= len) s -= len;
    a[o] = s;
    locate(lane, s, a, o + 1);
    a[o + 4] = v / V_MAX;
    a[o + 6] += ((m.carRank[i] < a[S_VIS] ? 1 : 0) - a[o + 6]) * fade;
    a[o + 5] = a[o + 6] * edgeFade(s, len);
  }

  for (let i = 0; i < m.nTrains; i++) {
    const o = m.trainBase + i * TRAIN_STRIDE;
    const lane = m.trainLane[i];
    const len = LANE_LEN[lane];
    let s = a[o] + TRAIN_SPEED * dt;
    if (s >= len) s -= len;
    a[o] = s;
    locate(lane, s, a, o + 1);
    a[o + 4] = LANE_LOOP[lane] ? 1 : edgeFade(s, len);
  }
}

// Speed colour scale: standstill pink -> orange -> yellow -> free-flow mint.
const STOP_POS = [0.18, 0.42, 0.66, 0.92];
const STOP_RGB = [Brand.pink, Brand.orange, Brand.yellow, Brand.mint].flatMap((hex) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
]);

function mix(i: number, j: number, t: number) {
  'worklet';
  const r = Math.round(STOP_RGB[i * 3] + (STOP_RGB[j * 3] - STOP_RGB[i * 3]) * t);
  const g = Math.round(STOP_RGB[i * 3 + 1] + (STOP_RGB[j * 3 + 1] - STOP_RGB[i * 3 + 1]) * t);
  const b = Math.round(STOP_RGB[i * 3 + 2] + (STOP_RGB[j * 3 + 2] - STOP_RGB[i * 3 + 2]) * t);
  return `rgb(${r},${g},${b})`;
}

/** `v` is speed as a fraction of night free flow (1 = 60 km/h on the legend). */
export function speedColor(v: number) {
  'worklet';
  const last = STOP_POS.length - 1;
  if (v <= STOP_POS[0]) return mix(0, 0, 0);
  if (v >= STOP_POS[last]) return mix(last, last, 0);
  let i = 0;
  while (v > STOP_POS[i + 1]) i++;
  return mix(i, i + 1, (v - STOP_POS[i]) / (STOP_POS[i + 1] - STOP_POS[i]));
}
