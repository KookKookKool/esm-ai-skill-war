/** Brand palette taken from the supplied colour swatch. */
export const Brand = {
  primary: '#00754A',
  forest: '#215A43',
  lime: '#67A43B',
  mint: '#00BF88',
  orange: '#FDB04A',
  yellow: '#F6DE50',
  blue: '#0770D0',
  pink: '#E83DA8',
  purple: '#44007D',
  ink: '#10231B',
  inkSoft: '#4B6358',
  surface: '#FFFFFF',
  page: '#F2F8F4',
  line: '#D9E7DF',
} as const;

/** Night-map colours. Opaque blends of the palette over `bg`, so overlapping segments stay even. */
export const MapColors = {
  bg: '#0A2A1F',
  frame: '#08231A',
  road: '#21443A',
  roadMajor: '#2B5145',
  river: '#0A5287',
  riverGlow: '#0B3A4A',
  park: '#1D4426',
  label: 'rgba(255,255,255,0.62)',
  labelDim: 'rgba(255,255,255,0.36)',
  water: 'rgba(120,180,255,0.7)',
} as const;

/** Traffic level -> colour. Level 0 (free flow) to 4 (gridlock). */
export const LevelColors = [Brand.mint, Brand.lime, Brand.yellow, Brand.orange, Brand.pink] as const;
export const LevelLabels = ['คล่องตัว', 'ปกติ', 'เริ่มหนาแน่น', 'ติดขัด', 'ติดหนัก'] as const;

export function levelFromIndex(index: number): 0 | 1 | 2 | 3 | 4 {
  if (index < 20) return 0;
  if (index < 40) return 1;
  if (index < 60) return 2;
  if (index < 80) return 3;
  return 4;
}
