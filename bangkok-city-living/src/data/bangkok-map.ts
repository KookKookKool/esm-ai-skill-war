/**
 * Schematic map of central Bangkok (not to scale) for the live traffic simulation.
 * Coordinates are in map units on a MAP_W x MAP_H canvas. Relative positions of roads,
 * the Chao Phraya, rail lines and hotspots follow the real city loosely.
 */
import { Brand } from '@/constants/brand';
import type { CauseKey, Period } from './traffic';

export type Pt = readonly [number, number];

export const MAP_W = 1000;
export const MAP_H = 640;

export type Viewport = { x: number; y: number; w: number; h: number };
/** All viewports share the canvas aspect ratio, so switching between them never changes height. */
export const VIEW_WIDE: Viewport = { x: 0, y: 0, w: MAP_W, h: MAP_H };
export const VIEW_NARROW: Viewport = { x: 300, y: 80, w: 600, h: 384 };
export const VIEW_MINI: Viewport = { x: 380, y: 150, w: 400, h: 256 };

const N = {
  hualamphong: [392, 352],
  samyan: [440, 360],
  saladaeng: [505, 372],
  lumphini: [548, 376],
  khlongtoei: [630, 392],
  phrakhanong: [760, 372],
  pathumwan: [452, 300],
  siam: [470, 300],
  ratchaprasong: [512, 300],
  nana: [570, 302],
  asok: [615, 308],
  thonglor: [690, 335],
  onnut: [790, 395],
  bangna: [865, 455],
  phayathai: [452, 262],
  pratunam: [512, 262],
  phetAsok: [615, 262],
  ramkhamhaeng: [760, 262],
  victory: [452, 214],
  dindaeng: [520, 214],
  rama9: [615, 222],
  huaikhwang: [600, 178],
  ratchadaLatphrao: [575, 118],
  hayaek: [470, 112],
  bangkapi: [800, 160],
  pinklao: [210, 238],
  sanamluang: [292, 246],
  democracy: [330, 250],
  thaphra: [220, 410],
  wongwianyai: [280, 470],
  sathornBridge: [352, 434],
} as const satisfies Record<string, Pt>;

export type Road = { id: string; name: string; major?: boolean; pts: Pt[] };

