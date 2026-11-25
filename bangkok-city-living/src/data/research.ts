import type { IconName } from '@/components/icon';

/**
 * Real-world figures used on the concept page, each tied to a public source.
 * Content is paraphrased from the sources listed in `Sources`.
 */

export type SourceKey = keyof typeof Sources;

export const Sources = {
  tomtom: {
    name: 'TomTom Traffic Index',
    short: 'TomTom',
    title: 'Bangkok traffic report, ข้อมูลปี 2025',
    url: 'https://www.tomtom.com/traffic-index/city/bangkok/',
  },
  tomtomTh: {
    name: 'TomTom Traffic Index',
    short: 'TomTom',
    title: 'Thailand traffic report, ข้อมูลปี 2025',
    url: 'https://www.tomtom.com/traffic-index/country/thailand/',
  },
  rush: {
    name: 'Transit Bangkok',
    short: 'Transit Bangkok',
    title: 'Advice for Bangkok Commuters',
    url: 'https://www.transitbangkok.com/travel_advice.html',
  },
  asok: {
    name: 'Wikipedia',
    short: 'Wikipedia: ถ.อโศกมนตรี',
    title: 'Asok Montri Road',
    url: 'https://en.wikipedia.org/wiki/Asok_Montri_Road',
  },
  latphrao: {
    name: 'Wikipedia',
    short: 'Wikipedia: ห้าแยกลาดพร้าว',
    title: 'Lat Phrao Intersection',
    url: 'https://en.wikipedia.org/wiki/Lat_Phrao_Intersection',
  },
  ato: {
    name: 'Asian Transport Observatory',
    short: 'Asian Transport Observatory',
    title: 'Bangkok transport sector profile',
    url: 'https://asiantransportobservatory.org/documents/245/Bangkok_transport_sector_profile.pdf',
  },
  flood: {
    name: 'The Straits Times',
    short: 'The Straits Times',
    title: 'Bangkok declares disaster over heavy rain (26 ก.ย. 2026)',
    url: 'https://www.straitstimes.com/asia/se-asia/bangkok-prepares-flood-disaster-declaration-for-all-50-districts',
  },
  quake: {
    name: 'Asialink, University of Melbourne',
    short: 'Asialink',
    title: 'In Myanmar, tragedy follows tragedy (บันทึกวันแผ่นดินไหว 28 มี.ค. 2025)',
    url: 'https://asialink.unimelb.edu.au/diplomacy/myanmar-tragedy-follows-tragedy',
  },
  school: {
    name: 'Journal of EASTS',
    short: 'Journal of EASTS',
    title: 'อ้างอิงผลสำรวจของ JICA (1990) เรื่องการเดินทางไปโรงเรียน',
    url: 'https://easts.info/on-line/journal/vol2no5/25011.pdf',
  },
  mrt: {
    name: 'Wikipedia',
    short: 'Wikipedia: MRT',
    title: 'MRT (Bangkok)',
    url: 'https://en.wikipedia.org/wiki/MRT_(Bangkok)',
  },
  traffy: {
    name: 'Wikipedia',
    short: 'Wikipedia: Traffy Fondue',
    title: 'Traffy Fondue',
    url: 'https://en.wikipedia.org/wiki/Traffy_Fondue',
  },
  itic: {
    name: 'MDPI Sustainability (2021)',
    short: 'MDPI Sustainability',
    title: 'Public Transport GPS Probe and Rail Gate Data, Bangkok Metropolitan Region',
    url: 'https://www.mdpi.com/2071-1050/13/4/2178',
  },
} as const;

/** TomTom 10 km travel times, Bangkok 2025. */
export const CommuteTimes = [
  { label: 'เฉลี่ยทั้งปี', sub: 'ทุกช่วงเวลา', time: '22:59', seconds: 22 * 60 + 59, tone: 'yellow' },
  { label: 'เช้าเร่งด่วน', sub: '23.3 กม./ชม.', time: '25:45', seconds: 25 * 60 + 45, tone: 'orange' },
  { label: 'เย็นเร่งด่วน', sub: '19.1 กม./ชม.', time: '31:25', seconds: 31 * 60 + 25, tone: 'pink' },
] as const;

