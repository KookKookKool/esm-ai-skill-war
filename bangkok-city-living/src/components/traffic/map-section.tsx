import { Brand, MapColors } from '@/constants/brand';
import { Spacing } from '@/constants/theme';
import { HOTSPOTS, PeriodStats, hotspotKmh } from '@/data/bangkok-map';
import { Causes, Periods, type Period } from '@/data/traffic';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LiveMap, hotspotColor } from './live-map/live-map';
import { speedColor } from './live-map/model';
import { Icon } from '@/components/icon';

type Props = { period: Period; onPeriodChange: (p: Period) => void };

export function MapSection({ period, onPeriodChange }: Props) {
  return (
    <View style={styles.band}>
      <View style={styles.inner}>
        <Text style={styles.eyebrow}>แผนที่จำลองการจราจร</Text>
        <Text style={styles.title}>ดูรถทั้งเมืองเคลื่อนที่ แล้วเห็นว่าติดตรงไหน</Text>
        <Text style={styles.sub}>
          แต่ละขีดคือรถหนึ่งคัน สีบอกความเร็ว วงสีชมพูที่กระเพื่อมคือทางแยกที่ติดหนัก ส่วนรถไฟฟ้า BTS และ MRT
          วิ่งด้วยความเร็วเท่าเดิมไม่ว่ารถบนถนนจะติดแค่ไหน
        </Text>

        <View style={styles.card}>
          <View style={styles.mapCol}>
            <LiveMap period={period} />
            <Legend />
          </View>
          <Panel period={period} onPeriodChange={onPeriodChange} />
        </View>
      </View>
    </View>
  );
}

const GRADIENT = Array.from({ length: 32 }, (_, i) => speedColor(0.1 + (i / 31) * 0.9));
const TICKS = [10, 25, 40, 55];

function Legend() {
  return (
    <View style={styles.legend}>
      <View style={styles.legendSpeed}>
        <Text style={styles.legendTitle}>ความเร็วรถ (กม./ชม.)</Text>
        <View style={styles.gradient}>
          {GRADIENT.map((c, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: c }} />
          ))}
        </View>
        <View style={styles.ticks}>
          {TICKS.map((t) => (
            <Text key={t} style={[styles.tick, { left: `${Math.round(((t / 60 - 0.1) / 0.9) * 1000) / 10}%` }]}>
              {t}
            </Text>
          ))}
        </View>
      </View>
      <View style={styles.legendKeys}>
        <LegendKey swatch={<View style={[styles.keyLine, { backgroundColor: Brand.lime }]} />} text="BTS ยกระดับ" />
        <LegendKey
          swatch={
            <View style={styles.keyDash}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={[styles.keyDashPart, { backgroundColor: Brand.blue }]} />
              ))}
            </View>
          }
          text="MRT ใต้ดิน"
        />
        <LegendKey swatch={<View style={styles.keyRing} />} text="จุดติดหนัก" />
      </View>
      <Text style={styles.legendNote}>แผนที่เชิงสัญลักษณ์ ไม่ตามมาตราส่วนจริง</Text>
    </View>
  );
}

function LegendKey({ swatch, text }: { swatch: ReactNode; text: string }) {
  return (
    <View style={styles.key}>
      {swatch}
      <Text style={styles.keyText}>{text}</Text>
    </View>
  );
}