export const ROADS: Road[] = [
  {
    id: 'sukhumvit',
    name: 'สุขุมวิท',
    major: true,
    pts: [[398, 300], N.pathumwan, N.siam, N.ratchaprasong, N.nana, N.asok, [650, 320], N.thonglor, [740, 358], N.phrakhanong, N.onnut, [830, 425], N.bangna, [930, 490], [1000, 526]],
  },
  {
    id: 'rama4',
    name: 'พระราม 4',
    major: true,
    pts: [N.hualamphong, N.samyan, N.saladaeng, N.lumphini, [600, 386], N.khlongtoei, [700, 390], N.phrakhanong],
  },
  {
    id: 'ratchada',
    name: 'รัชดาภิเษก',
    major: true,
    pts: [N.khlongtoei, [622, 350], N.asok, N.phetAsok, N.rama9, N.huaikhwang, [588, 148], N.ratchadaLatphrao, [540, 92], [500, 82], [430, 74], [360, 70]],
  },
  { id: 'phahon', name: 'พหลโยธิน', major: true, pts: [N.victory, [455, 170], N.hayaek, [484, 60], [494, 0]] },
  { id: 'vibhavadi', name: 'วิภาวดีรังสิต', major: true, pts: [N.dindaeng, [505, 160], N.hayaek, [452, 62], [440, 0]] },
  {
    id: 'latphrao',
    name: 'ลาดพร้าว',
    major: true,
    pts: [N.hayaek, [520, 115], N.ratchadaLatphrao, [650, 125], [720, 140], N.bangkapi, [880, 168], [1000, 174]],
  },
  {
    id: 'phetchaburi',
    name: 'เพชรบุรี',
    major: true,
    pts: [N.phayathai, N.pratunam, [560, 262], N.phetAsok, [690, 262], N.ramkhamhaeng, [850, 255], [1000, 250]],
  },
  { id: 'rama9', name: 'พระราม 9', pts: [N.rama9, [720, 216], [820, 202], [1000, 196]] },
  { id: 'phayathai', name: 'พญาไท', pts: [N.victory, N.phayathai, N.pathumwan, N.samyan] },
  { id: 'ratchadamri', name: 'ราชปรารภ-ราชดำริ', pts: [N.dindaeng, N.pratunam, N.ratchaprasong, [508, 340], N.saladaeng] },
  { id: 'dindaeng', name: 'ดินแดง', pts: [N.victory, N.dindaeng, [575, 214], N.rama9] },
  { id: 'silom', name: 'สีลม', pts: [N.saladaeng, [440, 390], [378, 404]] },
  {
    id: 'sathorn',
    name: 'สาทร',
    major: true,
    pts: [N.lumphini, [470, 402], [400, 424], N.sathornBridge, [318, 444], N.wongwianyai, [220, 522], [140, 580], [76, 640]],
  },
  {
    id: 'ratchadamnoen',
    name: 'ราชดำเนิน',
    pts: [[0, 238], [120, 238], N.pinklao, N.sanamluang, N.democracy, [372, 254], [412, 258], N.phayathai],
  },
  { id: 'yaowarat', name: 'เยาวราช', pts: [[300, 300], [340, 328], N.hualamphong] },
  { id: 'charan', name: 'จรัญสนิทวงศ์', pts: [[200, 40], [205, 150], N.pinklao, [214, 330], N.thaphra, N.wongwianyai] },
  { id: 'phetkasem', name: 'เพชรเกษม', pts: [N.thaphra, [120, 420], [0, 432]] },
  { id: 'bangnatrat', name: 'บางนา-ตราด', major: true, pts: [N.bangna, [940, 460], [1000, 462]] },
  { id: 'srinakarin', name: 'ศรีนครินทร์', pts: [[880, 150], [878, 250], [885, 350], [905, 470], [920, 560], [930, 640]] },
];

export const RIVER: Pt[] = [
  [246, 0], [258, 60], [254, 130], [266, 196], [262, 238], [276, 288], [310, 330], [334, 376], [350, 430],
  [378, 468], [440, 492], [520, 500], [600, 484], [668, 494], [700, 540], [676, 590], [604, 604], [566, 640],
];

export type Park = { name: string; x: number; y: number; w: number; h: number; r: number };

export const PARKS: Park[] = [
  { name: 'ลุมพินี', x: 514, y: 318, w: 32, h: 46, r: 8 },
  { name: 'เบญจกิติ', x: 640, y: 345, w: 44, h: 36, r: 10 },
  { name: 'จตุจักร', x: 404, y: 100, w: 46, h: 24, r: 10 },
  { name: 'บางกระเจ้า', x: 596, y: 506, w: 90, h: 82, r: 40 },
  { name: 'สนามหลวง', x: 282, y: 254, w: 20, h: 24, r: 6 },
];

export type RailLine = { id: string; name: string; color: string; loop: boolean; pts: Pt[]; stations: Pt[] };

export const RAILS: RailLine[] = [
  {
    id: 'bts',
    name: 'BTS สายสุขุมวิท',
    color: Brand.lime,
    loop: false,
    pts: [
      [485, 0], [475, 58], [461, 108], [446, 168], [443, 214], [443, 262], [443, 291], [512, 291], [570, 293],
      [615, 299], [650, 311], [690, 326], [740, 349], [764, 361], [796, 384], [836, 415], [871, 445], [935, 480], [1000, 515],
    ],
    stations: [[461, 108], [443, 214], [470, 291], [615, 299], [796, 384], [871, 445]],
  },
  {
    id: 'mrt',
    name: 'MRT สายสีน้ำเงิน',
    color: Brand.blue,
    loop: true,
    pts: [
      [392, 343], [440, 351], [505, 363], [548, 367], [600, 377], [637, 383], [631, 350], [624, 308], [624, 262],
      [624, 222], [609, 178], [597, 148], [584, 111], [520, 106], [478, 103], [455, 96], [425, 88], [395, 84],
      [330, 84], [230, 86], [196, 92], [196, 150], [201, 238], [205, 330], [211, 402], [256, 340], [296, 302],
      [322, 304], [346, 322],
    ],
    stations: [[392, 343], [505, 363], [624, 308], [624, 222], [584, 111], [478, 103], [395, 84], [211, 402]],
  },
];

