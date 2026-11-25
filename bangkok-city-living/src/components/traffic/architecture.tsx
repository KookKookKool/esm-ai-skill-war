import { Brand } from '@/constants/brand';
import { Spacing } from '@/constants/theme';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
    type SharedValue,
} from 'react-native-reanimated';

type Node = { title: string; sub: string };
type Layer = { name: string; tag: string; color: string; textColor: string; nodes: Node[] };

/** Top to bottom: what users touch first, down to where the data comes from. */
const LAYERS: Layer[] = [
  {
    name: 'Clients',
    tag: 'โค้ดชุดเดียว ทุกแพลตฟอร์ม',
    color: Brand.primary,
    textColor: '#FFFFFF',
    nodes: [
      { title: 'เว็บไซต์', sub: 'Expo Router + server rendering' },
      { title: 'แอป iOS', sub: 'Native tabs' },
      { title: 'แอป Android', sub: 'Native tabs' },
      { title: 'แจ้งเตือน', sub: 'บอกก่อนออกจากบ้าน' },
    ],
  },
  {
    name: 'API & Realtime',
    tag: 'Expo API Routes',
    color: Brand.blue,
    textColor: '#FFFFFF',
    nodes: [
      { title: '/api/traffic/live', sub: 'สตรีมสถานะถนน (SSE)' },
      { title: '/api/districts', sub: 'ดัชนีรายเขต' },
      { title: '/api/causes', sub: 'สาเหตุรถติดรายจุด' },
      { title: '/api/forecast', sub: 'คาดการณ์รายชั่วโมง' },
    ],
  },
  {
    name: 'Intelligence',
    tag: 'วิเคราะห์และคาดการณ์',
    color: Brand.purple,
    textColor: '#FFFFFF',
    nodes: [
      { title: 'Congestion Engine', sub: 'ดัชนีติดขัด 0-100 รายถนน' },
      { title: 'Cause Classifier', sub: 'ฝน อุบัติเหตุ ก่อสร้าง ทางแยก' },
      { title: 'Forecast', sub: 'ล่วงหน้า 1-3 ชั่วโมง' },
      { title: 'Route Advisor', sub: 'เวลาออกเดินทาง / ทางเลี่ยง' },
    ],
  },
  {
    name: 'Ingestion',
    tag: 'รับข้อมูลแบบสตรีม',
    color: Brand.orange,
    textColor: Brand.ink,
    nodes: [
      { title: 'Map matching', sub: 'จับคู่พิกัดกับถนนและเขต' },
      { title: 'Event stream', sub: 'คิวข้อมูลแบบเรียลไทม์' },
      { title: 'Time-series store', sub: 'เก็บย้อนหลังรายนาที' },
    ],
  },
  {
    name: 'Data sources',
    tag: 'แหล่งข้อมูลที่เสนอ',
    color: Brand.yellow,
    textColor: Brand.ink,
    nodes: [
      { title: 'GPS probe', sub: 'iTIC: แท็กซี่และรถขนส่ง' },
      { title: 'กล้อง CCTV', sub: 'นับรถ ตรวจจับเหตุ' },
      { title: 'Traffy Fondue', sub: 'ประชาชนแจ้งปัญหาผ่าน LINE' },
      { title: 'เรดาร์ฝน / ระดับน้ำ', sub: 'ฝนตก น้ำท่วมขัง' },
      { title: 'สถานะรถไฟฟ้า', sub: 'BTS / MRT หยุดหรือล่าช้า' },
    ],
  },
];

export function Architecture() {
  const flow = useSharedValue(0);
  useEffect(() => {
    flow.set(withRepeat(withTiming(1, { duration: 1600, easing: Easing.linear }), -1, false));
  }, [flow]);

  return (
    <View>
      {LAYERS.map((layer, i) => (
        <View key={layer.name}>
          <View style={styles.layer}>
            <View style={[styles.label, { backgroundColor: layer.color }]}>
              <Text style={[styles.labelName, { color: layer.textColor }]}>{layer.name}</Text>
              <Text style={[styles.labelTag, { color: layer.textColor }]}>{layer.tag}</Text>
            </View>
            <View style={styles.nodes}>
              {layer.nodes.map((n) => (
                <View key={n.title} style={[styles.node, { borderTopColor: layer.color }]}>
                  <Text style={styles.nodeTitle}>{n.title}</Text>
                  <Text style={styles.nodeSub}>{n.sub}</Text>
                </View>
              ))}
            </View>
          </View>
          {i < LAYERS.length - 1 ? <Connector flow={flow} color={LAYERS[i + 1].color} /> : null}
        </View>
      ))}
      <Text style={styles.caption}>
        ข้อมูลไหลขึ้นจากแหล่งข้อมูลดิบไปถึงหน้าจอผู้ใช้ ทุกแพลตฟอร์มเรียก API ชุดเดียวกัน
      </Text>
    </View>
  );
}

const CONNECTOR_H = 34;

/** A short link between layers with packets moving upwards. */
function Connector({ flow, color }: { flow: SharedValue<number>; color: string }) {
  const a = useAnimatedStyle(() => {
    const t = flow.get();
    return { opacity: Math.sin(t * Math.PI), transform: [{ translateY: (1 - t) * (CONNECTOR_H - 8) }] };
  });
  const b = useAnimatedStyle(() => {
    const t = (flow.get() + 0.5) % 1;
    return { opacity: Math.sin(t * Math.PI), transform: [{ translateY: (1 - t) * (CONNECTOR_H - 8) }] };
  });
  return (
    <View style={styles.connector}>
      {[-120, 0, 120].map((dx) => (
        <View key={dx} style={[styles.track, { transform: [{ translateX: dx }] }]}>
          <Animated.View style={[styles.packet, { backgroundColor: color }, a]} />
          <Animated.View style={[styles.packet, { backgroundColor: color }, b]} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    backgroundColor: Brand.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Brand.line,
    overflow: 'hidden',
    flexDirection: 'row',
    flexWrap: 'wrap',
    boxShadow: '0 6px 22px rgba(0, 117, 74, 0.06)',
  },
  label: { padding: Spacing.three, justifyContent: 'center', flexGrow: 1, flexBasis: 200, flexShrink: 1 },
  labelName: { fontSize: 18, fontWeight: '800' },
  labelTag: { fontSize: 12, marginTop: 2, opacity: 0.85 },
  nodes: { flexGrow: 100, flexBasis: 340, flexShrink: 1, flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, padding: Spacing.three },
  node: {
    flexGrow: 1,
    flexBasis: 150,
    flexShrink: 1,
    backgroundColor: Brand.page,
    borderRadius: 12,
    borderTopWidth: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  nodeTitle: { color: Brand.ink, fontSize: 14, fontWeight: '700' },
  nodeSub: { color: Brand.inkSoft, fontSize: 12, marginTop: 2 },
  connector: { height: CONNECTOR_H, alignItems: 'center' },
  track: {
    position: 'absolute',
    width: 2,
    height: CONNECTOR_H,
    backgroundColor: Brand.line,
    alignItems: 'center',
  },
  packet: { position: 'absolute', top: 0, width: 8, height: 8, borderRadius: 4 },
  caption: { color: Brand.inkSoft, fontSize: 13, textAlign: 'center', marginTop: Spacing.three },
});
