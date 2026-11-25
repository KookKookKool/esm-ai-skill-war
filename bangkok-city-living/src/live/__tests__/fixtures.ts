/**
 * Records copied from real responses on 25 Nov 2026 (structure kept complete), with a few
 * values changed so every branch has a case. Times in comments are Bangkok local time.
 */

export const NOW = Date.UTC(2026, 10, 25, 9, 40); // 16:40

export function iticEvent(over: Record<string, unknown>) {
  return {
    eid: '993700',
    title: 'อุบัติเหตุ แยกอโศก',
    title_en: 'Accident at Asok',
    description: 'รถชนกัน 2 คัน\r\nกีดขวางช่องซ้าย',
    description_en: 'Two cars crashed.',
    latitude: '13.7372',
    longitude: '100.5606',
    type: '3',
    start: '2026-11-25 16:18:00',
    stop: '2026-11-25 17:18:00',
    contributor: 'RVP',
    icon: 'accident',
    showlevel: 12,
    severity: '',
    ...over,
  };
}

export const iticFeed = [
  iticEvent({}),
  iticEvent({
    eid: '993701',
    title: 'Road Diversion at Ratchaprarop Rd.',
    title_en: 'Road Diversion at Ratchaprarop Rd.',
    latitude: '13.7536',
    longitude: '100.5417',
    type: '18',
    icon: 'diversion',
    start: '2026-10-23 00:00:00',
    stop: '2026-12-25 23:59:59',
    contributor: 'itic.nirat',
  }),
  // Finished at 16:00, before NOW.
  iticEvent({ eid: '993702', start: '2026-11-25 14:00:00', stop: '2026-11-25 16:00:00' }),
  // Outside Bangkok (Mae Rim, Chiang Mai).
  iticEvent({ eid: '993703', latitude: '18.5833', longitude: '99.05764' }),
  // Not a traffic event.
  iticEvent({ eid: '993704', icon: 'information', type: '8', title: 'The price of fuel has decreased' }),
  iticEvent({ eid: '993705', icon: 'roadclosed', type: '19', title: 'ปิดถนนพระสุเมรุ' }),
];

export function traffyRecord(over: Record<string, unknown>) {
  return {
    type: null,
    org: 'กรุงเทพมหานคร',
    description: 'น้ำท่วมขังหน้าซอย รถผ่านลำบาก',
    ticket_id: '2026-AAAA01',
    coords: ['100.5530', '13.7630'],
    photo_url: 'https://storage.googleapis.com/traffy_public_bucket/attachment/2026-11/a.jpg',
    after_photo: '',
    address: 'แขวงดินแดง เขตดินแดง กรุงเทพมหานคร',
    timestamp: '2026-11-25 09:10:00.123456+00',
    problem_type_abdul: [''],
    star: null,
    count_reopen: '0',
    note: null,
    state: 'รอรับเรื่อง',
    last_activity: '2026-11-25 09:10:00.123456+00',
    ...over,
  };
}

export const traffyResponse = {
  status: true,
  total: 1562729,
  results: [
    traffyRecord({}),
    traffyRecord({ ticket_id: '2026-AAAA02', description: 'สัญญาณไฟจราจรเสีย แยกนี้รถติดยาว' }),
    traffyRecord({ ticket_id: '2026-AAAA03', description: 'เก็บขยะไม่หมดเหม็นมาก' }),
    // Hat Yai, far outside Bangkok.
    traffyRecord({ ticket_id: '2026-AAAA04', coords: ['100.4747', '7.0084'] }),
    traffyRecord({ ticket_id: '2026-AAAA05', description: 'มีรถจอดซ้อนคัน และน้ำท่วมถนน' }),
    traffyRecord({
      ticket_id: '2026-AAAA06',
      description:
        'ถนนชำรุดเป็นหลุมขนาดใหญ่ รถจักรยานยนต์ล้มไปแล้วหลายคัน ขอให้เร่งซ่อมแซมโดยด่วนเพราะอันตรายมากในช่วงกลางคืนที่ไฟส่องสว่างไม่พอ',
      address: '12/103 ซอยเฉลิมพระเกียรติ แขวงหนองบอน',
    }),
    traffyRecord({ ticket_id: '2026-AAAA07', timestamp: 'not a time' }),
  ],
};

