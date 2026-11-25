import { Brand, LevelColors, levelFromIndex } from '@/constants/brand';
import { Spacing } from '@/constants/theme';
import { HOTSPOTS, PeriodStats, hotspotKmh } from '@/data/bangkok-map';
import { Causes, Districts, Hourly, Periods, type Period } from '@/data/traffic';
import { StyleSheet, Text, View } from 'react-native';
import { LiveMap, hotspotColor } from './live-map/live-map';
import { Icon } from '@/components/icon';

export function Previews({ period }: { period: Period }) {
  return (
    <View style={styles.row}>
      <View style={styles.browserCol}>
        <BrowserPreview period={period} />
        <Text style={styles.caption}>เว็บไซต์: dashboard เต็มจอสำหรับวางแผนและติดตามทั้งเมือง</Text>
      </View>
      <View style={styles.phoneCol}>
        <PhonePreview period={period} />
        <Text style={styles.caption}>แอปมือถือ: เปิดดูก่อนออกจากบ้าน และรับแจ้งเตือนระหว่างทาง</Text>
      </View>
    </View>
  );
}

function BrowserPreview({ period }: { period: Period }) {
  const top = [...Districts].sort((a, b) => b.index[period] - a.index[period]).slice(0, 4);
  const stat = PeriodStats[period];
  return (
    <View style={styles.browserFrame}>
      <View style={styles.browserBar}>
        {[Brand.pink, Brand.yellow, Brand.mint].map((c) => (
          <View key={c} style={[styles.dot, { backgroundColor: c }]} />
        ))}
        <View style={styles.url}>
          <Text style={styles.urlText} numberOfLines={1}>
            bangkok-city-living.app/dashboard
          </Text>
        </View>
      </View>
      <View style={styles.browserBody}>
        <View style={styles.side}>
          {['ภาพรวม', 'แผนที่สด', 'รายเขต', 'สาเหตุ', 'พยากรณ์'].map((s, i) => (
            <Text key={s} style={[styles.sideItem, i === 0 && styles.sideItemActive]}>
              {s}
            </Text>
          ))}
        </View>
        <View style={{ flex: 1, gap: 10, minWidth: 0 }}>
          <View style={styles.kpis}>
            <View style={styles.kpi}>
              <Text style={styles.kpiLabel}>10 กม. ใช้เวลา</Text>
              <Text style={styles.kpiValue}>
                {stat.source === 'sim' ? '≈' : ''}
                {stat.minutes} นาที
              </Text>
            </View>
            <View style={styles.kpi}>
              <Text style={styles.kpiLabel}>ความเร็วเฉลี่ย</Text>
              <Text style={styles.kpiValue}>{stat.speed}</Text>
            </View>
            <View style={styles.kpi}>
              <Text style={styles.kpiLabel}>ช่วงเวลา</Text>
              <Text style={styles.kpiValue}>{Periods.find((p) => p.key === period)?.label}</Text>
            </View>
          </View>
          <Text style={styles.miniTitle}>ดัชนีรายชั่วโมงวันนี้</Text>
          <View style={styles.miniChart}>
            {Hourly.map((v, h) => (
              <View
                key={h}
                style={{
                  flex: 1,
                  height: `${Math.max(v, 4)}%`,
                  backgroundColor: LevelColors[levelFromIndex(v)],
                  borderRadius: 3,
                }}
              />
            ))}
          </View>
          <View style={styles.chips}>
            {top.map((d) => (
              <View key={d.name} style={styles.chip}>
                <View style={[styles.chipDot, { backgroundColor: LevelColors[levelFromIndex(d.index[period])] }]} />
                <Text style={styles.chipText}>
                  {d.name} {d.index[period]}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

function PhonePreview({ period }: { period: Period }) {
  const alerts = [...HOTSPOTS].sort((a, b) => b.level[period] - a.level[period]).slice(0, 2);
  const stat = PeriodStats[period];
  return (
    <View style={styles.phone}>
      <View style={styles.notch} />
      <View style={styles.phoneHead}>
        <Text style={styles.phoneGreeting}>ตอนนี้ {stat.clock} น.</Text>
        <Text style={styles.phoneTitle}>เดินทางวันนี้</Text>
      </View>
      <LiveMap period={period} variant="mini" />
      <View style={styles.phoneHero}>
        <Text style={styles.phoneHeroLabel}>ขับ 10 กม. ตอนนี้ใช้เวลา</Text>
        <Text style={styles.phoneHeroValue}>
          {stat.source === 'sim' ? '≈' : ''}
          {stat.minutes}
          <Text style={styles.phoneHeroUnit}> นาที</Text>
        </Text>
      </View>
      {alerts.map((h) => (
        <View key={h.id} style={styles.alert}>
          <View style={[styles.alertBar, { backgroundColor: hotspotColor(h.level[period]) }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.alertTitle}>{h.name}</Text>
            <Text style={styles.alertDetail}>
              <Icon name={Causes[h.cause[period]].icon} size={12} color={Brand.inkSoft} /> {Causes[h.cause[period]].label}
            </Text>
          </View>
          <Text style={styles.alertSpeed}>{hotspotKmh(h, period)} กม./ชม.</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.five, alignItems: 'center' },
  browserCol: { flexGrow: 3, flexBasis: 440, flexShrink: 1, minWidth: 0, gap: 12 },
  phoneCol: { flexGrow: 2, flexBasis: 300, flexShrink: 1, alignItems: 'center', gap: 12 },
  caption: { color: Brand.inkSoft, fontSize: 13, textAlign: 'center' },
  browserFrame: {
    backgroundColor: Brand.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Brand.line,
    overflow: 'hidden',
    boxShadow: '0 20px 48px rgba(33, 90, 67, 0.18)',
  },
  browserBar: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, backgroundColor: Brand.forest },
  dot: { width: 10, height: 10, borderRadius: 5 },
  url: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  urlText: { color: 'rgba(255,255,255,0.85)', fontSize: 11 },
  browserBody: { flexDirection: 'row', padding: Spacing.three, gap: Spacing.three },
  side: { width: 84, gap: 6 },
  sideItem: { fontSize: 12, color: Brand.inkSoft, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, overflow: 'hidden' },
  sideItemActive: { backgroundColor: Brand.primary, color: '#FFFFFF', fontWeight: '700' },
  kpis: { flexDirection: 'row', gap: 8 },
  kpi: { flex: 1, padding: 10, borderRadius: 12, backgroundColor: Brand.page, minWidth: 0 },
  kpiLabel: { color: Brand.inkSoft, fontSize: 10 },
  kpiValue: { color: Brand.ink, fontSize: 15, fontWeight: '800', marginTop: 2 },
  miniTitle: { color: Brand.ink, fontSize: 13, fontWeight: '700' },
  miniChart: { height: 96, flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Brand.page,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { fontSize: 12, color: Brand.ink, fontWeight: '600' },
  phone: {
    width: 300,
    backgroundColor: Brand.page,
    borderRadius: 42,
    borderWidth: 9,
    borderColor: Brand.ink,
    padding: 14,
    paddingTop: 30,
    gap: 10,
    boxShadow: '0 24px 56px rgba(16, 35, 27, 0.3)',
  },
  notch: {
    position: 'absolute',
    top: 9,
    alignSelf: 'center',
    width: 84,
    height: 9,
    borderRadius: 5,
    backgroundColor: Brand.ink,
  },
  phoneHead: { marginTop: 2 },
  phoneGreeting: { color: Brand.inkSoft, fontSize: 12 },
  phoneTitle: { color: Brand.ink, fontSize: 22, fontWeight: '800' },
  phoneHero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Brand.primary,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  phoneHeroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 12, flexShrink: 1 },
  phoneHeroValue: { color: '#FFFFFF', fontSize: 26, fontWeight: '800' },
  phoneHeroUnit: { fontSize: 13, color: Brand.yellow, fontWeight: '700' },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Brand.surface,
    borderRadius: 14,
    padding: 10,
  },
  alertBar: { width: 5, alignSelf: 'stretch', borderRadius: 3 },
  alertTitle: { color: Brand.ink, fontSize: 13, fontWeight: '700' },
  alertDetail: { color: Brand.inkSoft, fontSize: 11, marginTop: 2 },
  alertSpeed: { color: Brand.ink, fontSize: 12, fontWeight: '800' },
});
