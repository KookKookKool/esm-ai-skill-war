import { Brand } from '@/constants/brand';
import { Spacing } from '@/constants/theme';
import { CommuteTimes } from '@/data/research';
import { useViewportWidth } from '@/hooks/use-viewport-width';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = { onMap: () => void; onWhy: () => void };

export function Hero({ onMap, onWhy }: Props) {
  const insets = useSafeAreaInsets();
  const compact = useViewportWidth() < 640;
  // Web leaves room for the floating nav; iOS insets the scroll view automatically.
  const top = Platform.select({ web: compact ? 104 : 124, android: insets.top + 28, default: 28 });

  return (
    <View style={[styles.hero, { paddingTop: top }]}>
      <View style={[styles.glow, styles.glowMint]} />
      <View style={[styles.glow, styles.glowLime]} />
      <RoadStripe />

      <View style={styles.inner}>
        <View style={styles.textCol}>
          <View style={styles.pill}>
            <View style={styles.pillDot} />
            <Text style={styles.pillText}>Bangkok Road Intelligence · แนวคิดระบบจราจรกรุงเทพฯ</Text>
          </View>

          <Text style={[styles.h1, compact && styles.h1Compact]}>
            กรุงเทพฯ ไม่ได้ไกล{'\n'}
            <Text style={styles.h1Accent}>แค่รถติด</Text>
          </Text>

          <Text style={styles.lead}>
            ช่วงเย็นเร่งด่วน ขับรถ 10 กม. ในกรุงเทพฯ ใช้เวลาเฉลี่ย 31 นาที คนที่ขับรถช่วงเร่งด่วนเสียเวลาไปกับรถติดราว 115
            ชั่วโมงต่อปี ระบบนี้รวมข้อมูลถนน รถไฟฟ้า สภาพอากาศ และรายงานจากประชาชน เพื่อบอกว่าติดที่ไหน เพราะอะไร
            และควรออกเดินทางตอนไหน
          </Text>

          <View style={styles.ctaRow}>
            <Pressable
              accessibilityRole="button"
              onPress={onMap}
              style={({ pressed }) => [styles.cta, styles.ctaPrimary, pressed && styles.pressed]}>
              <Text style={styles.ctaPrimaryText}>ดูแผนที่จราจร ↓</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onWhy}
              style={({ pressed }) => [styles.cta, styles.ctaGhost, pressed && styles.pressed]}>
              <Text style={styles.ctaGhostText}>ทำไมกรุงเทพฯ รถติด</Text>
            </Pressable>
          </View>
        </View>

        <CommuteCard />
      </View>
    </View>
  );
}

function CommuteCard() {
  const max = Math.max(...CommuteTimes.map((c) => c.seconds));
  return (
    <View style={styles.card}>
      <Text style={styles.cardEyebrow}>ขับรถ 10 กม. ในกรุงเทพฯ ใช้เวลา</Text>
      <View style={{ gap: 16, marginTop: 14 }}>
        {CommuteTimes.map((c) => {
          const worst = c.tone === 'pink';
          return (
            <View key={c.label}>
              <View style={styles.rowHead}>
                <Text style={styles.rowLabel}>
                  {c.label}
                  {'  '}
                  <Text style={styles.rowSub}>{c.sub}</Text>
                </Text>
                <Text style={[styles.rowTime, worst && { color: '#B0237F' }]}>
                  {Math.floor(c.seconds / 60)}
                  <Text style={styles.rowUnit}> นาที </Text>
                  {c.seconds % 60}
                  <Text style={styles.rowUnit}> วิ</Text>
                </Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.round((c.seconds / max) * 1000) / 10}%`, backgroundColor: Brand[c.tone] }]} />
              </View>
            </View>
          );
        })}
      </View>
      <View style={styles.delta}>
        <Text style={styles.deltaText}>▲ ค่าเฉลี่ยทั้งปีช้าลง 36 วินาทีจากปี 2024</Text>
      </View>
      <Text style={styles.cardSource}>ที่มา: TomTom Traffic Index ข้อมูลปี 2025</Text>
    </View>
  );
}

/** A faint road with lane markings running behind the hero. */
function RoadStripe() {
  return (
    <View style={styles.stripe}>
      <View style={styles.stripeDashes}>
        {Array.from({ length: 48 }, (_, i) => (
          <View key={i} style={styles.dash} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingBottom: Spacing.six,
    paddingHorizontal: Spacing.three,
  },
  glow: { position: 'absolute', width: 520, height: 520, borderRadius: 260 },
  glowMint: { backgroundColor: Brand.mint, opacity: 0.22, top: -260, right: -160 },
  glowLime: { backgroundColor: Brand.lime, opacity: 0.25, bottom: -330, left: -200 },
  stripe: {
    position: 'absolute',
    left: -300,
    right: -300,
    bottom: -10,
    height: 96,
    backgroundColor: 'rgba(16, 35, 27, 0.16)',
    transform: [{ rotate: '-8deg' }],
    justifyContent: 'center',
    overflow: 'hidden',
  },
  stripeDashes: { flexDirection: 'row', gap: 26 },
  dash: { width: 30, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.14)' },
  inner: {
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.five,
  },
  textCol: { flexGrow: 3, flexBasis: 480, flexShrink: 1, gap: Spacing.three },
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  pillDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Brand.yellow },
  pillText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', flexShrink: 1 },
  h1: { color: '#FFFFFF', fontSize: 60, lineHeight: 82, fontWeight: '800', letterSpacing: -0.5 },
  h1Compact: { fontSize: 40, lineHeight: 56 },
  h1Accent: { color: Brand.yellow },
  lead: { color: 'rgba(255,255,255,0.88)', fontSize: 17, lineHeight: 29, maxWidth: 620 },
  ctaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: Spacing.one },
  cta: { paddingVertical: 13, paddingHorizontal: 22, borderRadius: 999 },
  ctaPrimary: { backgroundColor: Brand.yellow },
  ctaPrimaryText: { color: Brand.ink, fontSize: 15, fontWeight: '800' },
  ctaGhost: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)' },
  ctaGhostText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.8 },
  card: {
    flexGrow: 2,
    flexBasis: 320,
    flexShrink: 1,
    maxWidth: 460,
    backgroundColor: Brand.surface,
    borderRadius: 26,
    padding: Spacing.four,
    boxShadow: '0 24px 60px rgba(6, 40, 27, 0.35)',
  },
  cardEyebrow: { color: Brand.ink, fontSize: 17, fontWeight: '800' },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  rowLabel: { color: Brand.ink, fontSize: 14, fontWeight: '700', flexShrink: 1 },
  rowSub: { color: Brand.inkSoft, fontSize: 12, fontWeight: '500' },
  rowTime: { color: Brand.ink, fontSize: 24, fontWeight: '800' },
  rowUnit: { fontSize: 12, fontWeight: '600', color: Brand.inkSoft },
  track: { height: 12, borderRadius: 6, backgroundColor: Brand.page, marginTop: 6, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 6 },
  delta: {
    alignSelf: 'flex-start',
    marginTop: 18,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(232, 61, 168, 0.1)',
  },
  deltaText: { color: '#B0237F', fontSize: 12, fontWeight: '700' },
  cardSource: { color: Brand.inkSoft, fontSize: 11, marginTop: 10 },
});
