import { useFocusEffect } from 'expo-router';
import { memo, useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { Icon } from '@/components/icon';
import { Brand, MapColors } from '@/constants/brand';
import {
  HOTSPOTS,
  LABELS,
  MAP_H,
  MAP_W,
  PARKS,
  PeriodStats,
  RAILS,
  RIVER,
  ROADS,
  VIEW_MINI,
  VIEW_NARROW,
  VIEW_WIDE,
  hotspotKmh,
  type Pt,
  type Viewport,
} from '@/data/bangkok-map';
import type { Period } from '@/data/traffic';
import {
  CAR_L,
  CAR_STRIDE,
  CAR_W,
  PERIOD_KEYS,
  S_CARS,
  S_HOT,
  S_TIME,
  TRAIN_L,
  TRAIN_STRIDE,
  TRAIN_W,
  createModel,
  speedColor,
  stepSim,
} from './model';

const noopSubscribe = () => () => {};

export function hotspotColor(level: number) {
  if (level >= 0.85) return Brand.pink;
  if (level >= 0.7) return Brand.orange;
  return Brand.yellow;
}

type Props = { period: Period; variant?: 'full' | 'mini' };

export function LiveMap({ period, variant = 'full' }: Props) {
  const mini = variant === 'mini';
  const pIndex = PERIOD_KEYS.indexOf(period);
  const [model] = useState(() =>
    createModel(
      mini
        ? { spacing: 118, trainsPerLane: 1, period: pIndex, seed: 7, view: VIEW_MINI }
        : // Fewer cars on iOS/Android: every car is a native view updated each frame.
          { spacing: Platform.OS === 'web' ? 92 : 120, trainsPerLane: Platform.OS === 'web' ? 3 : 2, period: pIndex, seed: 42 },
    ),
  );
  const sim = useSharedValue(() => model.initial.slice());
  const periodSV = useSharedValue(pIndex);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const { width } = size;
  const [userPlaying, setUserPlaying] = useState<boolean | null>(null);
  const systemReduced = useReducedMotion();
  // Read reduced motion only after hydration, so the server and first client render match.
  const reduced = useSyncExternalStore(noopSubscribe, () => systemReduced, () => false);
  const moving = userPlaying ?? !reduced;

  useEffect(() => {
    periodSV.set(pIndex);
  }, [periodSV, pIndex]);

  useEffect(() => {
    if (moving) return;
    // Paused or reduced motion: jump the still frame straight to the selected period.
    sim.modify((a) => {
      'worklet';
      stepSim(a, 1, pIndex, model);
      return a;
    });
  }, [sim, model, pIndex, moving]);

  const frame = useFrameCallback((info) => {
    const dt = Math.min(info.timeSincePreviousFrame ?? 16, 48) / 1000;
    const p = periodSV.get();
    sim.modify((a) => {
      'worklet';
      stepSim(a, dt, p, model);
      return a;
    });
  }, false);

  // Run only while the screen is focused, so a background tab doesn't keep animating.
  useFocusEffect(
    useCallback(() => {
      frame.setActive(moving);
      return () => frame.setActive(false);
    }, [frame, moving]),
  );

  const base = mini ? VIEW_MINI : width > 0 && width < 520 ? VIEW_NARROW : VIEW_WIDE;
  const view = mini ? base : fitView(base, width, size.height);
  const narrow = base === VIEW_NARROW;
  const scale = width / view.w;
  const height = view.h * scale;
  const px = (p: Pt) => [(p[0] - view.x) * scale, (p[1] - view.y) * scale] as const;
  // Labels are centred on their point and need room on both sides.
  const labelFits = (p: Pt) => {
    const [x, y] = px(p);
    return x >= 44 && x <= width - 44 && y >= 10 && y <= height - 12;
  };
  // Chips grow to the right, and must stay clear of the badge (top left) and play button (top right).
  const chipFits = ([x, y]: readonly [number, number]) =>
    x >= 4 &&
    x <= width - (mini ? 70 : 120) &&
    y >= 8 &&
    y <= height - 24 &&
    (mini || !(x < 220 && y < 42)) &&
    (mini || !(x > width - 60 && y < 46));
  const hot = HOTSPOTS.filter((h) => h.level[period] >= 0.6).sort((a, b) => b.level[period] - a.level[period]);
  const chipAt = (h: (typeof HOTSPOTS)[number]): Pt => (mini ? [h.at[0] + 10, h.at[1] - 16] : h.chip);
  const chips = (mini ? hot.slice(0, 2) : hot).filter((h) => chipFits(px(chipAt(h))));

  return (
    <View
      onLayout={(e) => {
        const { width: w, height: h } = e.nativeEvent.layout;
        setSize((s) => (s.width === w && s.height === h ? s : { width: w, height: h }));
      }}
      style={[styles.frame, mini ? styles.frameMini : styles.frameGrow, { aspectRatio: base.w / base.h }]}>
      {/* The canvas needs a measured width, so it only renders on the client (no hydration diff). */}
      {width > 0 && (
      <View
        style={[
          styles.canvas,
          { transform: [{ translateX: -view.x * scale }, { translateY: -view.y * scale }, { scale }] },
        ]}>
        <StaticLayers />
        {HOTSPOTS.map((h, i) => (
          <HotGlow key={h.id} sim={sim} index={i} />
        ))}
        {model.carLane.map((_, i) => (
          <Car key={i} sim={sim} index={i} />
        ))}
        {model.trainLane.map((_, i) => (
          <Train key={i} sim={sim} base={model.trainBase} index={i} color={model.trainColor[i]} />
        ))}
        {HOTSPOTS.map((h, i) => (
          <HotRings key={h.id} sim={sim} index={i} />
        ))}
      </View>
      )}

      {width > 0 && !mini &&
        LABELS.filter((l) => labelFits(l.at) && (!narrow || l.kind !== 'road')).map((l) => (
          <View
            key={l.text}
            style={[
              styles.labelBox,
              { left: pct(l.at[0], view.x, view.w), top: pct(l.at[1], view.y, view.h) },
              l.rotate ? { transform: [{ rotate: `${l.rotate}deg` }] } : null,
            ]}>
            <Text numberOfLines={1} style={[styles.label, l.kind === 'area' && styles.labelArea, l.kind === 'water' && styles.labelWater]}>
              {l.text}
            </Text>
          </View>
        ))}

      {width > 0 && chips.map((h) => {
        const at = chipAt(h);
        return (
          <View
            key={h.id}
            style={[styles.chip, mini && styles.chipMini, { left: pct(at[0], view.x, view.w), top: pct(at[1], view.y, view.h) }]}>
            <View style={[styles.chipDot, { backgroundColor: hotspotColor(h.level[period]) }]} />
            <Text numberOfLines={1} style={[styles.chipName, (mini || narrow) && styles.chipNameSmall]}>
              {h.short ?? h.name}
            </Text>
            {!mini && (
              <Text numberOfLines={1} style={[styles.chipSpeed, narrow && styles.chipNameSmall]}>
                {hotspotKmh(h, period)} กม./ชม.
              </Text>
            )}
          </View>
        );
      })}

      {!mini && (
        <>
          <View style={styles.badge}>
            <View style={[styles.badgeDot, { backgroundColor: moving ? Brand.mint : Brand.inkSoft }]} />
            <Text style={styles.badgeText}>
              จำลองการจราจร · {PeriodStats[period].clock} น.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={moving ? 'หยุดภาพเคลื่อนไหว' : 'เล่นภาพเคลื่อนไหว'}
            onPress={() => setUserPlaying(!moving)}
            style={({ pressed }) => [styles.playBtn, pressed && { opacity: 0.7 }]}>
            <Icon name={moving ? 'pause' : 'play'} size={16} color="#FFFFFF" />
          </Pressable>
        </>
      )}
    </View>
  );
}

/**
 * When the frame is stretched taller than the map's shape (desktop, next to the side panel),
 * crop the view to the frame instead of leaving empty space.
 */
function fitView(base: Viewport, width: number, height: number): Viewport {
  if (!width || !height) return base;
  const aspect = width / height;
  if (aspect >= (base.w / base.h) * 0.98) return base;
  const w = base.h * aspect;
  return { x: base.x + (base.w - w) * 0.6, y: base.y, w, h: base.h };
}

function pct(value: number, start: number, size: number) {
  return `${Math.round(((value - start) / size) * 100000) / 1000}%` as const;
}

function Car({ sim, index }: { sim: SharedValue<number[]>; index: number }) {
  const style = useAnimatedStyle(() => {
    const a = sim.get();
    const o = S_CARS + index * CAR_STRIDE;
    return {
      opacity: a[o + 5],
      backgroundColor: speedColor(a[o + 4]),
      transform: [
        { translateX: a[o + 1] - CAR_L / 2 },
        { translateY: a[o + 2] - CAR_W / 2 },
        { rotate: `${a[o + 3]}rad` },
      ],
    };
  });
  return <Animated.View style={[styles.car, style]} />;
}

function Train({ sim, base, index, color }: { sim: SharedValue<number[]>; base: number; index: number; color: string }) {
  const style = useAnimatedStyle(() => {
    const a = sim.get();
    const o = base + index * TRAIN_STRIDE;
    return {
      opacity: a[o + 4],
      transform: [
        { translateX: a[o + 1] - TRAIN_L / 2 },
        { translateY: a[o + 2] - TRAIN_W / 2 },
        { rotate: `${a[o + 3]}rad` },
      ],
    };
  });
  return <Animated.View style={[styles.train, { borderColor: color }, style]} />;
}

function hotBox(index: number) {
  const h = HOTSPOTS[index];
  return { left: h.at[0] - h.r, top: h.at[1] - h.r, width: h.r * 2, height: h.r * 2, borderRadius: h.r };
}

function HotGlow({ sim, index }: { sim: SharedValue<number[]>; index: number }) {
  const style = useAnimatedStyle(() => {
    const level = sim.get()[S_HOT + index];
    return { opacity: Math.max(0, level - 0.2) * 0.55, transform: [{ scale: 0.4 + level * 0.5 }] };
  });
  return <Animated.View style={[styles.hotGlow, hotBox(index), style]} />;
}

function HotRings({ sim, index }: { sim: SharedValue<number[]>; index: number }) {
  const ringA = useAnimatedStyle(() => {
    const a = sim.get();
    const t = (a[S_TIME] * 0.42 + index * 0.17) % 1;
    const strength = Math.min(1, Math.max(0, a[S_HOT + index] - 0.3) * 1.8);
    return { opacity: (1 - t) * strength, transform: [{ scale: 0.25 + t * 0.85 }] };
  });
  const ringB = useAnimatedStyle(() => {
    const a = sim.get();
    const t = (a[S_TIME] * 0.42 + index * 0.17 + 0.5) % 1;
    const strength = Math.min(1, Math.max(0, a[S_HOT + index] - 0.3) * 1.8);
    return { opacity: (1 - t) * strength, transform: [{ scale: 0.25 + t * 0.85 }] };
  });
  return (
    <>
      <Animated.View style={[styles.hotRing, hotBox(index), ringA]} />
      <Animated.View style={[styles.hotRing, hotBox(index), ringB]} />
    </>
  );
}

function Seg({ a, b, w, color }: { a: Pt; b: Pt; w: number; color: string }) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  return (
    <View
      style={{
        position: 'absolute',
        left: (a[0] + b[0]) / 2 - (len + w) / 2,
        top: (a[1] + b[1]) / 2 - w / 2,
        width: len + w,
        height: w,
        borderRadius: w / 2,
        backgroundColor: color,
        transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }],
      }}
    />
  );
}

