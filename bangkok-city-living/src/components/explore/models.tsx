import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Brand, LevelColors, LevelLabels } from '@/constants/brand';
import { Spacing } from '@/constants/theme';
import { Causes } from '@/data/traffic';
import { clockWithSeconds } from '@/live/format';
import { bangkokClock } from '@/live/time';
import type { Line, LiveSnapshot } from '@/live/types';
import { Card } from '../traffic/section';
import { Icon } from '@/components/icon';

type Props = { data: LiveSnapshot; selectedId: string | null; onSelect: (id: string) => void; onFocus: (lines: Line[]) => void };

export function Models({ data, selectedId, onSelect, onFocus }: Props) {
  const sorted = [...data.hotspots].sort((a, b) => b.congestion.index - a.congestion.index);
  const selected = data.hotspots.find((h) => h.id === selectedId) ?? sorted[0];
  const measured = data.hotspots.filter((h) => h.congestion.basis === 'measured').length;
  const ran = clockWithSeconds(data.generatedMs);
  const a = data.advice;
  const bestIsNow = a.best.startMs === data.forecast[0].startMs;

  return (
    <View style={styles.grid}>
      <ModelCard
        name="Congestion Engine"
        ran={ran}
        title="ความหนาแน่นที่จุดติด 9 แห่ง"
        inputs={measured ? `TomTom (${measured} จุด), iTIC, Traffy, Open-Meteo` : 'เวลา, iTIC, Traffy, Open-Meteo'}
        method={
          measured
            ? 'จุดที่มีข้อมูล TomTom ใช้ความเร็วจริงเทียบกับรถโล่ง จุดที่เหลือใช้ค่าประมาณ'
            : 'ยังไม่มี TomTom key จึงประมาณจากรูปแบบรายชั่วโมงที่ปรับให้ตรงกับค่าเฉลี่ยช่วงเร่งด่วนของ TomTom ปี 2025 แล้วบวกผลจากฝน อุบัติเหตุ งานปิดถนน และเรื่องแจ้งในรัศมี 1-2 กม.'
        }>
        <View style={{ gap: 8 }}>
          {sorted.map((h) => {
            const c = h.congestion;
            const active = h.id === selected?.id;
            return (
              <Pressable
                key={h.id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => onSelect(h.id)}
                style={({ pressed }) => [styles.hotRow, active && styles.hotRowActive, pressed && { opacity: 0.85 }]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={styles.hotHead}>
                    <Text style={styles.hotName} numberOfLines={1}>
                      {h.name}
                    </Text>
                    <Text style={[styles.hotIndex, { color: c.level >= 3 ? '#B0237F' : Brand.forest }]}>{c.index}</Text>
                  </View>
                  <View style={styles.track}>
                    <View style={[styles.fill, { width: `${c.index}%`, backgroundColor: LevelColors[c.level] }]} />
                  </View>
                  <Text style={styles.hotMeta}>
                    {LevelLabels[c.level]} · ราว {c.speedKmh} กม./ชม. · <Icon name={Causes[h.causes.top].icon} size={12} color={Brand.inkSoft} /> {Causes[h.causes.top].label}
                  </Text>
                </View>
                <View style={[styles.basis, c.basis === 'measured' && styles.basisMeasured]}>
                  <Text style={[styles.basisText, c.basis === 'measured' && styles.basisTextMeasured]}>
                    {c.basis === 'measured' ? 'วัดจริง' : 'ประมาณ'}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ModelCard>

      <ModelCard
        name="Cause Classifier"
        ran={ran}
        title={`ติดเพราะอะไร: ${selected?.name ?? ''}`}
        inputs="iTIC (รัศมี 2 กม.), Traffy (3-6 ชม.ล่าสุด), Open-Meteo, เวลา"
        method="ให้คะแนน 0-100 กับแต่ละสาเหตุจากหลักฐานที่อยู่ใกล้จุดนั้น ยิ่งใกล้และยังเกิดอยู่ คะแนนยิ่งสูง แตะชื่อจุดในการ์ดด้านซ้ายเพื่อเปลี่ยนจุด">
        <View style={{ gap: 14 }}>
          {selected?.causes.ranked.map((r, i) => (
            <View key={r.cause} style={{ gap: 4 }}>
              <View style={styles.hotHead}>
                <Text style={[styles.causeName, i === 0 && { fontSize: 17 }]}>
                  <Icon name={Causes[r.cause].icon} size={i === 0 ? 18 : 15} color={Brand.ink} /> {Causes[r.cause].label}
                </Text>
                <Text style={styles.causeScore}>{Math.round(r.score * 100)}</Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.round(r.score * 100)}%`, backgroundColor: i === 0 ? Brand.pink : Brand.orange }]} />
              </View>
              {r.reasons.map((reason) => (
                <Text key={reason} style={styles.reason}>
                  • {reason}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </ModelCard>

      <ModelCard
        name="Forecast"
        ran={ran}
        title="คาดการณ์ 4 ชั่วโมงข้างหน้า (ทั้งเมือง)"
        inputs="รูปแบบรายชั่วโมง, พยากรณ์ฝนรายชั่วโมงจาก Open-Meteo"
        method="ชั่วโมงที่มีโอกาสฝน 40% ขึ้นไปจะถูกปรับให้ติดขึ้น และปรับเพิ่มอีกเมื่อคาดว่าฝนตก 1 มม. ขึ้นไป">
        <View style={styles.forecast}>
          {data.forecast.map((f, i) => (
            <View key={f.startMs} style={styles.fcCol}>
              <Text style={styles.fcIndex}>{f.index}</Text>
              <View style={styles.fcBarBox}>
                <View style={[styles.fcBar, { height: `${Math.max(6, f.index)}%`, backgroundColor: LevelColors[f.level], opacity: i === 0 ? 1 : 0.8 }]} />
              </View>
              <Text style={styles.fcHour}>{i === 0 ? 'ตอนนี้' : `${bangkokClock(f.startMs)}`}</Text>
              <Text style={styles.fcLevel}>{LevelLabels[f.level]}</Text>
              <Text style={styles.fcRain}>
                <Icon name="weather-pouring" size={12} color={Brand.blue} /> {f.rainProbability}%
              </Text>
            </View>
          ))}
        </View>
      </ModelCard>

      <ModelCard
        name="Route Advisor"
        ran={ran}
        title="ควรออกเดินทางตอนไหน"
        inputs="ผลจาก Forecast, Congestion Engine และเส้นทางจาก OpenStreetMap"
        method="เทียบเวลาเดินทางของแต่ละชั่วโมงในช่วงคาดการณ์ แล้วเลือกชั่วโมงที่ใช้เวลาน้อยที่สุด ความยาวช่วงที่ติดประมาณจากระดับความหนาแน่นและทิศทางการเดินทางช่วงเช้า-เย็น">
        <View style={styles.advice}>
          <Text style={styles.adviceBig}>
            {bestIsNow || a.savingPct < 5
              ? 'ออกได้เลย ตอนนี้ดีที่สุดใน 4 ชั่วโมงข้างหน้า'
              : `ถ้ารอได้ ออกตอน ${bangkokClock(a.best.startMs)} น. จะเร็วขึ้นราว ${a.savingPct}%`}
          </Text>
          <Text style={styles.adviceSub}>ขับรถ 10 กม. ตอนนี้ใช้เวลาประมาณ {a.tenKmMinutesNow} นาที</Text>
        </View>
        <Text style={styles.avoidTitle}>ช่วงถนนที่ติดหนักที่สุดตอนนี้ · แตะเพื่อดูบนแผนที่</Text>
        <View style={{ gap: 8 }}>
          {data.jams.slice(0, 4).map((j) => (
            <Pressable
              key={j.id}
              accessibilityRole="button"
              onPress={() => onFocus([j.line, j.clearLine])}
              style={({ pressed }) => [styles.jamRow, pressed && { opacity: 0.85 }]}>
              <View style={[styles.jamBar, { backgroundColor: LevelColors[j.level] }]} />
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text style={styles.jamName} numberOfLines={1}>
                  {j.road} {j.direction}
                </Text>
                <Text style={styles.jamText}>
                  <Icon name="alert" size={12} color={Brand.pink} /> ติดตั้งแต่ {j.fromName} ถึง {j.toName} · {(j.toKm - j.fromKm).toFixed(1)} กม.
                </Text>
                <Text style={styles.jamText}>
                  <Icon name="check-circle" size={12} color={Brand.primary} /> พ้นรถติดมุ่งหน้า {j.clearName} · ช้ากว่าปกติ {j.delayMin} นาที
                </Text>
              </View>
              <Icon name="map-marker" size={18} color={Brand.primary} />
            </Pressable>
          ))}
        </View>
        <Text style={styles.avoidTitle}>จุดที่ควรเลี่ยงตอนนี้</Text>
        <View style={{ gap: 8 }}>
          {a.avoid.map((x, i) => (
            <View key={x.id} style={styles.avoidRow}>
              <Text style={styles.avoidRank}>{i + 1}</Text>
              <Text style={styles.avoidName} numberOfLines={1}>
                {x.name}
              </Text>
              <Text style={styles.avoidCause}>
                <Icon name={Causes[x.cause].icon} size={12} color={Brand.inkSoft} /> {Causes[x.cause].label}
              </Text>
              <Text style={styles.avoidIndex}>{x.index}</Text>
            </View>
          ))}
        </View>
      </ModelCard>
    </View>
  );
}

function ModelCard(p: { name: string; ran: string; title: string; inputs: string; method: string; children: ReactNode }) {
  return (
    <Card style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.modelChip}>
          <View style={styles.modelDot} />
          <Text style={styles.modelName}>{p.name}</Text>
        </View>
        <Text style={styles.ran}>คำนวณล่าสุด {p.ran}</Text>
      </View>
      <Text style={styles.cardTitle}>{p.title}</Text>
      <View style={{ marginTop: 12, flex: 1 }}>{p.children}</View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          <Text style={styles.footerLabel}>ข้อมูลที่ใช้: </Text>
          {p.inputs}
        </Text>
        <Text style={styles.footerText}>
          <Text style={styles.footerLabel}>วิธีคิด: </Text>
          {p.method}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three, alignItems: 'stretch' },
  card: { flexGrow: 1, flexBasis: 440, flexShrink: 1, minWidth: 0 },
  cardTop: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  modelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(68, 0, 125, 0.08)',
  },
  modelDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Brand.mint },
  modelName: { color: Brand.purple, fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
  ran: { color: Brand.inkSoft, fontSize: 11, fontVariant: ['tabular-nums'] },
  cardTitle: { color: Brand.ink, fontSize: 18, fontWeight: '800', marginTop: 10 },
  hotRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 14, borderWidth: 1, borderColor: 'transparent' },
  hotRowActive: { backgroundColor: Brand.page, borderColor: Brand.line },
  hotHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  hotName: { flex: 1, color: Brand.ink, fontSize: 14, fontWeight: '700' },
  hotIndex: { fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  hotMeta: { color: Brand.inkSoft, fontSize: 12, marginTop: 4 },
  track: { height: 8, borderRadius: 4, backgroundColor: Brand.page, marginTop: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  basis: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999, backgroundColor: Brand.page },
  basisMeasured: { backgroundColor: 'rgba(0, 191, 136, 0.15)' },
  basisText: { color: Brand.inkSoft, fontSize: 11, fontWeight: '700' },
  basisTextMeasured: { color: Brand.primary },
  causeName: { color: Brand.ink, fontSize: 15, fontWeight: '800', flexShrink: 1 },
  causeScore: { color: Brand.ink, fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  reason: { color: Brand.inkSoft, fontSize: 12, lineHeight: 18 },
  forecast: { flexDirection: 'row', gap: 10 },
  fcCol: { flex: 1, alignItems: 'center', gap: 4 },
  fcIndex: { color: Brand.ink, fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] },
  fcBarBox: { width: '100%', height: 140, justifyContent: 'flex-end', borderRadius: 10, backgroundColor: Brand.page, overflow: 'hidden' },
  fcBar: { width: '100%', borderRadius: 10 },
  fcHour: { color: Brand.ink, fontSize: 13, fontWeight: '800' },
  fcLevel: { color: Brand.inkSoft, fontSize: 11 },
  fcRain: { color: Brand.blue, fontSize: 12, fontWeight: '700' },
  advice: { padding: 16, borderRadius: 16, backgroundColor: Brand.primary, gap: 6 },
  adviceBig: { color: '#FFFFFF', fontSize: 20, lineHeight: 30, fontWeight: '800' },
  adviceSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
  avoidTitle: { color: Brand.ink, fontSize: 14, fontWeight: '800', marginTop: 14, marginBottom: 8 },
  jamRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, backgroundColor: Brand.page },
  jamBar: { width: 5, alignSelf: 'stretch', borderRadius: 3 },
  jamName: { color: Brand.ink, fontSize: 13, fontWeight: '800' },
  jamText: { color: Brand.inkSoft, fontSize: 12, lineHeight: 18 },
  avoidRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, backgroundColor: Brand.page },
  avoidRank: { width: 22, height: 22, borderRadius: 11, textAlign: 'center', lineHeight: 22, fontSize: 12, fontWeight: '800', color: '#FFFFFF', backgroundColor: Brand.pink, overflow: 'hidden' },
  avoidName: { flex: 1, color: Brand.ink, fontSize: 14, fontWeight: '700' },
  avoidCause: { color: Brand.inkSoft, fontSize: 12 },
  avoidIndex: { color: '#B0237F', fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  footer: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: Brand.line, gap: 4 },
  footerText: { color: Brand.inkSoft, fontSize: 12, lineHeight: 18 },
  footerLabel: { color: Brand.ink, fontWeight: '700' },
});