export function airStation(over: Record<string, unknown>, pm25 = '20.5') {
  return {
    stationID: '02t',
    nameTH: 'มหาวิทยาลัยราชภัฏบ้านสมเด็จเจ้าพระยา',
    nameEN: 'Bansomdejchaopraya Rajabhat University',
    areaTH: 'แขวงหิรัญรูจี เขตธนบุรี, กรุงเทพฯ',
    areaEN: 'Hiran Ruchi, Khet Thon Buri, Bangkok',
    stationType: 'GROUND',
    lat: '13.732846',
    long: '100.487662',
    forecast: [],
    AQILast: {
      date: '2026-11-25',
      time: '16:00',
      PM25: { color_id: '2', aqi: '39', value: pm25 },
      PM10: { color_id: '0', aqi: '-1', value: '-1' },
      O3: { color_id: '0', aqi: '-1', value: '-1' },
      CO: { color_id: '0', aqi: '-1', value: '-1' },
      NO2: { color_id: '0', aqi: '-1', value: '-1' },
      SO2: { color_id: '0', aqi: '-1', value: '-1' },
      AQI: { color_id: '2', aqi: '39', param: 'PM25' },
    },
    ...over,
  };
}

export const airResponse = {
  regionID: '1',
  nameTH: 'กรุงเทพและปริมณฑล',
  nameEN: 'Bangkok and Metropolitan',
  stations: [
    airStation({}),
    airStation(
      { stationID: '11t', nameTH: 'ริมถนนทางหลวงหมายเลข 3902', areaTH: 'ต.ท่าทราย อ.เมือง, สมุทรสาคร', areaEN: 'Tha Sai, Mueang, Samut Sakhon' },
      '27.2',
    ),
    airStation({ stationID: '50t', nameTH: 'โรงพยาบาลจุฬาลงกรณ์', lat: '13.729852', long: '100.536501' }, '-1'),
    airStation({ stationID: '52t', nameTH: 'โรงเรียนนนทรีวิทยา', lat: '13.70806667', long: '100.5473333' }, '41.0'),
  ],
};

export function openMeteo(current: { precipitation: number; weather_code: number }) {
  const hours = Array.from({ length: 48 }, (_, i) => {
    const day = 25 + Math.floor(i / 24);
    return `2026-11-${day}T${String(i % 24).padStart(2, '0')}:00`;
  });
  const prob = hours.map((_, i) => [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 16, 38, 55, 64, 69, 69, 64, 54, 43, 28, 12, 0, 0][i % 24]);
  return {
    latitude: 13.743409,
    longitude: 100.495865,
    generationtime_ms: 0.11,
    utc_offset_seconds: 25200,
    timezone: 'Asia/Bangkok',
    timezone_abbreviation: 'GMT+7',
    elevation: 4,
    current_units: { time: 'iso8601', interval: 'seconds', temperature_2m: '°C', precipitation: 'mm', rain: 'mm', weather_code: 'wmo code' },
    current: { time: '2026-11-25T16:45', interval: 900, temperature_2m: 32.7, rain: current.precipitation, ...current },
    hourly_units: { time: 'iso8601', precipitation_probability: '%', precipitation: 'mm' },
    hourly: { time: hours, precipitation_probability: prob, precipitation: hours.map((_, i) => (i === 17 ? 1.4 : 0)) },
  };
}

export const tomtomFlow = {
  flowSegmentData: {
    '-version': 'traffic-service 2.0.004',
    frc: 'FRC2',
    currentSpeed: 41,
    freeFlowSpeed: 70,
    currentTravelTime: 153,
    freeFlowTravelTime: 90,
    confidence: 0.59,
    roadClosure: true,
    coordinates: { coordinate: [{ latitude: 13.7371, longitude: 100.5603 }] },
  },
};
