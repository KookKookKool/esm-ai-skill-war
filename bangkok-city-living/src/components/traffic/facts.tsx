import { StyleSheet, Text, View } from 'react-native';
import { ExternalLink } from '@/components/external-link';
import { Brand } from '@/constants/brand';
import { Spacing } from '@/constants/theme';
import { Facts, Sources, WhyCards, type WhyCard } from '@/data/research';
import { Icon } from '@/components/icon';

/** Four headline numbers from public sources, right under the map. */
export function FactsStrip() {
  return (
    <View style={styles.strip}>
      <View style={styles.inner}>
        <Text style={styles.stripTitle}>ตัวเลขจริงที่คนกรุงเทพฯ เจอทุกวัน</Text>
        <View style={styles.factGrid}>
          {Facts.map((f, i) => (
            <View key={f.label} style={[styles.fact, i === 0 && styles.factFirst]}>
              <Text style={[styles.factValue, i === 0 && { color: '#FFFFFF' }]}>
                {f.value}
                <Text style={[styles.factUnit, i === 0 && { color: Brand.yellow }]}> {f.unit}</Text>
              </Text>
              <Text style={[styles.factLabel, i === 0 && { color: 'rgba(255,255,255,0.85)' }]}>{f.label}</Text>
              <ExternalLink href={Sources[f.source].url} style={[styles.source, i === 0 && { color: Brand.yellow }]}>
                {Sources[f.source].name} ↗
              </ExternalLink>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const TONES: Record<WhyCard['tone'], { fg: string; bg: string; bar: string }> = {
  orange: { fg: '#A65F00', bg: 'rgba(253, 176, 74, 0.18)', bar: Brand.orange },
  blue: { fg: Brand.blue, bg: 'rgba(7, 112, 208, 0.1)', bar: Brand.blue },
  purple: { fg: Brand.purple, bg: 'rgba(68, 0, 125, 0.08)', bar: Brand.purple },
  pink: { fg: '#B0237F', bg: 'rgba(232, 61, 168, 0.1)', bar: Brand.pink },
  lime: { fg: '#3F7A1F', bg: 'rgba(103, 164, 59, 0.15)', bar: Brand.lime },
  yellow: { fg: '#6F5C00', bg: 'rgba(246, 222, 80, 0.3)', bar: Brand.yellow },
};

/** Root causes, each with a real number or event and its source. */
export function WhyGrid() {
  return (
    <View style={styles.whyGrid}>
      {WhyCards.map((c) => {
        const t = TONES[c.tone];
        return (
          <View key={c.title} style={[styles.why, { borderTopColor: t.bar }]}>
            <View style={styles.whyHead}>
              <View style={[styles.icon, { backgroundColor: t.bg }]}>
                <Icon name={c.icon} size={24} color={t.fg} />
              </View>
              <Text style={styles.whyTitle}>{c.title}</Text>
            </View>
            <Text style={[styles.whyValue, { color: t.fg }]}>{c.value}</Text>
            <Text style={styles.whyValueLabel}>{c.valueLabel}</Text>
            <Text style={styles.whyBody}>{c.body}</Text>
            <View style={styles.sources}>
              <Text style={styles.sourceLead}>ที่มา</Text>
              {c.sources.map((k) => (
                <ExternalLink key={k} href={Sources[k].url} style={styles.sourceLink}>
                  {Sources[k].short} ↗
                </ExternalLink>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { paddingHorizontal: Spacing.three, paddingTop: Spacing.five },
  inner: { width: '100%', maxWidth: 1120, alignSelf: 'center' },
  stripTitle: { color: Brand.inkSoft, fontSize: 14, fontWeight: '700', marginBottom: Spacing.three },
  factGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  fact: {
    flexGrow: 1,
    flexBasis: 230,
    flexShrink: 1,
    padding: 20,
    borderRadius: 22,
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.line,
    gap: 6,
  },
  factFirst: { backgroundColor: Brand.forest, borderColor: Brand.forest },
  factValue: { color: Brand.ink, fontSize: 40, lineHeight: 50, fontWeight: '800' },
  factUnit: { color: Brand.primary, fontSize: 16, fontWeight: '700' },
  factLabel: { color: Brand.inkSoft, fontSize: 14, lineHeight: 22 },
  source: { color: Brand.primary, fontSize: 12, fontWeight: '700', marginTop: 'auto', paddingTop: 6 },
  whyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  why: {
    flexGrow: 1,
    flexBasis: 320,
    flexShrink: 1,
    padding: 22,
    borderRadius: 22,
    backgroundColor: Brand.surface,
    borderWidth: 1,
    borderColor: Brand.line,
    borderTopWidth: 5,
    boxShadow: '0 8px 28px rgba(0, 117, 74, 0.07)',
  },
  whyHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  whyTitle: { color: Brand.ink, fontSize: 18, fontWeight: '800', flexShrink: 1 },
  whyValue: { fontSize: 36, lineHeight: 46, fontWeight: '800', marginTop: 16 },
  whyValueLabel: { color: Brand.inkSoft, fontSize: 13, fontWeight: '600' },
  whyBody: { color: Brand.ink, fontSize: 15, lineHeight: 25, marginTop: 12 },
  sources: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 14 },
  sourceLead: { color: Brand.inkSoft, fontSize: 12 },
  sourceLink: {
    color: Brand.primary,
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 117, 74, 0.08)',
    overflow: 'hidden',
  },
});