function Line({ pts, w, color, loop }: { pts: readonly Pt[]; w: number; color: string; loop?: boolean }) {
  const all = loop ? [...pts, pts[0]] : pts;
  return all.slice(1).map((b, i) => <Seg key={i} a={all[i]} b={b} w={w} color={color} />);
}

/** Split a polyline into dash segments, used to draw the underground MRT line. */
function dashes(pts: readonly Pt[], loop: boolean, dash: number, gap: number) {
  const all = loop ? [...pts, pts[0]] : pts;
  const out: [Pt, Pt][] = [];
  let carry = 0;
  for (let i = 0; i < all.length - 1; i++) {
    const [x0, y0] = all[i];
    const [x1, y1] = all[i + 1];
    const len = Math.hypot(x1 - x0, y1 - y0);
    const ux = (x1 - x0) / len;
    const uy = (y1 - y0) / len;
    let s = 0;
    while (s < len - 0.01) {
      const pos = carry % (dash + gap);
      const run = Math.min((pos < dash ? dash : dash + gap) - pos, len - s);
      if (pos < dash) out.push([[x0 + ux * s, y0 + uy * s], [x0 + ux * (s + run), y0 + uy * (s + run)]]);
      s += run;
      carry += run;
    }
  }
  return out;
}

const RAIL_DASHES = RAILS.map((r) => (r.id === 'mrt' ? dashes(r.pts, r.loop, 9, 7) : null));

