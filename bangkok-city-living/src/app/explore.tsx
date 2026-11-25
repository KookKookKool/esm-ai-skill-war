import type { CityMapFocus, CityMapLayers } from '@/components/explore/city-map';
import { LiveHeader } from '@/components/explore/live-header';
import { boundsOf, MapCard } from '@/components/explore/map-card';
import { Models } from '@/components/explore/models';
import { Services } from '@/components/explore/services';
import { Timeline } from '@/components/explore/timeline';
import { Section } from '@/components/traffic/section';
import { Brand } from '@/constants/brand';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useLiveSnapshot } from '@/hooks/use-live-snapshot';
import type { Line } from '@/live/types';
import { useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';

/** Every live service on one page: status, map, today's timeline, the models, and the pipeline. */
export default function ExploreScreen() {
  const live = useLiveSnapshot();
  const [picked, setPicked] = useState<string | null>(null);
  const [layers, setLayers] = useState<CityMapLayers>({ routes: true, junctions: true, events: true, reports: true, air: false, traffic: true });
  const [focus, setFocus] = useState<CityMapFocus>(null);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const mapY = useRef(0);
  const data = live.data;
  // Until the user picks one, follow whichever junction the advisor says is worst right now.
  const selectedId = picked ?? data?.advice.avoid[0]?.id ?? null;

  /** Zoom the map to a route and bring the map into view. */
  const focusLines = (lines: Line[]) => {
    setFocus({ key: Date.now(), bounds: boundsOf(lines) });
    scrollRef.current?.scrollTo({ y: Math.max(0, mapY.current - (Platform.OS === 'web' ? 80 : 0)), animated: true });
  };

  return (
    <ScrollView ref={scrollRef} style={styles.page} contentInsetAdjustmentBehavior="automatic">
      <View style={styles.band}>
        <LiveHeader live={live} />
        <View
          onLayout={(e) => {
            mapY.current = e.nativeEvent.layout.y;
          }}>
          <MapCard
            data={data}
            fresh={live.fresh}
            layers={layers}
            onLayers={setLayers}
            selectedId={selectedId}
            onSelect={setPicked}
            focus={focus}
            onFocus={focusLines}
          />
        </View>
      </View>

      <View style={styles.light}>
        {data ? (
          <>
            <Section
              eyebrow="Real-time timeline"
              title="ไทม์ไลน์วันนี้ แบบเรียลไทม์"
              subtitle="ภาพรวมทั้งวันในแถบเดียว ตั้งแต่เที่ยงคืนถึงตอนนี้ และคาดการณ์ต่อไปข้างหน้า พร้อมรายการทุกอย่างที่เพิ่งเข้ามาจากแต่ละบริการ">
              <Timeline data={data} fresh={live.fresh} history={live.history} />
            </Section>

            <Section
              eyebrow="Models"
              title="โมเดลที่ทำงานอยู่ตอนนี้"
              subtitle="ทั้ง 4 โมเดลคำนวณใหม่ทุกครั้งที่ข้อมูลเข้า แต่ละการ์ดบอกว่าใช้ข้อมูลจากบริการไหน และคิดอย่างไร">
              <Models data={data} selectedId={selectedId} onSelect={setPicked} onFocus={focusLines} />
            </Section>

            <Section
              eyebrow="Services"
              title="บริการที่เชื่อมต่ออยู่"
              subtitle="สถานะของแต่ละบริการ ณ ตอนนี้ ถ้าบริการใดล่ม หน้านี้จะใช้ข้อมูลล่าสุดที่มีและบอกไว้ในการ์ด">
              <Services data={data} />
            </Section>
          </>
        ) : (
          <View style={styles.waiting}>
            <Text style={styles.waitingText}>
              {live.error ? `ยังเชื่อมต่อ /api/live ไม่ได้ (${live.error}) จะลองใหม่อัตโนมัติ` : 'กำลังรวบรวมข้อมูลจาก iTIC, Traffy Fondue, Air4Thai, Open-Meteo และ TomTom…'}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Brand.primary },
  band: { backgroundColor: Brand.primary },
  light: { backgroundColor: Brand.page, paddingBottom: Spacing.six + BottomTabInset + 40 },
  waiting: { padding: Spacing.six, alignItems: 'center' },
  waitingText: { color: Brand.inkSoft, fontSize: 15, textAlign: 'center' },
});
