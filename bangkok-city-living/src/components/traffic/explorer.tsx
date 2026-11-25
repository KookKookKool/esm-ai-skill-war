import { Brand, LevelColors, LevelLabels, levelFromIndex } from '@/constants/brand';
import { Spacing } from '@/constants/theme';
import { Causes, Districts, Hourly, Periods, hourCause, type CauseKey, type Period } from '@/data/traffic';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from './section';
import { Icon } from '@/components/icon';

type Props = { period: Period; onPeriodChange: (p: Period) => void };

export function Explorer({ period, onPeriodChange }: Props) {
  const [hour, setHour] = useState(18);

  const ranked = useMemo(
    () => [...Districts].sort((a, b) => b.index[period] - a.index[period]),
    [period],
  );

  return (
    <View style={{ gap: Spacing.three }}>
      <View style={styles.tabs}>
        {Periods.map((p) => {
          const active = p.key === period;
          return (
            <Pressable
              key={p.key}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onPeriodChange(p.key)}
              style={[styles.tab, active && styles.tabActive]}>
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{p.label}</Text>
              <Text style={[styles.tabTime, active && styles.tabTimeActive]}>{p.time}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.row}>
        <Card style={styles.cardLeft}>
          <Text style={styles.cardTitle}>เขตที่ติดมากที่สุด</Text>
          <Text style={styles.cardHint}>เรียงตามดัชนีความหนาแน่น 0-100 พร้อมสาเหตุหลัก</Text>
          <View style={{ marginTop: Spacing.three, gap: 14 }}>
            {ranked.map((d, i) => {
              const value = d.index[period];
              const level = levelFromIndex(value);
              const cause = Causes[d.cause[period]];
              return (
                <View key={d.name} style={styles.districtRow}>
                  <Text style={styles.rank}>{i + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={styles.districtHead}>
                      <Text style={styles.districtName} numberOfLines={1}>
                        {d.name} <Text style={styles.districtArea}>{d.area}</Text>
                      </Text>
                      <Text style={[styles.value, { color: level >= 3 ? '#B0237F' : Brand.forest }]}>{value}</Text>
                    </View>
                    <View style={styles.track}>
                      <View style={[styles.fill, { width: `${value}%`, backgroundColor: LevelColors[level] }]} />
                    </View>
                    <Text style={styles.causeText}>
                      <Icon name={cause.icon} size={13} color={Brand.inkSoft} /> {cause.label} · {LevelLabels[level]}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </Card>

        <View style={[styles.cardRight, { gap: Spacing.three }]}>
          <Card>
            <Text style={styles.cardTitle}>ติดตอนไหนของวัน</Text>
            <Text style={styles.cardHint}>แตะแท่งเพื่อดูสาเหตุของแต่ละชั่วโมง</Text>
            <HourlyChart selected={hour} onSelect={setHour} />
            <HourDetail hour={hour} />
          </Card>
          <Card>
            <Text style={styles.cardTitle}>ติดเพราะอะไรมากที่สุด</Text>
            <Text style={styles.cardHint}>จำนวนเขตที่มีสาเหตุนี้เป็นหลักในช่วง{Periods.find((p) => p.key === period)?.label}</Text>
            <CauseSummary period={period} />
          </Card>
        </View>
      </View>
    </View>
  );
}

const CauseColors: Record<CauseKey, string> = {
  rush: Brand.orange,
  rain: Brand.blue,
  accident: Brand.pink,
  construction: Brand.yellow,
  junction: Brand.purple,
  event: Brand.lime,
};

function CauseSummary({ period }: { period: Period }) {
  const counts = (Object.keys(Causes) as CauseKey[])
    .map((k) => ({ key: k, n: Districts.filter((d) => d.cause[period] === k).length }))
    .sort((a, b) => b.n - a.n);
  return (
    <View style={{ gap: 12, marginTop: Spacing.three }}>
      {counts.map(({ key, n }) => (
        <View key={key} style={styles.causeRow}>
          <View style={[styles.causeSwatch, { backgroundColor: CauseColors[key] }]} />
          <Text style={styles.causeName}>
            <Icon name={Causes[key].icon} size={14} color={Brand.ink} /> {Causes[key].label}
          </Text>
          <View style={styles.causeTrack}>
            <View style={{ width: `${(n / Districts.length) * 100}%`, height: '100%', backgroundColor: CauseColors[key], borderRadius: 999 }} />
          </View>
          <Text style={styles.causeCount}>{n}</Text>
        </View>
      ))}
    </View>
  );
}

function HourlyChart({ selected, onSelect }: { selected: number; onSelect: (h: number) => void }) {
  return (
    <View style={styles.chart}>
      {Hourly.map((v, h) => {
        const active = h === selected;
        return (
          <Pressable
            key={h}
            accessibilityRole="button"
            accessibilityLabel={`${h}:00 ดัชนี ${v}`}
            onPress={() => onSelect(h)}
            style={styles.barWrap}>
            <View
              style={[
                styles.bar,
                {
                  height: `${Math.max(v, 4)}%`,
                  backgroundColor: LevelColors[levelFromIndex(v)],
                  opacity: active ? 1 : 0.55,
                  borderColor: active ? Brand.ink : 'transparent',
                },
              ]}
            />
            <Text style={[styles.hourLabel, active && { color: Brand.ink, fontWeight: '800' }]}>
              {h % 3 === 0 ? String(h).padStart(2, '0') : ''}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function HourDetail({ hour }: { hour: number }) {
  const v = Hourly[hour];
  const level = levelFromIndex(v);
  const { cause, note } = hourCause(hour);
  return (
    <View style={[styles.detail, { borderColor: LevelColors[level] }]}>
      <Text style={styles.detailTime}>
        {String(hour).padStart(2, '0')}:00 · {LevelLabels[level]} ({v})
      </Text>
      <Text style={styles.detailCause}>
        <Icon name={Causes[cause].icon} size={18} color={Brand.ink} /> {Causes[cause].label}
      </Text>
      <Text style={styles.detailNote}>{note}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tab: {
    flexGrow: 1,
    flexBasis: 120,
    flexShrink: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.line,
  },
  tabActive: { backgroundColor: Brand.primary, borderColor: Brand.primary },
  tabLabel: { color: Brand.ink, fontSize: 16, fontWeight: '700' },
  tabLabelActive: { color: '#fff' },
  tabTime: { color: Brand.inkSoft, fontSize: 12, marginTop: 2 },
  tabTimeActive: { color: 'rgba(255,255,255,0.8)' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three, alignItems: 'flex-start' },
  cardLeft: { flexGrow: 3, flexBasis: 420, flexShrink: 1, minWidth: 0 },
  cardRight: { flexGrow: 2, flexBasis: 340, flexShrink: 1, minWidth: 0 },
  cardTitle: { color: Brand.ink, fontSize: 18, fontWeight: '700' },
  cardHint: { color: Brand.inkSoft, fontSize: 13, marginTop: 2 },
  districtRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  rank: {
    width: 26,
    height: 26,
    borderRadius: 13,
    textAlign: 'center',
    lineHeight: 26,
    fontSize: 13,
    fontWeight: '800',
    color: Brand.forest,
    backgroundColor: Brand.page,
    overflow: 'hidden',
  },
  districtHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  districtName: { flex: 1, color: Brand.ink, fontSize: 15, fontWeight: '700' },
  districtArea: { color: Brand.inkSoft, fontSize: 12, fontWeight: '500' },
  value: { fontSize: 16, fontWeight: '800', marginLeft: 8 },
  track: { height: 10, borderRadius: 999, backgroundColor: Brand.page, marginTop: 6, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
  causeText: { color: Brand.inkSoft, fontSize: 12, marginTop: 6 },
  chart: {
    height: 200,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    marginTop: Spacing.three,
  },
  barWrap: { flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: '100%', borderRadius: 5, borderWidth: 2, minHeight: 6, marginBottom: 4 },
  causeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  causeSwatch: { width: 10, height: 10, borderRadius: 5 },
  causeName: { flexBasis: 150, flexShrink: 1, color: Brand.ink, fontSize: 13, fontWeight: '600' },
  causeTrack: { flex: 1, height: 8, borderRadius: 999, backgroundColor: Brand.page, overflow: 'hidden' },
  causeCount: { width: 20, textAlign: 'right', color: Brand.inkSoft, fontSize: 13, fontWeight: '700' },
  hourLabel: { height: 14, fontSize: 10, color: Brand.inkSoft },
  detail: {
    marginTop: Spacing.three,
    padding: Spacing.three,
    borderRadius: 16,
    borderLeftWidth: 6,
    backgroundColor: Brand.page,
    gap: 4,
  },
  detailTime: { color: Brand.inkSoft, fontSize: 13, fontWeight: '700' },
  detailCause: { color: Brand.ink, fontSize: 17, fontWeight: '700' },
  detailNote: { color: Brand.inkSoft, fontSize: 14, lineHeight: 21 },
});
