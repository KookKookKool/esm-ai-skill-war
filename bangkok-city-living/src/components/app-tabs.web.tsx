import {
    TabList,
    TabListProps,
    Tabs,
    TabSlot,
    TabTrigger,
    TabTriggerSlotProps,
} from 'expo-router/ui';
import { Pressable, StyleSheet, Text, View, type PressableProps } from 'react-native';

import { BrandMark } from '@/components/traffic/brand-mark';
import { Brand } from '@/constants/brand';
import { Spacing } from '@/constants/theme';
import { useViewportWidth } from '@/hooks/use-viewport-width';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton>ภาพรวม</TabButton>
          </TabTrigger>
          <TabTrigger name="explore" href="/explore" asChild>
            <TabButton>สำรวจ</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable
      {...(props as unknown as PressableProps)}
      style={({ pressed }) => [
        styles.tabButtonView,
        isFocused && styles.tabButtonActive,
        pressed && styles.pressed,
      ]}>
      <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>{children}</Text>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const compact = useViewportWidth() < 520;
  return (
    <View {...props} style={styles.tabListContainer}>
      <View style={styles.innerContainer}>
        <View style={styles.brandRow}>
          <BrandMark size={32} />
          <View>
            <Text style={styles.brandText}>Bangkok City Living</Text>
            {!compact && <Text style={styles.brandTagline}>รู้ก่อนติด · ข้อมูลจราจรกรุงเทพฯ</Text>}
          </View>
        </View>
        {props.children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    width: '100%',
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    zIndex: 10,
  },
  innerContainer: {
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 8,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.one,
    maxWidth: 1088,
    backgroundColor: Brand.forest,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    boxShadow: '0 10px 30px rgba(6, 30, 21, 0.3)',
  },
  brandRow: { marginRight: 'auto', flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  brandText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  brandTagline: { color: Brand.mint, fontWeight: '600', fontSize: 11, marginTop: 1 },
  pressed: { opacity: 0.7 },
  tabButtonView: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  tabButtonActive: { backgroundColor: Brand.yellow },
  tabLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '700' },
  tabLabelActive: { color: Brand.ink, fontWeight: '800' },
});
