import { inBangkok } from '../geo.ts';
import { parseTraffyTimestamp } from '../time.ts';
import type { CitizenReport, ReportCategory } from '../types.ts';
import { isObject, num, str, tidy } from './util.ts';

/**
 * Newest Traffy Fondue reports. Filtering by problem type on the API side returns year-old data,
 * and new reports arrive without a type, so classification happens here by keyword.
 */
export const TRAFFY_URL = 'https://publicapi.traffy.in.th/share/teamchadchart/search?limit=150';

/** Checked in this order: a flooded road matters more than a parked car on it. */
const RULES: [ReportCategory, string[]][] = [
  ['flood', ['ท่วม', 'น้ำขัง', 'น้ำรอระบาย', 'น้ำรอการระบาย']],
  ['traffic', ['รถติด', 'จราจร', 'สัญญาณไฟ', 'ไฟแดง', 'ย้อนศร', 'ฝ่าไฟ', 'จุดกลับรถ']],
  ['roadwork', ['ก่อสร้าง', 'ปิดถนน', 'ปิดช่องจราจร', 'หลุม', 'ผิวถนน', 'ผิวจราจร', 'ถนนทรุด', 'ถนนพัง', 'ถนนชำรุด']],
  ['obstruction', ['จอดรถ', 'จอดซ้อน', 'กีดขวาง', 'ขวางทาง']],
];

/** Older reports still carry Traffy's own problem types. */
const TYPE_RULES: [ReportCategory, string][] = [
  ['flood', 'น้ำท่วม'],
  ['traffic', 'จราจร'],
  ['roadwork', 'ถนน'],
  ['obstruction', 'กีดขวาง'],
];

/** Paperwork follow-ups (compensation, registration) mention floods or traffic but report nothing on the road. */
const PAPERWORK = ['เยียวยา', 'เงินช่วยเหลือ', 'ลงทะเบียน', 'ติดตามสถานะ', 'ติดตามเรื่อง', 'ค่าชดเชย'];

export function classifyReport(text: string, types: string[]): ReportCategory | null {
  if (PAPERWORK.some((w) => text.includes(w))) return null;
  for (const [category, words] of RULES) if (words.some((w) => text.includes(w))) return category;
  for (const [category, type] of TYPE_RULES) if (types.includes(type)) return category;
  return null;
}

const DISTRICT = /เขต\s*([^\s,]+)/;

export function normalizeTraffyReports(raw: unknown): CitizenReport[] {
  if (!isObject(raw) || !Array.isArray(raw.results)) return [];
  const out: CitizenReport[] = [];
  for (const r of raw.results) {
    if (!isObject(r)) continue;
    const description = str(r.description);
    const types = Array.isArray(r.problem_type_abdul) ? r.problem_type_abdul.map(str) : [];
    const category = classifyReport(description, types);
    if (!category) continue;
    const coords = Array.isArray(r.coords) ? r.coords : [];
    const lon = num(coords[0]);
    const lat = num(coords[1]);
    const reportedMs = parseTraffyTimestamp(str(r.timestamp));
    if (lat === null || lon === null || reportedMs === null) continue;
    const at = { lat, lon };
    if (!inBangkok(at)) continue;
    out.push({
      id: `traffy-${str(r.ticket_id)}`,
      category,
      text: tidy(description, 90),
      district: DISTRICT.exec(str(r.address))?.[1] ?? null,
      at,
      reportedMs,
      state: str(r.state),
    });
  }
  return out;
}
