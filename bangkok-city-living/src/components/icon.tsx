import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import type { StyleProp, TextStyle } from 'react-native';

/** Material Design Icons names. The map uses the same glyphs as SVG (see explore/map-icons.ts). */
export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

/** One icon set for the whole app. Renders as text, so it can sit inline inside a <Text>. */
export function Icon({ name, size = 16, color, style }: { name: IconName; size?: number; color: string; style?: StyleProp<TextStyle> }) {
  return <MaterialCommunityIcons name={name} size={size} color={color} style={style} />;
}
