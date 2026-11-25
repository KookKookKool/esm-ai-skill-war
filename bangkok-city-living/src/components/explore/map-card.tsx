import { Icon } from '@/components/icon';
import { Brand, LevelColors, LevelLabels, MapColors } from '@/constants/brand';
import { Spacing } from '@/constants/theme';
import { Causes } from '@/data/traffic';
import { useViewportWidth } from '@/hooks/use-viewport-width';
import { CORRIDORS } from '@/live/corridors';
import { ago } from '@/live/format';
import { bangkokClock } from '@/live/time';
import type { HotspotStatus, JamSegment, Line, LiveSnapshot } from '@/live/types';
import { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import CityMap, { type CityMapData, type CityMapFocus, type CityMapLayers } from './city-map';
import { AIR_LEVELS, EVENT_META, REPORT_META } from './meta';

type Props = {
  data: LiveSnapshot | null;
  fresh: ReadonlySet<string>;
  layers: CityMapLayers;
  onLayers: (l: CityMapLayers) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  focus: CityMapFocus;
  /** Zoom the map to these lines. */
  onFocus: (lines: Line[]) => void;
};

const km = (n: number) => `${n.toFixed(1)} กม.`;

export function jamSummary(j: JamSegment) {
  return `ติดตั้งแต่ ${j.fromName} ถึง ${j.toName}`;
}

export function boundsOf(lines: Line[]): [[number, number], [number, number]] {
  const pts = lines.flat();
  const lons = pts.map((p) => p[0]);
  const lats = pts.map((p) => p[1]);
  return [
    [Math.min(...lons), Math.min(...lats)],
    [Math.max(...lons), Math.max(...lats)],
  ];
}

export function toMapData(d: LiveSnapshot, fresh: ReadonlySet<string>): CityMapData {
  const now = d.generatedMs;
  return {
    corridors: CORRIDORS.map((c) => ({ id: c.id, hotspotId: c.hotspotId, line: c.line })),
    jams: d.jams.map((j) => ({
      id: j.id,
      hotspotId: j.hotspotId,
      level: j.level,
      line: j.line,
      clearLine: j.clearLine,
      color: LevelColors[j.level],
      tag: `${LevelLabels[j.level]} · ${km(j.toKm - j.fromKm)}`,
      title: `${j.road} ${j.direction}`,
      lines: [
        jamSummary(j),
        `ราว ${j.speedKmh} กม./ชม. · ช้ากว่าปกติราว ${j.delayMin} นาที`,
        `พ้นรถติดเมื่อผ่าน ${j.toName.replace('จุดเกิดเหตุ: ', '')} มุ่งหน้า ${j.clearName}`,
        `สาเหตุ: ${Causes[j.cause].label}${j.basis === 'estimated' ? ' (ประมาณการ)' : j.basis === 'measured' ? ' (วัดจริง)' : ' (จากเหตุการณ์จริง)'}`,
      ],
    })),
    flags: d.jams.flatMap((j) => {
      const start = j.line[0];
      const clear = j.clearLine[j.clearLine.length - 1];
      return [
        { id: `${j.id}:s`, hotspotId: j.hotspotId, kind: 'start' as const, level: j.level, label: `เริ่มติด ${km(j.toKm - j.fromKm)}`, lon: start[0], lat: start[1] },
        { id: `${j.id}:c`, hotspotId: j.hotspotId, kind: 'clear' as const, level: j.level, label: 'พ้นรถติด', lon: clear[0], lat: clear[1] },
      ];
    }),
    junctions: d.hotspots.map((h) => ({
      id: h.id,
      name: h.name,
      index: h.congestion.index,
      lat: h.at.lat,
      lon: h.at.lon,
      color: LevelColors[h.congestion.level],
      tag: `ดัชนี ${h.congestion.index} · ${LevelLabels[h.congestion.level]}`,
      title: h.name,
      lines: [
        `ราว ${h.congestion.speedKmh} กม./ชม. (${h.congestion.basis === 'measured' ? 'วัดจริง' : 'ประมาณการ'})`,
        `สาเหตุหลัก: ${Causes[h.causes.top].label}`,
        ...h.causes.ranked[0].reasons.slice(0, 2),
      ],
    })),
    events: d.events.map((e) => ({
      id: e.id,
      icon: EVENT_META[e.kind].icon,
      color: EVENT_META[e.kind].color,
      tag: EVENT_META[e.kind].label,
      title: e.title,
      lines: [
        e.detail,
        `เริ่ม ${bangkokClock(e.startMs)} น. (${ago(e.startMs, now)})${e.endMs ? ` · ถึง ${bangkokClock(e.endMs)} น.` : ''}`,
        'ที่มา: iTIC ผ่าน Longdo Event',
      ].filter(Boolean),
      lat: e.at.lat,
      lon: e.at.lon,
      fresh: fresh.has(e.id),
    })),
    reports: d.reports.map((r) => ({
      id: r.id,
      color: REPORT_META[r.category].color,
      tag: REPORT_META[r.category].label,
      title: r.text,
      lines: [`${r.district ? `เขต${r.district} · ` : ''}${ago(r.reportedMs, now)} · ${r.state}`, 'ที่มา: Traffy Fondue'],
      lat: r.at.lat,
      lon: r.at.lon,
    })),
    air: d.air.map((a) => ({
      id: a.id,
      color: AIR_LEVELS[a.level].color,
      pm25: a.pm25,
      tag: `PM2.5 ${a.pm25}`,
      title: a.name,
      lines: [`${a.pm25} µg/m³ · ${AIR_LEVELS[a.level].label}`, `ค่าเวลา ${bangkokClock(a.measuredMs)} น. · กรมควบคุมมลพิษ`],
      lat: a.at.lat,
      lon: a.at.lon,
    })),
  };
}

const EMPTY: CityMapData = { corridors: [], jams: [], flags: [], junctions: [], events: [], reports: [], air: [] };

export function MapCard({ data, fresh, layers, onLayers, selectedId, onSelect, focus, onFocus }: Props) {
  const width = useViewportWidth();
  const narrow = width < 700;
  const height = narrow ? 460 : 620;
  const mapData = useMemo(() => (data ? toMapData(data, fresh) : EMPTY), [data, fresh]);
  const selected = data?.hotspots.find((h) => h.id === selectedId) ?? null;

  const chips: { key: keyof CityMapLayers; label: string; count: number | null; color: string; disabled?: boolean }[] = [
    { key: 'routes', label: 'เส้นทางและช่วงที่ติด', count: data?.jams.length ?? null, color: Brand.pink },
    { key: 'junctions', label: 'จุดติด', count: data?.hotspots.length ?? null, color: Brand.yellow },
    { key: 'events', label: 'เหตุการณ์จราจร', count: data?.events.length ?? null, color: Brand.orange },
    { key: 'reports', label: 'ประชาชนแจ้ง', count: data?.reports.length ?? null, color: Brand.purple },
    { key: 'air', label: 'PM2.5', count: data?.air.length ?? null, color: Brand.blue },
    { key: 'traffic', label: 'การจราจรสด TomTom', count: null, color: Brand.mint, disabled: !data?.trafficTiles },
  ];

  return (
    <View style={styles.outer}>
      <View style={styles.inner}>
        <Text style={styles.eyebrow}>แผนที่สด</Text>
        <Text style={[styles.title, narrow && styles.titleNarrow]}>ทุกบริการบนแผนที่เดียว</Text>
        <Text style={styles.sub}>
          เส้นบนถนนจริงคือเส้นทางผ่านจุดติด 9 แห่ง ช่วงที่มีสีคือช่วงที่รถติด เริ่มจากธงสีชมพู และพ้นรถติดที่ธงสีเขียว ลูกศรบอกทิศทางการเดินทาง
          หมุดคือเหตุการณ์จาก iTIC ปลายหมุดคือตำแหน่งที่แจ้งจริง
        </Text>

        <View style={styles.card}>
          <View style={styles.chips}>
            {chips.map((c) => {
              const on = layers[c.key] && !c.disabled;
              return (
                <Pressable
                  key={c.key}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: on, disabled: c.disabled }}
                  disabled={c.disabled}
                  onPress={() => onLayers({ ...layers, [c.key]: !layers[c.key] })}
                  style={({ pressed }) => [styles.chip, on && styles.chipOn, c.disabled && styles.chipOff, pressed && { opacity: 0.8 }]}>
                  <View style={[styles.chipDot, { backgroundColor: on ? c.color : 'transparent', borderColor: c.color }]} />
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>
                    {c.label}
                    {c.count !== null ? ` ${c.count}` : ''}
                    {c.disabled ? ' · ยังไม่เปิด' : ''}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={[styles.row, narrow && styles.rowNarrow]}>
            <View style={[styles.mapBox, narrow && styles.stacked, { height }]}>
              <CityMap
                data={mapData}
                layers={layers}
                trafficTiles={!!data?.trafficTiles}
                selectedId={selectedId}
                focus={focus}
                onSelect={onSelect}
                dom={{ style: { width: '100%', height }, scrollEnabled: false }}
              />
              {!data ? (
                <View style={styles.mapLoading}>
                  <Text style={styles.mapLoadingText}>กำลังดึงข้อมูลจากทุกบริการ…</Text>
                </View>
              ) : null}
            </View>
            <Selected hotspot={selected} jams={data?.jams ?? []} stacked={narrow} onFocus={onFocus} />
          </View>
          <Legend />
        </View>
      </View>
    </View>
  );
}

function Selected({ hotspot, jams, stacked, onFocus }: { hotspot: HotspotStatus | null; jams: JamSegment[]; stacked: boolean; onFocus: (lines: Line[]) => void }) {
  const panelStyle = [styles.panel, stacked && styles.stacked];
  if (!hotspot) {
    return (
      <View style={panelStyle}>
        <Text style={styles.panelHint}>แตะจุดติดหรือเส้นทางบนแผนที่ เพื่อดูว่าติดจากตรงไหนถึงตรงไหน และติดเพราะอะไร</Text>
      </View>
    );
  }
  const c = hotspot.congestion;
  const routes = CORRIDORS.filter((x) => x.hotspotId === hotspot.id).map((corridor) => ({
    corridor,
    jam: jams.find((j) => j.corridorId === corridor.id),
  }));
  return (
    <View style={panelStyle}>
      <Text style={styles.panelLabel}>จุดที่เลือก</Text>
      <Text style={styles.panelName}>{hotspot.name}</Text>
      <View style={styles.indexRow}>
        <Text style={[styles.indexValue, { color: LevelColors[c.level] }]}>{c.index}</Text>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.indexLabel}>
            {LevelLabels[c.level]} · ราว {c.speedKmh} กม./ชม.
          </Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${c.index}%`, backgroundColor: LevelColors[c.level] }]} />
          </View>
          <Text style={styles.basis}>
            {c.basis === 'measured' ? `วัดจริงจาก TomTom (ความเชื่อมั่น ${Math.round((c.confidence ?? 0) * 100)}%)` : 'ประมาณการจากโมเดล ยังไม่มีข้อมูลความเร็วจริง'}
          </Text>
        </View>
      </View>

      <Text style={styles.panelLabel}>เส้นทางผ่านจุดนี้ · แตะเพื่อดูบนแผนที่</Text>
      <View style={{ gap: 8 }}>
        {routes.map(({ corridor, jam }) => (
          <Pressable
            key={corridor.id}
            accessibilityRole="button"
            onPress={() => onFocus(jam ? [jam.line, jam.clearLine] : [corridor.line])}
            style={({ pressed }) => [styles.route, pressed && { opacity: 0.8 }]}>
            <View style={[styles.routeBar, { backgroundColor: jam ? LevelColors[jam.level] : Brand.mint }]} />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text style={styles.routeName} numberOfLines={1}>
                {corridor.road} {corridor.direction}
              </Text>
              {jam ? (
                <>
                  <Text style={styles.routeText}>
                    <Icon name="alert" size={12} color={Brand.pink} /> {jamSummary(jam)} · {km(jam.toKm - jam.fromKm)}
                  </Text>
                  <Text style={styles.routeText}>
                    <Icon name="check-circle" size={12} color={Brand.mint} /> พ้นรถติดมุ่งหน้า {jam.clearName} · ช้ากว่าปกติราว {jam.delayMin} นาที
                  </Text>
                </>
              ) : (
                <Text style={styles.routeText}>
                  <Icon name="check-circle" size={12} color={Brand.mint} /> ไหลดี ไม่มีช่วงที่ติดตอนนี้
                </Text>
              )}
            </View>
          </Pressable>
        ))}
        {routes.length === 0 ? <Text style={styles.routeText}>ยังไม่มีข้อมูลเส้นทางของจุดนี้</Text> : null}
      </View>

      <Text style={styles.panelLabel}>ติดเพราะอะไร</Text>
      <View style={{ gap: 10 }}>
        {hotspot.causes.ranked.slice(0, 3).map((r) => (
          <View key={r.cause} style={{ gap: 3 }}>
            <View style={styles.causeHead}>
              <Text style={styles.causeName}>
                <Icon name={Causes[r.cause].icon} size={15} color="#FFFFFF" /> {Causes[r.cause].label}
              </Text>
              <Text style={styles.causeScore}>{Math.round(r.score * 100)}</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.round(r.score * 100)}%`, backgroundColor: Brand.yellow }]} />
            </View>
            <Text style={styles.causeReason} numberOfLines={2}>
              {r.reasons[0]}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Legend() {
  return (
    <View style={styles.legend}>
      <View style={styles.legendGroup}>
        <Text style={styles.legendTitle}>เส้นทาง</Text>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: Brand.mint }]} />
          <Text style={styles.legendText}>ไหลดี / พ้นรถติด</Text>
        </View>
        {LevelColors.slice(2).map((c, i) => (
          <View key={c} style={styles.legendItem}>
            <View style={[styles.legendLine, { backgroundColor: c }]} />
            <Text style={styles.legendText}>{LevelLabels[i + 2]}</Text>
          </View>
        ))}
        <View style={styles.legendItem}>
          <Icon name="alert" size={12} color={Brand.pink} />
          <Text style={styles.legendText}>เริ่มติด</Text>
        </View>
        <View style={styles.legendItem}>
          <Icon name="check-circle" size={12} color={Brand.mint} />
          <Text style={styles.legendText}>พ้นรถติด</Text>
        </View>
      </View>
      <View style={styles.legendGroup}>
        <Text style={styles.legendTitle}>PM2.5</Text>
        {AIR_LEVELS.map((a) => (
          <View key={a.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: a.color }]} />
            <Text style={styles.legendText}>{a.range}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.legendNote}>แผนที่และเส้นทาง © OpenStreetMap contributors · OpenFreeMap · OSRM</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.six },
  inner: { width: '100%', maxWidth: 1120, alignSelf: 'center' },
  eyebrow: { color: Brand.yellow, fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  title: { color: '#FFFFFF', fontSize: 30, lineHeight: 42, fontWeight: '800', marginTop: 4 },
  titleNarrow: { fontSize: 26, lineHeight: 38 },
  sub: { color: 'rgba(255,255,255,0.82)', fontSize: 15, lineHeight: 25, marginTop: 6, maxWidth: 800 },
  card: {
    marginTop: Spacing.four,
    gap: 12,
    padding: 12,
    borderRadius: 30,
    backgroundColor: MapColors.frame,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    boxShadow: '0 24px 60px rgba(6, 30, 21, 0.45)',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  chipOn: { backgroundColor: 'rgba(255,255,255,0.14)', borderColor: 'rgba(255,255,255,0.3)' },
  chipOff: { opacity: 0.55 },
  chipDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  chipText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '700' },
  chipTextOn: { color: '#FFFFFF' },
  row: { flexDirection: 'row', gap: 12 },
  rowNarrow: { flexDirection: 'column' },
  /** In a column, a zero flex-basis would override the fixed height. */
  stacked: { flexGrow: 0, flexBasis: 'auto', minWidth: 0 },
  mapBox: { flexGrow: 3, flexBasis: 0, minWidth: 0, borderRadius: 22, overflow: 'hidden', backgroundColor: MapColors.bg },
  mapLoading: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(8,35,26,0.6)' },
  mapLoadingText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  panel: { flexGrow: 2, flexBasis: 0, minWidth: 280, padding: 10, gap: 8 },
  panelHint: { color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 22 },
  panelLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '700', letterSpacing: 0.4, marginTop: 6 },
  panelName: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  indexRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  indexValue: { fontSize: 48, lineHeight: 56, fontWeight: '800', fontVariant: ['tabular-nums'] },
  indexLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  track: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  basis: { color: 'rgba(255,255,255,0.55)', fontSize: 11 },
  route: { flexDirection: 'row', gap: 10, padding: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)' },
  routeBar: { width: 5, borderRadius: 3 },
  routeName: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  routeText: { color: 'rgba(255,255,255,0.75)', fontSize: 12, lineHeight: 18 },
  causeHead: { flexDirection: 'row', justifyContent: 'space-between' },
  causeName: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  causeScore: { color: Brand.yellow, fontSize: 14, fontWeight: '800' },
  causeReason: { color: 'rgba(255,255,255,0.6)', fontSize: 12, lineHeight: 17 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 20, rowGap: 8, paddingHorizontal: 6, paddingBottom: 2 },
  legendGroup: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  legendTitle: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '800' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendLine: { width: 18, height: 4, borderRadius: 2 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendText: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  legendNote: { color: 'rgba(255,255,255,0.4)', fontSize: 10, marginLeft: Platform.OS === 'web' ? 'auto' : 0 },
});