export const Facts: { value: string; unit: string; label: string; source: SourceKey }[] = [
  { value: '67.9', unit: '%', label: 'ระดับติดขัดเฉลี่ยปี 2025 สูงที่สุดในประเทศไทย', source: 'tomtomTh' },
  { value: '115', unit: 'ชม./ปี', label: 'เวลาที่คนขับรถช่วงเร่งด่วนเสียไปกับรถติด เท่ากับ 4 วัน 19 ชั่วโมง', source: 'tomtom' },
  { value: '≈3', unit: 'เท่า', label: 'ถ.อโศกมนตรีรับรถได้ 35,000 คันต่อวัน แต่มีรถใช้กว่า 100,000 คัน', source: 'asok' },
  { value: '566', unit: 'คัน', label: 'รถต่อประชากร 1,000 คน ขณะที่มีถนนราว 1 กม. ต่อประชากร 1,000 คน', source: 'ato' },
];

export type WhyCard = {
  icon: IconName;
  tone: 'orange' | 'blue' | 'purple' | 'pink' | 'lime' | 'yellow';
  title: string;
  value: string;
  valueLabel: string;
  body: string;
  sources: SourceKey[];
};

export const WhyCards: WhyCard[] = [
  {
    icon: 'car-multiple',
    tone: 'orange',
    title: 'ชั่วโมงเร่งด่วน',
    value: '126.5%',
    valueLabel: 'ระดับติดขัดช่วงเย็น',
    body: 'ช่วงเย็นหนักกว่าช่วงเช้าที่ 88.4% ช่วงที่ควรเลี่ยงถนนคือ 07:00-09:00 และ 17:30-20:00',
    sources: ['tomtom', 'rush'],
  },
  {
    icon: 'weather-pouring',
    tone: 'blue',
    title: 'ฝนตกและน้ำท่วมขัง',
    value: '≈300 มม.',
    valueLabel: 'ฝนใน 2 วัน เดือน ก.ย. 2026',
    body: 'ฝนตกหนักเกือบ 48 ชั่วโมงจนถนนจมน้ำและเดินทางลำบาก กทม. ประกาศเขตภัยพิบัติครบทั้ง 50 เขตเมื่อ 26 ก.ย. 2026',
    sources: ['flood'],
  },
  {
    icon: 'traffic-light',
    tone: 'purple',
    title: 'คอขวดที่ทางแยก',
    value: '≈3 เท่า',
    valueLabel: 'ของความจุ ถ.อโศกมนตรี',
    body: 'ส่วนห้าแยกลาดพร้าว จุดตัดพหลโยธินกับวิภาวดีฯ มีปริมาณรถผ่านมากเป็นอันดับ 2 ของเมือง',
    sources: ['asok', 'latphrao'],
  },
  {
    icon: 'subway-variant',
    tone: 'pink',
    title: 'รถไฟฟ้าหยุด ถนนก็หยุด',
    value: '337%',
    valueLabel: 'ระดับติดขัดตอน 15:00 วันที่ 28 มี.ค. 2025',
    body: 'วันที่แผ่นดินไหว BTS และ MRT หยุดวิ่ง ถนนติดขัดทั้งเมือง และเป็นวันที่รถติดที่สุดของปี 2025',
    sources: ['tomtom', 'quake'],
  },
  {
    icon: 'road-variant',
    tone: 'lime',
    title: 'รถมากกว่าถนน',
    value: '566 คัน',
    valueLabel: 'ต่อประชากร 1,000 คน',
    body: 'กรุงเทพฯ มีถนนราว 1 กม. ต่อประชากร 1,000 คน เทียบกับค่าเฉลี่ยทั้งประเทศที่ 10 กม.',
    sources: ['ato'],
  },
  {
    icon: 'school',
    tone: 'yellow',
    title: 'รับส่งนักเรียน',
    value: '≈1 ใน 3',
    valueLabel: 'ของการเดินทางช่วงเร่งด่วน (JICA, 1990)',
    body: 'ผลสำรวจของ JICA พบว่าช่วงเร่งด่วน การเดินทางไปโรงเรียนคิดเป็นเกือบหนึ่งในสามของการเดินทางทั้งหมด',
    sources: ['school'],
  },
];
