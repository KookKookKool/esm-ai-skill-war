import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Brand, LevelLabels } from '@/constants/brand';
import { Spacing } from '@/constants/theme';
import { Periods } from '@/data/traffic';
import { useClock } from '@/hooks/use-clock';
import type { LiveState } from '@/hooks/use-live-snapshot';
import { useViewportWidth } from '@/hooks/use-viewport-width';
import { ago, clockWithSeconds, thaiDate } from '@/live/format';
import { bangkokClock, bangkokHour } from '@/live/time';
import type { LiveSnapshot, SourceId } from '@/live/types';
import { AIR_LEVELS, EVENT_META, REPORT_META, SOURCE_META, STATE_META } from './meta';

const RUSH = new Set([7, 8, 9, 17, 18, 19]);
const SHORT: Record<SourceId, string> = { itic: 'iTIC', traffy: 'Traffy', air4thai: 'Air4Thai', openmeteo: 'Open-Meteo', tomtom: 'TomTom' };

export function LiveHeader({ live }: { live: LiveState }) {
  const now = useClock();
  const compact = useViewportWidth() < 640;
  const top = Platform.select({ web: compact ? 104 : 124, default: 24 });
  const d = live.data;

  return (
    <View style={[styles.wrap, { paddingTop: top }]}>
      <View style={styles.inner}>
        <View style={styles.pill}>
          <View style={[styles.liveDot, { backgroundColor: live.error ? Brand.pink : Brand.yellow }]} />
          <Text style={styles.pillText}>LIVE · ข้อมูลจริงจาก 5 บริการ อัปเดตอัตโนมัติ</Text>
        </View>

        <View style={styles.titleRow}>
          <View style={{ flexShrink: 1 }}>
            <Text style={[styles.h1, compact && styles.h1Compact]}>กรุงเทพฯ ตอนนี้</Text>
            <Text style={styles.date}>{now ? thaiDate(now) : ' '}</Text>
          </View>
          <View style={[styles.clockBox, compact && { alignItems: 'flex-start' }]}>
            <Text style={[styles.clock, compact && styles.clockCompact]}>{now ? clockWithSeconds(now) : '--:--:--'}</Text>
            <Text style={styles.clockUnit}>น. เวลาไทย</Text>
          </View>
        </View>

        <View style={styles.updateRow}>
          <Text style={styles.updateText}>
            {d && now
              ? `ข้อมูลรวมอัปเดต ${bangkokClock(d.generatedMs)} น. (${ago(d.generatedMs, now)})` +
                (live.nextMs ? ` · รอบถัดไปอีก ${Math.max(0, Math.round((live.nextMs - now) / 1000))} วินาที` : '')
              : live.error
                ? `เชื่อมต่อ /api/live ไม่ได้: ${live.error}`
                : 'กำลังดึงข้อมูลจากทุกบริการ…'}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={live.refresh}
            style={({ pressed }) => [styles.refresh, pressed && { opacity: 0.8 }]}>
            <Text style={styles.refreshText}>{live.refreshing ? 'กำลังดึง…' : '↻ ดึงข้อมูลใหม่'}</Text>
          </Pressable>
        </View>

        {d ? <Tiles d={d} /> : <View style={styles.skeleton} />}

        <View style={styles.services}>
          {(d?.sources ?? []).map((s) => (
            <View key={s.id} style={styles.service}>
              <View style={[styles.serviceDot, { backgroundColor: STATE_META[s.state].color }]} />
              <Text style={styles.serviceName}>{SHORT[s.id]}</Text>
              <Text style={styles.serviceMeta}>
                {s.state === 'disabled' ? 'ปิด' : s.state === 'loading' ? 'กำลังโหลด' : `${s.records} รายการ`}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function Tiles({ d }: { d: LiveSnapshot }) {
  const hour = bangkokHour(d.generatedMs);
  const period = Periods.find((p) => p.key === d.period);
  const rush = !d.weekend && RUSH.has(hour);
  const w = d.weather;
  const nextRain = w?.hours[1]?.rainProbability ?? w?.hours[0]?.rainProbability ?? 0;
  const pm = d.air.length ? d.air.reduce((s, a) => s + a.pm25, 0) / d.air.length : null;
  const pmLevel = pm === null ? null : AIR_LEVELS[pm <= 15 ? 0 : pm <= 25 ? 1 : pm <= 37.5 ? 2 : pm <= 75 ? 3 : 4];
  const airTime = d.air.length ? Math.max(...d.air.map((a) => a.measuredMs)) : null;
  const counts = (keys: string[]) => {
    const m = new Map<string, number>();
    keys.forEach((k) => m.set(k, (m.get(k) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const evCounts = counts(d.events.map((e) => e.kind));
  const repCounts = counts(d.reports.map((r) => r.category));

  return (
    <View style={styles.tiles}>
      <Tile
        label="ช่วงเวลา"
        value={`${period?.label ?? ''}${rush ? ' · เร่งด่วน' : ''}`}
        sub={`${d.weekend ? 'วันหยุด' : 'วันทำงาน'} · ${period?.time ?? ''}`}
        accent={rush ? Brand.pink : Brand.mint}
      />
      <Tile
        label="ขับรถ 10 กม. ตอนนี้"
        value={`≈${d.advice.tenKmMinutesNow} นาที`}
        sub={`ระดับ${LevelLabels[d.forecast[0].level]} · ประมาณการจากโมเดล`}
        accent={Brand.orange}
      />
      <Tile
        label="ฝนและอุณหภูมิ"
        value={w ? (w.rain === 'heavy' ? 'ฝนตกหนัก' : w.rain === 'light' ? 'ฝนตกเล็กน้อย' : 'ไม่มีฝน') : 'ไม่มีข้อมูล'}
        sub={w ? `${w.temperatureC.toFixed(1)}°C · ${w.precipitationMm} มม. · โอกาสฝนชั่วโมงหน้า ${nextRain}%` : 'Open-Meteo ยังไม่ตอบ'}
        accent={Brand.blue}
      />
      <Tile
        label="PM2.5 เฉลี่ยทั้งเมือง"
        value={pm === null ? 'ไม่มีข้อมูล' : `${pm.toFixed(1)} µg/m³`}
        sub={pmLevel && airTime ? `${pmLevel.label} · ${d.air.length} สถานี · ค่าเวลา ${bangkokClock(airTime)} น.` : 'Air4Thai ยังไม่ตอบ'}
        accent={pmLevel?.color ?? Brand.mint}
      />
      <Tile
        label="เหตุการณ์จราจรที่ยังอยู่"
        value={`${d.events.length} เหตุการณ์`}
        sub={evCounts.slice(0, 2).map(([k, n]) => `${EVENT_META[k as keyof typeof EVENT_META].label} ${n}`).join(' · ') || 'ไม่มีเหตุการณ์'}
        accent={Brand.pink}
      />
      <Tile
        label="แจ้งเหตุจากประชาชน 12 ชม."
        value={`${d.reports.length} เรื่อง`}
        sub={repCounts.slice(0, 2).map(([k, n]) => `${REPORT_META[k as keyof typeof REPORT_META].label} ${n}`).join(' · ') || SOURCE_META.traffy.provider}
        accent={Brand.purple}
      />
    </View>
  );
}

function Tile({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  return (
    <View style={styles.tile}>
      <View style={[styles.tileBar, { backgroundColor: accent }]} />
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.tileSub} numberOfLines={2}>
        {sub}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five },
  inner: { width: '100%', maxWidth: 1120, alignSelf: 'center', gap: Spacing.three },
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  pillText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  titleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: Spacing.three },
  h1: { color: '#FFFFFF', fontSize: 56, lineHeight: 76, fontWeight: '800' },
  h1Compact: { fontSize: 38, lineHeight: 54 },
  date: { color: 'rgba(255,255,255,0.85)', fontSize: 16, fontWeight: '600' },
  clockBox: { alignItems: 'flex-end' },
  clock: { color: Brand.yellow, fontSize: 52, lineHeight: 60, fontWeight: '800', fontVariant: ['tabular-nums'] },
  clockCompact: { fontSize: 36, lineHeight: 44 },
  clockUnit: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '700' },
  updateRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  updateText: { color: 'rgba(255,255,255,0.85)', fontSize: 13, flexShrink: 1 },
  refresh: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)' },
  refreshText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  skeleton: { height: 220, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.08)' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    flexGrow: 1,
    flexBasis: 300,
    flexShrink: 1,
    minWidth: 0,
    padding: 16,
    paddingLeft: 20,
    borderRadius: 18,
    backgroundColor: 'rgba(8, 35, 26, 0.42)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  tileBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
  tileLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700' },
  tileValue: { color: '#FFFFFF', fontSize: 24, lineHeight: 34, fontWeight: '800', marginTop: 2 },
  tileSub: { color: 'rgba(255,255,255,0.72)', fontSize: 12, lineHeight: 18 },
  services: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  service: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(8, 35, 26, 0.5)',
  },
  serviceDot: { width: 8, height: 8, borderRadius: 4 },
  serviceName: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  serviceMeta: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
});