const StaticLayers = memo(function StaticLayers() {
  return (
    <>
      {PARKS.map((p) => (
        <View key={p.name} style={[styles.park, { left: p.x, top: p.y, width: p.w, height: p.h, borderRadius: p.r }]} />
      ))}
      <Line pts={RIVER} w={30} color={MapColors.riverGlow} />
      <Line pts={RIVER} w={16} color={MapColors.river} />
      {ROADS.map((r) => (
        <Line key={r.id} pts={r.pts} w={r.major ? 10 : 7} color={r.major ? MapColors.roadMajor : MapColors.road} />
      ))}
      {RAILS.map((r, i) => {
        const d = RAIL_DASHES[i];
        return d ? (
          d.map(([a, b], k) => <Seg key={`${r.id}${k}`} a={a} b={b} w={2.6} color={r.color} />)
        ) : (
          <Line key={r.id} pts={r.pts} loop={r.loop} w={3.2} color={r.color} />
        );
      })}
      {RAILS.flatMap((r) =>
        r.stations.map(([x, y], i) => (
          <View key={`${r.id}-st${i}`} style={[styles.station, { left: x - 4.5, top: y - 4.5, borderColor: r.color }]} />
        )),
      )}
    </>
  );
});

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 22,
    backgroundColor: MapColors.bg,
  },
  frameMini: { borderRadius: 16 },
  frameGrow: { flexGrow: 1 },
  canvas: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: MAP_W,
    height: MAP_H,
    transformOrigin: 'left top',
    pointerEvents: 'none',
  },
  park: { position: 'absolute', backgroundColor: MapColors.park },
  station: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
  },
  car: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: CAR_L,
    height: CAR_W,
    borderRadius: CAR_W / 2,
  },
  train: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: TRAIN_L,
    height: TRAIN_W,
    borderRadius: TRAIN_W / 2,
    borderWidth: 1.6,
    backgroundColor: '#FFFFFF',
  },
  hotGlow: { position: 'absolute', backgroundColor: 'rgba(232, 61, 168, 0.35)' },
  hotRing: { position: 'absolute', borderWidth: 1.6, borderColor: Brand.pink },
  labelBox: {
    position: 'absolute',
    width: 140,
    marginLeft: -70,
    marginTop: -9,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  label: { color: MapColors.label, fontSize: 11, fontWeight: '600' },
  labelArea: { color: MapColors.labelDim, fontWeight: '700', letterSpacing: 0.6 },
  labelWater: { color: MapColors.water, fontStyle: 'italic' },
  chip: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 3,
    paddingLeft: 6,
    paddingRight: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(8, 35, 26, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    pointerEvents: 'none',
  },
  chipMini: { paddingVertical: 2, paddingLeft: 4, paddingRight: 6, gap: 3 },
  chipDot: { width: 7, height: 7, borderRadius: 3.5 },
  chipName: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  chipNameSmall: { fontSize: 9 },
  chipSpeed: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '600' },
  badge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(8, 35, 26, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  badgeDot: { width: 7, height: 7, borderRadius: 3.5 },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  playBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8, 35, 26, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  playText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
});
