import { ExternalLink } from '@/components/external-link';
import { Brand } from '@/constants/brand';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { Sources } from '@/data/research';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandMark } from './brand-mark';

export function Footer() {
  const insets = useSafeAreaInsets();
  // iOS adds its own bottom inset to the scroll view; Android edge-to-edge does not.
  const extra = Platform.OS === 'android' ? insets.bottom : 0;
  return (
    <View style={[styles.footer, { paddingBottom: Spacing.five + BottomTabInset + extra }]}>
      <View style={styles.inner}>
        <View style={styles.brandCol}>
          <View style={styles.brandRow}>
            <BrandMark size={34} />
            <View>
              <Text style={styles.brand}>Bangkok City Living</Text>
              <Text style={styles.tagline}>รู้ก่อนติด เลือกทางก่อนออกจากบ้าน</Text>
            </View>
          </View>
          <Text style={styles.note}>
            หน้านี้เป็นต้นแบบแนวคิด แผนที่และข้อมูลรายเขตเป็นแบบจำลอง ส่วนตัวเลขที่ระบุแหล่งที่มาเป็นข้อมูลจริงจากแหล่งสาธารณะ
          </Text>
        </View>
        <View style={styles.sourcesCol}>
          <Text style={styles.sourcesTitle}>แหล่งข้อมูลอ้างอิง</Text>
          {Object.values(Sources).map((s) => (
            <ExternalLink key={s.url} href={s.url} style={styles.sourceLink}>
              <Text style={styles.sourceName}>{s.name}</Text>
              {'  '}
              {s.title} ↗
            </ExternalLink>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    backgroundColor: Brand.forest,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.five,
  },
  inner: {
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.five,
  },
  brandCol: { flexGrow: 1, flexBasis: 300, flexShrink: 1, gap: Spacing.three },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brand: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  tagline: { color: Brand.mint, fontSize: 13, fontWeight: '600' },
  note: { color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 22, maxWidth: 420 },
  sourcesCol: { flexGrow: 2, flexBasis: 420, flexShrink: 1, gap: 8 },
  sourcesTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', marginBottom: 4 },
  sourceLink: { color: 'rgba(255,255,255,0.75)', fontSize: 13, lineHeight: 20 },
  sourceName: { color: Brand.yellow, fontWeight: '700' },
});
