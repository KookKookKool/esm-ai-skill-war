import type { Hotspot } from './types.ts';

/** Well-known Bangkok bottlenecks, at the junction itself. */
export const HOTSPOTS: Hotspot[] = [
  {
    id: 'asok',
    name: 'แยกอโศก',
    at: { lat: 13.7371, lon: 100.5603 },
    overCapacity: 'ถ.อโศกมนตรีรับรถได้ 35,000 คันต่อวัน แต่มีรถใช้กว่า 100,000 คัน',
  },
  {
    id: 'hayaek',
    name: 'ห้าแยกลาดพร้าว',
    at: { lat: 13.8159, lon: 100.5617 },
    overCapacity: 'มีปริมาณรถผ่านมากเป็นอันดับ 2 ของเมือง',
  },
  { id: 'victory', name: 'อนุสาวรีย์ชัยฯ', at: { lat: 13.7649, lon: 100.5383 } },
  { id: 'pratunam', name: 'ประตูน้ำ-ราชประสงค์', at: { lat: 13.749, lon: 100.5402 } },
  { id: 'saladaeng', name: 'แยกศาลาแดง (สีลม)', at: { lat: 13.7289, lon: 100.5357 } },
  { id: 'rama9', name: 'รัชดา-พระราม 9', at: { lat: 13.7576, lon: 100.5654 } },
  { id: 'ratchadaLatphrao', name: 'รัชดา-ลาดพร้าว', at: { lat: 13.8063, lon: 100.5737 } },
  { id: 'bangna', name: 'แยกบางนา', at: { lat: 13.6683, lon: 100.604 } },
  { id: 'pinklao', name: 'แยกปิ่นเกล้า', at: { lat: 13.7787, lon: 100.4765 } },
];