export type Hotspot = {
  id: string;
  name: string;
  at: Pt;
  r: number;
  /** Shorter name for the on-map chip. */
  short?: string;
  /** Where the label chip sits, in map units (left/top of the chip). */
  chip: Pt;
  level: Record<Period, number>;
  cause: Record<Period, CauseKey>;
};

export const HOTSPOTS: Hotspot[] = [
  {
    id: 'asok',
    name: 'แยกอโศก',
    at: [615, 306],
    r: 46,
    chip: [636, 282],
    level: { morning: 0.86, noon: 0.55, evening: 0.95, night: 0.22 },
    cause: { morning: 'rush', noon: 'junction', evening: 'rush', night: 'event' },
  },
  {
    id: 'hayaek',
    name: 'ห้าแยกลาดพร้าว',
    at: [470, 112],
    r: 44,
    chip: [318, 138],
    level: { morning: 0.92, noon: 0.5, evening: 0.86, night: 0.2 },
    cause: { morning: 'rush', noon: 'junction', evening: 'rain', night: 'accident' },
  },
  {
    id: 'victory',
    name: 'อนุสาวรีย์ชัยฯ',
    at: [452, 214],
    r: 40,
    chip: [208, 192],
    level: { morning: 0.88, noon: 0.58, evening: 0.84, night: 0.25 },
    cause: { morning: 'rush', noon: 'junction', evening: 'rush', night: 'event' },
  },
  {
    id: 'pratunam',
    name: 'ประตูน้ำ-ราชประสงค์',
    short: 'ประตูน้ำ',
    at: [512, 282],
    r: 42,
    chip: [528, 234],
    level: { morning: 0.7, noon: 0.78, evening: 0.92, night: 0.36 },
    cause: { morning: 'junction', noon: 'event', evening: 'event', night: 'event' },
  },
  {
    id: 'sathorn',
    name: 'สีลม-สาทร',
    at: [478, 396],
    r: 44,
    chip: [470, 424],
    level: { morning: 0.86, noon: 0.45, evening: 0.9, night: 0.16 },
    cause: { morning: 'rush', noon: 'construction', evening: 'rain', night: 'construction' },
  },
  {
    id: 'rama9',
    name: 'รัชดา-พระราม 9',
    at: [612, 214],
    r: 40,
    chip: [648, 184],
    level: { morning: 0.74, noon: 0.5, evening: 0.88, night: 0.3 },
    cause: { morning: 'rush', noon: 'event', evening: 'rain', night: 'event' },
  },
  {
    id: 'ratchadaLatphrao',
    name: 'รัชดา-ลาดพร้าว',
    at: [575, 118],
    r: 36,
    chip: [600, 82],
    level: { morning: 0.7, noon: 0.45, evening: 0.9, night: 0.24 },
    cause: { morning: 'rush', noon: 'junction', evening: 'rush', night: 'accident' },
  },
  {
    id: 'bangna',
    name: 'บางนา',
    at: [865, 455],
    r: 42,
    chip: [700, 452],
    level: { morning: 0.82, noon: 0.4, evening: 0.84, night: 0.2 },
    cause: { morning: 'rush', noon: 'construction', evening: 'rush', night: 'accident' },
  },
  {
    id: 'pinklao',
    name: 'ปิ่นเกล้า',
    at: [222, 238],
    r: 38,
    chip: [236, 258],
    level: { morning: 0.84, noon: 0.42, evening: 0.8, night: 0.15 },
    cause: { morning: 'rush', noon: 'junction', evening: 'rain', night: 'accident' },
  },
];

