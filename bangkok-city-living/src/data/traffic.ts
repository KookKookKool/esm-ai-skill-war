import type { IconName } from '@/components/icon';

/**
 * Illustrative sample data for the concept page.
 * Index = congestion index 0-100 (0 free flow, 100 gridlock).
 * Replace with the live API once the ingestion pipeline exists.
 */

export type Period = 'morning' | 'noon' | 'evening' | 'night';

export const Periods: { key: Period; label: string; time: string }[] = [
  { key: 'morning', label: 'เช้า', time: '06:00-09:59' },
  { key: 'noon', label: 'กลางวัน', time: '10:00-15:59' },
  { key: 'evening', label: 'เย็น', time: '16:00-20:59' },
  { key: 'night', label: 'ดึก', time: '21:00-05:59' },
];

export type CauseKey = 'rush' | 'rain' | 'accident' | 'construction' | 'junction' | 'event';

export const Causes: Record<CauseKey, { label: string; icon: IconName }> = {
  rush: { label: 'ชั่วโมงเร่งด่วน', icon: 'car-multiple' },
  rain: { label: 'ฝนตก / น้ำท่วมขัง', icon: 'weather-pouring' },
  accident: { label: 'อุบัติเหตุ', icon: 'car-emergency' },
  construction: { label: 'ก่อสร้าง / ปิดช่องทาง', icon: 'traffic-cone' },
  junction: { label: 'ทางแยก / สัญญาณไฟ', icon: 'traffic-light' },
  event: { label: 'โรงเรียน / ห้าง / อีเวนต์', icon: 'calendar-star' },
};

export type District = {
  name: string;
  area: string;
  road: string;
  index: Record<Period, number>;
  cause: Record<Period, CauseKey>;
};

export const Districts: District[] = [
  {
    name: 'ปทุมวัน',
    area: 'สยาม - ราชประสงค์',
    road: 'ถ.พระราม 1',
    index: { morning: 72, noon: 61, evening: 88, night: 38 },
    cause: { morning: 'rush', noon: 'event', evening: 'junction', night: 'event' },
  },
  {
    name: 'วัฒนา',
    area: 'สุขุมวิท - อโศก',
    road: 'ถ.สุขุมวิท',
    index: { morning: 69, noon: 58, evening: 91, night: 44 },
    cause: { morning: 'rush', noon: 'junction', evening: 'rush', night: 'event' },
  },
  {
    name: 'บางรัก',
    area: 'สีลม - สาทร',
    road: 'ถ.สีลม',
    index: { morning: 78, noon: 52, evening: 85, night: 30 },
    cause: { morning: 'rush', noon: 'construction', evening: 'rain', night: 'construction' },
  },
  {
    name: 'ห้วยขวาง',
    area: 'รัชดา - พระราม 9',
    road: 'ถ.รัชดาภิเษก',
    index: { morning: 74, noon: 49, evening: 83, night: 41 },
    cause: { morning: 'junction', noon: 'accident', evening: 'rush', night: 'event' },
  },
  {
    name: 'จตุจักร',
    area: 'หมอชิต - ลาดพร้าว',
    road: 'ถ.พหลโยธิน',
    index: { morning: 81, noon: 55, evening: 79, night: 27 },
    cause: { morning: 'rush', noon: 'event', evening: 'accident', night: 'construction' },
  },
  {
    name: 'ลาดพร้าว',
    area: 'ห้าแยกลาดพร้าว',
    road: 'ถ.ลาดพร้าว',
    index: { morning: 84, noon: 63, evening: 86, night: 33 },
    cause: { morning: 'junction', noon: 'construction', evening: 'rain', night: 'construction' },
  },
  {
    name: 'ดินแดง',
    area: 'อนุสาวรีย์ชัยฯ',
    road: 'ถ.ราชวิถี',
    index: { morning: 76, noon: 46, evening: 80, night: 24 },
    cause: { morning: 'rush', noon: 'accident', evening: 'junction', night: 'accident' },
  },
  {
    name: 'บางนา',
    area: 'บางนา - อุดมสุข',
    road: 'ถ.บางนา-ตราด',
    index: { morning: 58, noon: 42, evening: 77, night: 36 },
    cause: { morning: 'rush', noon: 'event', evening: 'event', night: 'event' },
  },
  {
    name: 'พระนคร',
    area: 'เกาะรัตนโกสินทร์',
    road: 'ถ.ราชดำเนิน',
    index: { morning: 51, noon: 57, evening: 64, night: 22 },
    cause: { morning: 'event', noon: 'event', evening: 'rain', night: 'construction' },
  },
  {
    name: 'ธนบุรี',
    area: 'คลองสาน - ตลาดพลู',
    road: 'ถ.กรุงธนบุรี',
    index: { morning: 63, noon: 40, evening: 71, night: 19 },
    cause: { morning: 'rush', noon: 'construction', evening: 'rain', night: 'construction' },
  },
];

/** Hourly city-wide congestion index, 00:00 - 23:00. */
export const Hourly: number[] = [
  14, 10, 8, 8, 12, 28, 52, 78, 86, 70, 58, 54, 56, 55, 52, 56, 68, 84, 92, 88, 72, 54, 38, 24,
];

export function hourCause(hour: number): { cause: CauseKey; note: string } {
  if (hour >= 6 && hour <= 9) return { cause: 'rush', note: 'คนเดินทางไปทำงานและส่งบุตรหลานไปโรงเรียนพร้อมกัน' };
  if (hour >= 16 && hour <= 20) return { cause: 'rush', note: 'เลิกงานชนกับฝนตกบ่อยช่วงเย็น ทางแยกใหญ่ระบายช้า' };
  if (hour >= 10 && hour <= 15) return { cause: 'construction', note: 'งานก่อสร้างและขนส่งสินค้ากินช่องจราจร' };
  return { cause: 'junction', note: 'ถนนโล่ง ส่วนใหญ่ติดเพราะอุบัติเหตุเป็นจุดๆ' };
}

export const Alerts: { time: string; title: string; detail: string; level: 2 | 3 | 4; cause: CauseKey }[] = [
  { time: '17:42', title: 'สุขุมวิท ขาออก', detail: 'รถหนาแน่น ช้าลง 18 นาที', level: 4, cause: 'rush' },
  { time: '17:35', title: 'ลาดพร้าว - รัชดา', detail: 'ฝนตก ระบายช้า', level: 3, cause: 'rain' },
  { time: '17:20', title: 'พระราม 4 ขาเข้า', detail: 'ปิดช่องทางซ้ายก่อสร้าง', level: 3, cause: 'construction' },
];
