import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';
import { Brand, LevelColors, LevelLabels } from '@/constants/brand';
import { Spacing } from '@/constants/theme';
import { useClock } from '@/hooks/use-clock';
import type { RefreshEntry } from '@/hooks/use-live-snapshot';
import { ago } from '@/live/format';
import { bangkokClock } from '@/live/time';
import type { EventKind, LiveSnapshot, ReportCategory, TimelineItem } from '@/live/types';
import { Card } from '../traffic/section';
import { AIR_LEVELS, EVENT_META, REPORT_META } from './meta';
import { Icon, type IconName } from '@/components/icon';

const DAY_MS = 24 * 3600_000;
const LABEL_W = 92;
const MIN_HOUR_W = 38;
const MAX_LANES = 5;

type Props = { data: LiveSnapshot; fresh: ReadonlySet<string>; history: RefreshEntry[] };

export function Timeline({ data, fresh, history }: Props) {
  return (
    <View style={{ gap: Spacing.three }}>
      <DayStrip data={data} />
      <LiveFeed data={data} fresh={fresh} history={history} />
    </View>
  );
}

// ---- 24-hour strip ---------------------------------------------------------------------------

function metaOf(item: TimelineItem) {
  return item.source === 'itic' ? EVENT_META[item.kind as EventKind] : REPORT_META[item.kind as ReportCategory];
}