export type MapLabel = { text: string; at: Pt; kind: 'road' | 'area' | 'water'; rotate?: number };

export const LABELS: MapLabel[] = [
  { text: 'สุขุมวิท', at: [716, 364], kind: 'road', rotate: 25 },
  { text: 'พระราม 4', at: [668, 404], kind: 'road' },
  { text: 'รัชดาฯ', at: [640, 160], kind: 'road' },
  { text: 'พหลโยธิน', at: [530, 34], kind: 'road' },
  { text: 'วิภาวดีฯ', at: [418, 22], kind: 'road' },
  { text: 'ลาดพร้าว', at: [850, 146], kind: 'road' },
  { text: 'เพชรบุรี', at: [738, 250], kind: 'road' },
  { text: 'พระราม 9', at: [930, 184], kind: 'road' },
  { text: 'สีลม', at: [416, 380], kind: 'road' },
  { text: 'สาทร', at: [418, 438], kind: 'road' },
  { text: 'ราชดำเนิน', at: [356, 238], kind: 'road' },
  { text: 'จรัญฯ', at: [180, 150], kind: 'road' },
  { text: 'เพชรเกษม', at: [70, 414], kind: 'road' },
  { text: 'บางนา-ตราด', at: [952, 446], kind: 'road' },
  { text: 'ศรีนครินทร์', at: [930, 310], kind: 'road' },
  { text: 'รามคำแหง', at: [892, 268], kind: 'road' },
  { text: 'สยาม', at: [470, 316], kind: 'area' },
  { text: 'ธนบุรี', at: [176, 352], kind: 'area' },
  { text: 'รัตนโกสินทร์', at: [322, 304], kind: 'area' },
  { text: 'บางกระเจ้า', at: [641, 547], kind: 'area' },
  { text: 'ลุมพินี', at: [530, 341], kind: 'area' },
  { text: 'จตุจักร', at: [427, 112], kind: 'area' },
  { text: 'แม่น้ำเจ้าพระยา', at: [482, 524], kind: 'water' },
];

/** Simulation tuning per period. `base` is free-flow speed in map units per second. */
export const SIM: Record<Period, { base: number; visible: number }> = {
  morning: { base: 24, visible: 0.92 },
  noon: { base: 32, visible: 0.62 },
  evening: { base: 20, visible: 1 },
  night: { base: 46, visible: 0.3 },
};

/** Map units per second -> km/h for the legend and hotspot chips. */
export const KMH_PER_UNIT = 60 / 46;
export const MAX_SLOWDOWN = 0.9;

export function hotspotKmh(h: Hotspot, period: Period) {
  return Math.round(SIM[period].base * (1 - MAX_SLOWDOWN * h.level[period]) * KMH_PER_UNIT);
}

export type PeriodStat = {
  clock: string;
  title: string;
  minutes: number;
  seconds: number | null;
  speed: string;
  congestion: string | null;
  source: 'tomtom' | 'sim';
};

/** Morning and evening come from TomTom (2025). Noon and night are simulated estimates. */
export const PeriodStats: Record<Period, PeriodStat> = {
  morning: { clock: '08:00', title: 'ชั่วโมงเร่งด่วนเช้า', minutes: 25, seconds: 45, speed: '23.3', congestion: '88.4%', source: 'tomtom' },
  noon: { clock: '13:00', title: 'ช่วงกลางวัน', minutes: 22, seconds: null, speed: '≈27', congestion: null, source: 'sim' },
  evening: { clock: '18:00', title: 'ชั่วโมงเร่งด่วนเย็น', minutes: 31, seconds: 25, speed: '19.1', congestion: '126.5%', source: 'tomtom' },
  night: { clock: '23:30', title: 'ช่วงกลางคืน', minutes: 13, seconds: null, speed: '≈46', congestion: null, source: 'sim' },
};
