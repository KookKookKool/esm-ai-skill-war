import { View } from 'react-native';
import { Brand } from '@/constants/brand';

/** Logo: a small traffic light in the jam-to-free-flow colours. */
export function BrandMark({ size = 30 }: { size?: number }) {
  const dot = Math.round(size * 0.2);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        backgroundColor: Brand.ink,
        alignItems: 'center',
        justifyContent: 'center',
        gap: Math.max(2, Math.round(size * 0.07)),
      }}>
      {[Brand.pink, Brand.yellow, Brand.mint].map((c) => (
        <View key={c} style={{ width: dot, height: dot, borderRadius: dot / 2, backgroundColor: c }} />
      ))}
    </View>
  );
}
