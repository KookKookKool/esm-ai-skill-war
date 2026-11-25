import type { IconName } from '@/components/icon';
import { Brand } from '@/constants/brand';
import type { MapIconName } from './map-icons';
import type { EventKind, ReportCategory, SourceId, SourceState } from '@/live/types';

/** Icon names exist in both MaterialCommunityIcons (app UI) and MAP_ICON_PATHS (map markers). */
type Meta = { icon: IconName & MapIconName; label: string; color: string };

export const EVENT_META: Record<EventKind, Meta> = {
  accident: { icon: 'car-emergency', label: 'อุบัติเหตุ', color: Brand.pink },
  breakdown: { icon: 'car-wrench', label: 'รถเสีย', color: Brand.orange },
  roadwork: { icon: 'traffic-cone', label: 'ก่อสร้าง/เบี่ยงจราจร', color: Brand.yellow },
  closure: { icon: 'minus-circle', label: 'ปิดถนน', color: Brand.pink },
  flood: { icon: 'waves', label: 'น้ำท่วม', color: Brand.blue },
  event: { icon: 'calendar-star', label: 'งาน/กิจกรรม', color: Brand.lime },
  fire: { icon: 'fire', label: 'เพลิงไหม้', color: Brand.orange },
  jam: { icon: 'traffic-light', label: 'รถติดสะสม', color: Brand.orange },
  other: { icon: 'map-marker-alert', label: 'เหตุการณ์อื่น', color: Brand.mint },
};

export const REPORT_META: Record<ReportCategory, Meta> = {
  flood: { icon: 'water', label: 'แจ้งน้ำท่วม', color: Brand.blue },
  traffic: { icon: 'traffic-light', label: 'แจ้งปัญหาจราจร', color: Brand.orange },
  roadwork: { icon: 'wrench', label: 'แจ้งถนนชำรุด', color: Brand.yellow },
  obstruction: { icon: 'boom-gate', label: 'แจ้งสิ่งกีดขวาง', color: Brand.purple },
};

/** Pollution Control Department PM2.5 bands. */
export const AIR_LEVELS = [
  { label: 'ดีมาก', range: '0-15', color: Brand.blue },
  { label: 'ดี', range: '15-25', color: Brand.mint },
  { label: 'ปานกลาง', range: '25-37.5', color: Brand.yellow },
  { label: 'เริ่มมีผลต่อสุขภาพ', range: '37.5-75', color: Brand.orange },
  { label: 'มีผลต่อสุขภาพ', range: '75+', color: Brand.pink },
] as const;

export const SOURCE_META: Record<SourceId, { name: string; provider: string; url: string; gives: string; refresh: string }> = {
  itic: {
    name: 'เหตุการณ์จราจร',
    provider: 'iTIC ผ่าน Longdo Event',
    url: 'https://event.longdo.com/',
    gives: 'อุบัติเหตุ รถเสีย ปิด/เบี่ยงจราจร น้ำท่วม งานกิจกรรม',
    refresh: 'ทุก 1 นาที',
  },
  traffy: {
    name: 'เรื่องแจ้งจากประชาชน',
    provider: 'Traffy Fondue (NECTEC × กทม.)',
    url: 'https://www.traffy.in.th/',
    gives: 'คัดเฉพาะเรื่องจราจร ถนนชำรุด สิ่งกีดขวาง น้ำท่วม จาก 150 เรื่องล่าสุด',
    refresh: 'ทุก 3 นาที',
  },
  air4thai: {
    name: 'คุณภาพอากาศ PM2.5',
    provider: 'กรมควบคุมมลพิษ (Air4Thai)',
    url: 'http://air4thai.pcd.go.th/',
    gives: 'ค่า PM2.5 รายชั่วโมงจากสถานีตรวจวัดในกรุงเทพฯ',
    refresh: 'ทุก 10 นาที',
  },
  openmeteo: {
    name: 'ฝนและอุณหภูมิ',
    provider: 'Open-Meteo',
    url: 'https://open-meteo.com/',
    gives: 'สภาพอากาศปัจจุบันทุก 15 นาที และโอกาสฝนรายชั่วโมง 48 ชม.',
    refresh: 'ทุก 10 นาที',
  },
  tomtom: {
    name: 'ความเร็วรถจริง',
    provider: 'TomTom Traffic API',
    url: 'https://developer.tomtom.com/',
    gives: 'ความเร็วจริงเทียบกับรถโล่งที่จุดติด และชั้นสีการจราจรบนแผนที่',
    refresh: 'ทุก 10 นาที',
  },
};

export const STATE_META: Record<SourceState, { label: string; color: string }> = {
  ok: { label: 'ทำงานปกติ', color: Brand.mint },
  loading: { label: 'กำลังดึงข้อมูล', color: Brand.yellow },
  stale: { label: 'ใช้ข้อมูลล่าสุดที่มี', color: Brand.orange },
  error: { label: 'เชื่อมต่อไม่ได้', color: Brand.pink },
  disabled: { label: 'ยังไม่เปิดใช้', color: '#8AA39A' },
};
