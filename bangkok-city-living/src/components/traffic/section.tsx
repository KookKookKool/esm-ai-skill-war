import { Brand } from '@/constants/brand';
import { Spacing } from '@/constants/theme';
import { useViewportWidth } from '@/hooks/use-viewport-width';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent, type ViewStyle } from 'react-native';

export function Section({
  eyebrow,
  title,
  subtitle,
  badge,
  onLayout,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  badge?: string;
  onLayout?: (e: LayoutChangeEvent) => void;
  children: ReactNode;
}) {
  const compact = useViewportWidth() < 640;
  return (
    <View style={styles.section} onLayout={onLayout}>
      <View style={styles.headRow}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <View style={styles.body}>{children}</View>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  section: {
    width: '100%',
    maxWidth: 1152,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: 80,
  },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  eyebrow: {
    color: Brand.primary,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(253, 176, 74, 0.2)',
  },
  badgeText: { color: '#9A5A00', fontSize: 11, fontWeight: '700' },
  title: {
    color: Brand.ink,
    fontSize: 36,
    lineHeight: 50,
    fontWeight: '800',
    marginTop: Spacing.one,
  },
  titleCompact: { fontSize: 28, lineHeight: 40 },
  subtitle: {
    color: Brand.inkSoft,
    fontSize: 16,
    lineHeight: 27,
    marginTop: Spacing.two,
    maxWidth: 760,
  },
  body: {
    marginTop: Spacing.four,
  },
  card: {
    backgroundColor: Brand.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Brand.line,
    padding: 20,
    boxShadow: '0 8px 28px rgba(0, 117, 74, 0.08)',
  },
});