function DayStrip({ data }: { data: LiveSnapshot }) {
  const now = useClock() ?? data.generatedMs;
  const [viewW, setViewW] = useState(0);
  const scroller = useRef<ScrollViewInstance>(null);
  const centred = useRef(false);
  const { dayStartMs, hours, items } = data.timeline;

  const hourW = Math.max(MIN_HOUR_W, viewW / 24);
  const contentW = hourW * 24;
  const x = (ms: number) => ((ms - dayStartMs) / DAY_MS) * contentW;
  const nowX = Math.min(contentW, Math.max(0, x(now)));

  const { bars, hidden, laneCount, allDay, reports } = useMemo(() => {
    const events = items.filter((i) => i.source === 'itic');
    const allDay = events.filter((i) => i.fromEarlier && i.untilLater);
    const laneEnds: number[] = [];
    const placed: { item: TimelineItem; left: number; width: number; lane: number }[] = [];
    for (const item of events.filter((i) => !(i.fromEarlier && i.untilLater))) {
      const left = ((item.startMs - dayStartMs) / DAY_MS) * contentW;
      const width = Math.max(12, (((item.endMs ?? item.startMs) - item.startMs) / DAY_MS) * contentW);
      let lane = laneEnds.findIndex((end) => end <= left - 4);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(0);
      }
      laneEnds[lane] = left + width;
      placed.push({ item, left, width, lane });
    }
    return {
      bars: placed.filter((b) => b.lane < MAX_LANES),
      hidden: placed.filter((b) => b.lane >= MAX_LANES).length,
      laneCount: Math.max(1, Math.min(MAX_LANES, laneEnds.length)),
      allDay,
      reports: items.filter((i) => i.source === 'traffy'),
    };
  }, [items, dayStartMs, contentW]);

  const BAR_H = 120;
  const RAIN_H = 34;
  const LANE_H = 26;
  const REPORT_H = 28;
  const HOURS_H = 20;
  const lanesH = laneCount * LANE_H + 8;
  const totalH = 22 + BAR_H + RAIN_H + lanesH + REPORT_H + HOURS_H;

  return (
    <Card style={{ padding: 16 }}>
      <View style={styles.cardHead}>
        <View style={{ flexShrink: 1 }}>
          <Text style={styles.cardTitle}>24 ชั่วโมงของวันนี้</Text>
          <Text style={styles.cardHint}>
            เส้นสีชมพูคือเวลาตอนนี้ เลื่อนไปตามนาฬิกาจริง ด้านซ้ายคือช่วงที่ผ่านมาแล้ว ด้านขวาคือคาดการณ์จากโมเดลและพยากรณ์ฝน
          </Text>
        </View>
        <View style={styles.nowBadge}>
          <View style={styles.nowDot} />
          <Text style={styles.nowBadgeText}>ตอนนี้ {bangkokClock(now)} น.</Text>
        </View>
      </View>

      <View style={styles.stripRow}>
        <View style={[styles.labels, { height: totalH }]}>
          <View style={{ height: 22 }} />
          <Text style={[styles.rowLabel, { height: BAR_H, paddingTop: BAR_H / 2 - 16 }]}>ความหนาแน่น{'\n'}(โมเดล)</Text>
          <Text style={[styles.rowLabel, { height: RAIN_H, paddingTop: 8 }]}>โอกาสฝน</Text>
          <Text style={[styles.rowLabel, { height: lanesH, paddingTop: 6 }]}>เหตุการณ์{'\n'}จราจร</Text>
          <Text style={[styles.rowLabel, { height: REPORT_H, paddingTop: 6 }]}>ประชาชนแจ้ง</Text>
        </View>

        <ScrollView
          ref={scroller}
          horizontal
          style={{ flex: 1 }}
          showsHorizontalScrollIndicator
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width;
            setViewW(w);
            if (!centred.current && w > 0 && w < MIN_HOUR_W * 24) {
              centred.current = true;
              const target = ((now - dayStartMs) / DAY_MS) * MIN_HOUR_W * 24 - w / 2;
              requestAnimationFrame(() => scroller.current?.scrollTo({ x: Math.max(0, target), animated: false }));
            }
          }}>
          <View style={{ width: contentW, height: totalH }}>
            {/* Past / forecast captions */}
            <View style={{ height: 22, flexDirection: 'row' }}>
              <Text style={[styles.caption, { width: nowX, textAlign: 'right', paddingRight: 8 }]} numberOfLines={1}>
                {nowX > 90 ? '← ผ่านมาแล้ว' : ''}
              </Text>
              <Text style={[styles.caption, { paddingLeft: 8 }]} numberOfLines={1}>
                {contentW - nowX > 90 ? 'คาดการณ์ →' : ''}
              </Text>
            </View>

            {/* Congestion bars */}
            <View style={{ height: BAR_H, flexDirection: 'row', alignItems: 'flex-end' }}>
              {hours.map((h) => (
                <View key={h.startMs} style={{ width: hourW, height: '100%', justifyContent: 'flex-end', paddingHorizontal: 2 }}>
                  <View
                    style={{
                      height: `${Math.max(4, h.index)}%`,
                      borderRadius: 6,
                      backgroundColor: LevelColors[h.level],
                      opacity: h.now ? 1 : h.past ? 0.42 : 0.78,
                      borderWidth: h.now ? 2 : 0,
                      borderColor: Brand.ink,
                    }}
                  />
                </View>
              ))}
            </View>

            {/* Rain probability */}
            <View style={{ height: RAIN_H, flexDirection: 'row', alignItems: 'flex-end', paddingTop: 6 }}>
              {hours.map((h) => (
                <View key={h.startMs} style={{ width: hourW, height: '100%', justifyContent: 'flex-end', paddingHorizontal: 3 }}>
                  <View
                    style={{
                      height: `${Math.max(6, h.rainProbability)}%`,
                      borderRadius: 3,
                      backgroundColor: h.rainProbability > 0 ? Brand.blue : Brand.line,
                      opacity: h.past ? 0.4 : 0.85,
                    }}
                  />
                </View>
              ))}
            </View>

            {/* Event lanes */}
            <View style={{ height: lanesH, marginTop: 4 }}>
              {bars.map(({ item, left, width, lane }) => {
                const m = metaOf(item);
                return (
                  <View
                    key={item.id}
                    style={[styles.eventBar, { left, width, top: lane * LANE_H + 4, backgroundColor: m.color }]}>
                    <Text style={styles.eventBarText} numberOfLines={1}>
                      <Icon name={m.icon} size={12} color={Brand.ink} /> {width > 70 ? item.title : ''}
                    </Text>
                  </View>
                );
              })}
              {bars.length === 0 ? <Text style={[styles.caption, { paddingTop: 6 }]}>วันนี้ยังไม่มีเหตุการณ์ใหม่</Text> : null}
            </View>

            {/* Citizen reports */}
            <View style={{ height: REPORT_H }}>
              {reports.map((r) => (
                <View key={r.id} style={[styles.reportDot, { left: x(r.startMs) - 5, backgroundColor: metaOf(r).color }]} />
              ))}
            </View>

            {/* Hour labels */}
            <View style={{ height: HOURS_H, flexDirection: 'row' }}>
              {hours.map((h, i) => (
                <Text key={h.startMs} style={[styles.hourLabel, { width: hourW }, h.now && styles.hourLabelNow]}>
                  {i % 3 === 0 || h.now ? bangkokClock(h.startMs).slice(0, 2) : ''}
                </Text>
              ))}
            </View>

            {/* Now line */}
            <View style={[styles.nowLine, { left: nowX - 1, height: totalH - HOURS_H }]} />
          </View>
        </ScrollView>
      </View>

      <View style={styles.legendRow}>
        {LevelColors.map((c, i) => (
          <View key={c} style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: c }]} />
            <Text style={styles.legendText}>{LevelLabels[i]}</Text>
          </View>
        ))}
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: Brand.blue }]} />
          <Text style={styles.legendText}>โอกาสฝน (Open-Meteo)</Text>
        </View>
        {hidden > 0 ? <Text style={styles.legendText}>+{hidden} เหตุการณ์ที่ไม่ได้แสดงในแถบ</Text> : null}
      </View>

      {allDay.length > 0 ? (
        <View style={styles.allDay}>
          <Text style={styles.allDayTitle}>ต่อเนื่องทั้งวัน ({allDay.length})</Text>
          <View style={styles.allDayChips}>
            {allDay.map((i) => (
              <View key={i.id} style={[styles.allDayChip, { borderColor: metaOf(i).color }]}>
                <Text style={styles.allDayText} numberOfLines={1}>
                  <Icon name={metaOf(i).icon} size={13} color={Brand.ink} /> {i.title}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </Card>
  );
}

// ---- Live feed -------------------------------------------------------------------------------

type FeedItem = { id: string; ms: number; icon: IconName; color: string; tag: string; title: string; sub: string; source: string; fresh: boolean };

function buildFeed(d: LiveSnapshot, fresh: ReadonlySet<string>, history: RefreshEntry[]): FeedItem[] {
  const feed: FeedItem[] = [];
  for (const e of d.events) {
    const m = EVENT_META[e.kind];
    feed.push({ id: e.id, ms: e.startMs, icon: m.icon, color: m.color, tag: m.label, title: e.title, sub: e.detail, source: 'iTIC', fresh: fresh.has(e.id) });
  }
  for (const r of d.reports) {
    const m = REPORT_META[r.category];
    feed.push({
      id: r.id,
      ms: r.reportedMs,
      icon: m.icon,
      color: m.color,
      tag: m.label,
      title: r.text,
      sub: `${r.district ? `เขต${r.district} · ` : ''}${r.state}`,
      source: 'Traffy Fondue',
      fresh: fresh.has(r.id),
    });
  }
  if (d.weather) {
    const w = d.weather;
    feed.push({
      id: `weather-${w.observedMs}`,
      ms: w.observedMs,
      icon: w.rain === 'none' ? 'weather-partly-cloudy' : 'weather-pouring',
      color: Brand.blue,
      tag: 'สภาพอากาศ',
      title: `${w.rain === 'heavy' ? 'ฝนตกหนัก' : w.rain === 'light' ? 'ฝนตกเล็กน้อย' : 'ไม่มีฝน'} · ${w.temperatureC.toFixed(1)}°C`,
      sub: `ปริมาณฝน ${w.precipitationMm} มม. ใน 15 นาที · ${w.hours.map((h) => `${bangkokClock(h.startMs)} ${h.rainProbability}%`).join(' · ')}`,
      source: 'Open-Meteo',
      fresh: false,
    });
  }
  if (d.air.length) {
    const latest = Math.max(...d.air.map((a) => a.measuredMs));
    const worst = [...d.air].sort((a, b) => b.pm25 - a.pm25)[0];
    const avg = d.air.reduce((s, a) => s + a.pm25, 0) / d.air.length;
    feed.push({
      id: `air-${latest}`,
      ms: latest,
      icon: 'weather-hazy',
      color: AIR_LEVELS[worst.level].color,
      tag: 'คุณภาพอากาศ',
      title: `PM2.5 เฉลี่ย ${avg.toFixed(1)} µg/m³ จาก ${d.air.length} สถานี`,
      sub: `สูงสุด ${worst.pm25} ที่${worst.name}`,
      source: 'Air4Thai',
      fresh: false,
    });
  }
  for (const h of history) {
    feed.push({
      id: `refresh-${h.ms}`,
      ms: h.ms,
      icon: 'sync',
      color: Brand.mint,
      tag: 'ระบบ',
      title: `ดึงข้อมูลรอบใหม่ · บริการพร้อม ${h.ready}/5`,
      sub: `เหตุการณ์ ${h.events} · ประชาชนแจ้ง ${h.reports} · โมเดลคำนวณจุดติดใหม่ ${h.hotspots} จุด`,
      source: '/api/live',
      fresh: false,
    });
  }
  return feed.sort((a, b) => b.ms - a.ms);
}

function LiveFeed({ data, fresh, history }: Props) {
  const now = useClock() ?? data.generatedMs;
  const [showAll, setShowAll] = useState(false);
  const feed = useMemo(() => buildFeed(data, fresh, history), [data, fresh, history]);
  const shown = showAll ? feed.slice(0, 60) : feed.slice(0, 14);

  return (
    <Card style={{ padding: 16 }}>
      <View style={styles.cardHead}>
        <View style={{ flexShrink: 1 }}>
          <Text style={styles.cardTitle}>ไทม์ไลน์สด</Text>
          <Text style={styles.cardHint}>ทุกอย่างที่เข้ามาจากทุกบริการ เรียงจากล่าสุด เวลาที่ผ่านไปนับใหม่ทุกวินาที</Text>
        </View>
        <Text style={styles.feedCount}>{feed.length} รายการ</Text>
      </View>
      <View style={{ marginTop: 12 }}>
        {shown.map((f, i) => (
          <View key={f.id} style={styles.feedRow}>
            <View style={styles.feedTime}>
              <Text style={styles.feedClock}>{bangkokClock(f.ms)}</Text>
              <Text style={styles.feedAgo}>{ago(f.ms, now)}</Text>
            </View>
            <View style={styles.feedRail}>
              <View style={[styles.feedDot, { backgroundColor: f.color }]} />
              {i < shown.length - 1 ? <View style={styles.feedLine} /> : null}
            </View>
            <View style={styles.feedBody}>
              <View style={styles.feedHead}>
                <Text style={styles.feedTag}>
                  <Icon name={f.icon} size={13} color={f.color} /> {f.tag}
                </Text>
                <Text style={styles.feedSource}>{f.source}</Text>
                {f.fresh ? (
                  <View style={styles.freshBadge}>
                    <Text style={styles.freshText}>ใหม่</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.feedTitle} numberOfLines={2}>
                {f.title}
              </Text>
              {f.sub ? (
                <Text style={styles.feedSub} numberOfLines={2}>
                  {f.sub}
                </Text>
              ) : null}
            </View>
          </View>
        ))}
      </View>
      {feed.length > 14 ? (
        <Pressable accessibilityRole="button" onPress={() => setShowAll(!showAll)} style={({ pressed }) => [styles.more, pressed && { opacity: 0.8 }]}>
          <Text style={styles.moreText}>{showAll ? 'แสดงน้อยลง' : `ดูทั้งหมด (${Math.min(60, feed.length)})`}</Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  cardHead: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  cardTitle: { color: Brand.ink, fontSize: 18, fontWeight: '800' },
  cardHint: { color: Brand.inkSoft, fontSize: 13, lineHeight: 20, marginTop: 2, maxWidth: 680 },
  nowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(232, 61, 168, 0.12)',
  },
  nowDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Brand.pink },
  nowBadgeText: { color: '#B0237F', fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] },
  stripRow: { flexDirection: 'row', marginTop: 14 },
  labels: { width: LABEL_W },
  rowLabel: { color: Brand.inkSoft, fontSize: 11, fontWeight: '700', lineHeight: 15 },
  caption: { color: Brand.inkSoft, fontSize: 11, fontWeight: '700' },
  eventBar: { position: 'absolute', height: 20, borderRadius: 6, paddingHorizontal: 6, justifyContent: 'center', overflow: 'hidden' },
  eventBarText: { color: Brand.ink, fontSize: 11, fontWeight: '700' },
  reportDot: { position: 'absolute', top: 9, width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: '#FFFFFF' },
  hourLabel: { color: Brand.inkSoft, fontSize: 10, textAlign: 'center' },
  hourLabelNow: { color: '#B0237F', fontWeight: '800' },
  nowLine: { position: 'absolute', top: 18, width: 2, backgroundColor: Brand.pink, borderRadius: 1 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendSwatch: { width: 10, height: 10, borderRadius: 3 },
  legendText: { color: Brand.inkSoft, fontSize: 11 },
  allDay: { marginTop: 12, padding: 12, borderRadius: 14, backgroundColor: Brand.page, gap: 8 },
  allDayTitle: { color: Brand.ink, fontSize: 13, fontWeight: '800' },
  allDayChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  allDayChip: { maxWidth: 320, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1.5, backgroundColor: Brand.surface },
  allDayText: { color: Brand.ink, fontSize: 12, fontWeight: '600' },
  feedCount: { color: Brand.inkSoft, fontSize: 13, fontWeight: '700' },
  feedRow: { flexDirection: 'row', gap: 10 },
  feedTime: { width: 86, alignItems: 'flex-end', paddingTop: 2 },
  feedClock: { color: Brand.ink, fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
  feedAgo: { color: Brand.inkSoft, fontSize: 10, textAlign: 'right' },
  feedRail: { width: 14, alignItems: 'center' },
  feedDot: { width: 12, height: 12, borderRadius: 6, marginTop: 5, borderWidth: 2, borderColor: '#FFFFFF', boxShadow: '0 0 0 1px rgba(16,35,27,0.15)' },
  feedLine: { flex: 1, width: 2, backgroundColor: Brand.line, marginVertical: 2 },
  feedBody: { flex: 1, minWidth: 0, paddingBottom: 14 },
  feedHead: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  feedTag: { color: Brand.ink, fontSize: 12, fontWeight: '800' },
  feedSource: { color: Brand.inkSoft, fontSize: 11, paddingHorizontal: 7, paddingVertical: 1, borderRadius: 999, backgroundColor: Brand.page, overflow: 'hidden' },
  freshBadge: { paddingHorizontal: 7, paddingVertical: 1, borderRadius: 999, backgroundColor: Brand.yellow },
  freshText: { color: Brand.ink, fontSize: 10, fontWeight: '800' },
  feedTitle: { color: Brand.ink, fontSize: 14, lineHeight: 21, fontWeight: '600', marginTop: 2 },
  feedSub: { color: Brand.inkSoft, fontSize: 12, lineHeight: 18 },
  more: { alignSelf: 'center', marginTop: 4, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, backgroundColor: Brand.page },
  moreText: { color: Brand.primary, fontSize: 13, fontWeight: '800' },
});