function Panel({ period, onPeriodChange }: Props) {
  const stat = PeriodStats[period];
  const top = [...HOTSPOTS].sort((a, b) => b.level[period] - a.level[period]).slice(0, 4);
  return (
    <View style={styles.panel}>
      <Text style={styles.panelLabel}>เลือกช่วงเวลา</Text>
      <View style={styles.periods}>
        {Periods.map((p) => {
          const active = p.key === period;
          return (
            <Pressable
              key={p.key}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onPeriodChange(p.key)}
              style={({ pressed }) => [styles.period, active && styles.periodActive, pressed && { opacity: 0.8 }]}>
              <Text style={[styles.periodName, active && styles.periodNameActive]}>{p.label}</Text>
              <Text style={[styles.periodTime, active && styles.periodTimeActive]}>{p.time}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.stat}>
        <Text style={styles.statTitle}>
          {stat.clock} น. · {stat.title}
        </Text>
        <Text style={styles.statLabel}>ขับรถ 10 กม. ใช้เวลา</Text>
        <Text style={styles.statBig}>
          {stat.source === 'sim' ? '≈' : ''}
          {stat.minutes}
          <Text style={styles.statUnit}> นาที </Text>
          {stat.seconds !== null ? (
            <>
              {stat.seconds}
              <Text style={styles.statUnit}> วินาที</Text>
            </>
          ) : null}
        </Text>
        <View style={styles.statRow}>
          <View style={styles.miniStat}>
            <Text style={styles.miniLabel}>ความเร็วเฉลี่ย</Text>
            <Text style={styles.miniValue}>{stat.speed} กม./ชม.</Text>
          </View>
          <View style={styles.miniStat}>
            <Text style={styles.miniLabel}>ระดับติดขัด</Text>
            <Text style={styles.miniValue}>{stat.congestion ?? 'ไม่มีข้อมูล'}</Text>
          </View>
        </View>
        <Text style={styles.statSource}>
          {stat.source === 'tomtom' ? 'ที่มา: TomTom Traffic Index ข้อมูลปี 2025' : 'ค่าประมาณจากแบบจำลอง ไม่ใช่ค่าที่วัดจริง'}
        </Text>
      </View>

      <Text style={styles.panelLabel}>จุดที่ติดหนักที่สุดช่วงนี้ · ความเร็วจากแบบจำลอง</Text>
      <View style={{ gap: 8 }}>
        {top.map((h) => {
          const cause = Causes[h.cause[period]];
          return (
            <View key={h.id} style={styles.hotRow}>
              <View style={[styles.hotDot, { backgroundColor: hotspotColor(h.level[period]) }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.hotName}>{h.name}</Text>
                <Text style={styles.hotCause}>
                  <Icon name={cause.icon} size={12} color="rgba(255,255,255,0.6)" /> {cause.label}
                </Text>
              </View>
              <Text style={styles.hotSpeed}>
                {hotspotKmh(h, period)}
                <Text style={styles.hotUnit}> กม./ชม.</Text>
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.six,
  },
  inner: { width: '100%', maxWidth: 1120, alignSelf: 'center' },
  eyebrow: { color: Brand.yellow, fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  title: { color: '#FFFFFF', fontSize: 28, lineHeight: 40, fontWeight: '800', marginTop: 4 },
  sub: { color: 'rgba(255,255,255,0.82)', fontSize: 15, lineHeight: 25, marginTop: 6, maxWidth: 760 },
  card: {
    marginTop: Spacing.four,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    padding: 12,
    borderRadius: 30,
    backgroundColor: MapColors.frame,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    boxShadow: '0 24px 60px rgba(6, 30, 21, 0.45)',
  },
  mapCol: { flexGrow: 3, flexBasis: 560, flexShrink: 1, minWidth: 0, gap: 12 },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    columnGap: Spacing.four,
    rowGap: 10,
    paddingHorizontal: 6,
    paddingBottom: 4,
  },
  legendSpeed: { flexGrow: 1, flexBasis: 220, flexShrink: 1, maxWidth: 320 },
  legendTitle: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700', marginBottom: 6 },
  gradient: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden' },
  ticks: { height: 16, marginTop: 3 },
  tick: { position: 'absolute', width: 30, marginLeft: -15, textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: 10 },
  legendKeys: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingBottom: 18 },
  key: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  keyText: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '600' },
  keyLine: { width: 22, height: 3, borderRadius: 2 },
  keyDash: { flexDirection: 'row', gap: 3 },
  keyDashPart: { width: 5, height: 3, borderRadius: 2 },
  keyRing: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.6, borderColor: Brand.pink },
  legendNote: { color: 'rgba(255,255,255,0.4)', fontSize: 10, paddingBottom: 20, marginLeft: 'auto' },
  panel: { flexGrow: 1, flexBasis: 280, flexShrink: 1, padding: 8, gap: 10 },
  panelLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '700', letterSpacing: 0.4, marginTop: 4 },
  periods: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  period: {
    flexGrow: 1,
    flexBasis: 110,
    flexShrink: 1,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  periodActive: { backgroundColor: Brand.yellow, borderColor: Brand.yellow },
  periodName: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  periodNameActive: { color: Brand.ink },
  periodTime: { color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 1 },
  periodTimeActive: { color: 'rgba(16,35,27,0.7)' },
  stat: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 2,
  },
  statTitle: { color: Brand.mint, fontSize: 12, fontWeight: '800' },
  statLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 6 },
  statBig: { color: '#FFFFFF', fontSize: 34, lineHeight: 44, fontWeight: '800' },
  statUnit: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.75)' },
  statRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  miniStat: { flex: 1, padding: 10, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.18)' },
  miniLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 11 },
  miniValue: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', marginTop: 2 },
  statSource: { color: 'rgba(255,255,255,0.45)', fontSize: 10, marginTop: 8 },
  hotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  hotDot: { width: 10, height: 10, borderRadius: 5 },
  hotName: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  hotCause: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 1 },
  hotSpeed: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  hotUnit: { color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: '600' },
});
