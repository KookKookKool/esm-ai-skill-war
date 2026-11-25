/** Display formatting in Bangkok time, independent of the device's time zone. */
const OFFSET_MS = 7 * 3600_000;

const DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
const MONTHS = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

const pad = (n: number) => String(n).padStart(2, '0');

export function clockWithSeconds(ms: number) {
  const d = new Date(ms + OFFSET_MS);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

export function thaiDate(ms: number) {
  const d = new Date(ms + OFFSET_MS);
  return `วัน${DAYS[d.getUTCDay()]}ที่ ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear() + 543}`;
}

export function ago(ms: number, nowMs: number) {
  const minutes = Math.floor((nowMs - ms) / 60_000);
  if (minutes < 1) return 'เมื่อสักครู่';
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return minutes % 60 ? `${hours} ชม. ${minutes % 60} นาทีที่แล้ว` : `${hours} ชม.ที่แล้ว`;
  return `${Math.floor(hours / 24)} วันที่แล้ว`;
}
