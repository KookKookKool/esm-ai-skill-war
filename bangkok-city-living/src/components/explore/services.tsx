import { StyleSheet, Text, View } from 'react-native';
import { ExternalLink } from '@/components/external-link';
import { Brand } from '@/constants/brand';
import { Spacing } from '@/constants/theme';
import { useClock } from '@/hooks/use-clock';
import { REFRESH_MS } from '@/hooks/use-live-snapshot';
import { ago, clockWithSeconds } from '@/live/format';
import type { LiveSnapshot, SourceStatus } from '@/live/types';
import { Card } from '../traffic/section';
import { SOURCE_META, STATE_META } from './meta';
import { Icon } from '@/components/icon';

export function Services({ data }: { data: LiveSnapshot }) {
  const now = useClock() ?? data.generatedMs;
  const ready = data.sources.filter((s) => s.state === 'ok').length;

  const steps = [
    { title: `${data.sources.length} บริการภายนอก`, sub: `พร้อม ${ready} · ${data.sources.filter((s) => s.state === 'disabled').length} ยังไม่เปิดใช้`, color: Brand.yellow },
    { title: '/api/live', sub: 'ดึง แคช และแปลงข้อมูลให้อยู่ในรูปแบบเดียวกัน', color: Brand.orange },
    { title: 'โมเดล 4 ตัว', sub: `คำนวณเมื่อ ${clockWithSeconds(data.generatedMs)}`, color: Brand.purple },
    { title: 'เว็บ · iOS · Android', sub: `รีเฟรชทุก ${REFRESH_MS / 1000} วินาที`, color: Brand.primary },
  ];

  return (
    <View style={{ gap: Spacing.three }}>
      <View style={styles.pipeline}>
        {steps.map((s, i) => (
          <View key={s.title} style={styles.stepWrap}>
            <View style={[styles.step, { borderTopColor: s.color }]}>
              <Text style={styles.stepTitle}>{s.title}</Text>
              <Text style={styles.stepSub}>{s.sub}</Text>
            </View>
            {i < steps.length - 1 ? <Text style={styles.arrow}>→</Text> : null}
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {data.sources.map((s) => (
          <ServiceCard key={s.id} s={s} now={now} />
        ))}
      </View>

      <Text style={styles.attribution}>
        แผนที่และเส้นทางถนน © OpenStreetMap contributors ผ่าน OpenFreeMap และ OSRM · ไอคอน Material Design Icons · เหตุการณ์จราจรโดย iTIC ผ่าน Longdo Event · เรื่องแจ้งจาก Traffy Fondue (NECTEC และกรุงเทพมหานคร) ·
        คุณภาพอากาศจากกรมควบคุมมลพิษ (Air4Thai) · สภาพอากาศจาก Open-Meteo.com (CC BY 4.0) · ความเร็วรถจาก TomTom เมื่อเปิดใช้
      </Text>
    </View>
  );
}

function ServiceCard({ s, now }: { s: SourceStatus; now: number }) {
  const meta = SOURCE_META[s.id];
  const state = STATE_META[s.state];
  return (
    <Card style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.stateChip, { backgroundColor: `${state.color}26` }]}>
          <View style={[styles.stateDot, { backgroundColor: state.color }]} />
          <Text style={styles.stateText}>{state.label}</Text>
        </View>
        <Text style={styles.refresh}>{meta.refresh}</Text>
      </View>
      <Text style={styles.name}>{meta.name}</Text>
      <Text style={styles.provider}>{meta.provider}</Text>
      <Text style={styles.gives}>{meta.gives}</Text>

      {s.state === 'disabled' ? (
        <View style={styles.howto}>
          <Text style={styles.howtoText}>
            ใส่ <Text style={styles.code}>TOMTOM_API_KEY=…</Text> ในไฟล์ <Text style={styles.code}>.env.local</Text> แล้วเริ่ม dev server ใหม่
            จุดติดจะเปลี่ยนจากค่าประมาณเป็นความเร็ววัดจริง และแผนที่จะมีชั้นสีการจราจร
          </Text>
        </View>
      ) : (
        <View style={styles.stats}>
          <Stat label="ข้อมูลที่ใช้" value={`${s.records}`} />
          <Stat label="ดึงล่าสุด" value={s.fetchedMs ? ago(s.fetchedMs, now) : '-'} />
          <Stat label="เวลาตอบ" value={s.latencyMs !== null ? `${(s.latencyMs / 1000).toFixed(1)} วิ` : '-'} />
        </View>
      )}
      {s.error ? (
        <Text style={styles.error}>
          <Icon name="alert-circle" size={13} color="#B0237F" /> {s.error}
        </Text>
      ) : null}
      <ExternalLink href={meta.url as `https://${string}`} style={styles.link}>
        ดูแหล่งข้อมูล ↗
      </ExternalLink>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pipeline: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  stepWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, flexGrow: 1, flexBasis: 220, flexShrink: 1 },
  step: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.line,
    borderTopWidth: 4,
  },
  stepTitle: { color: Brand.ink, fontSize: 15, fontWeight: '800' },
  stepSub: { color: Brand.inkSoft, fontSize: 12, marginTop: 2 },
  arrow: { color: Brand.lime, fontSize: 20, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  card: { flexGrow: 1, flexBasis: 320, flexShrink: 1, minWidth: 0, gap: 4 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 6 },
  stateChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  stateDot: { width: 8, height: 8, borderRadius: 4 },
  stateText: { color: Brand.ink, fontSize: 12, fontWeight: '800' },
  refresh: { color: Brand.inkSoft, fontSize: 11 },
  name: { color: Brand.ink, fontSize: 17, fontWeight: '800' },
  provider: { color: Brand.primary, fontSize: 13, fontWeight: '700' },
  gives: { color: Brand.inkSoft, fontSize: 13, lineHeight: 20, marginTop: 4 },
  stats: { flexDirection: 'row', gap: 8, marginTop: 10 },
  stat: { flex: 1, padding: 10, borderRadius: 12, backgroundColor: Brand.page, minWidth: 0 },
  statLabel: { color: Brand.inkSoft, fontSize: 11 },
  statValue: { color: Brand.ink, fontSize: 14, fontWeight: '800', marginTop: 2 },
  howto: { marginTop: 10, padding: 12, borderRadius: 12, backgroundColor: 'rgba(246, 222, 80, 0.25)' },
  howtoText: { color: Brand.ink, fontSize: 12, lineHeight: 19 },
  code: { fontFamily: 'monospace', fontWeight: '700' },
  error: { color: '#B0237F', fontSize: 12, marginTop: 8 },
  link: { color: Brand.primary, fontSize: 12, fontWeight: '800', marginTop: 10 },
  attribution: { color: Brand.inkSoft, fontSize: 12, lineHeight: 20 },
});
