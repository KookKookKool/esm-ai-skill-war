import { Architecture } from '@/components/traffic/architecture';
import { Explorer } from '@/components/traffic/explorer';
import { FactsStrip, WhyGrid } from '@/components/traffic/facts';
import { Footer } from '@/components/traffic/footer';
import { Hero } from '@/components/traffic/hero';
import { MapSection } from '@/components/traffic/map-section';
import { Previews } from '@/components/traffic/previews';
import { Section } from '@/components/traffic/section';
import { Brand } from '@/constants/brand';
import type { Period } from '@/data/traffic';
import { useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';

export default function HomeScreen() {
  // One time-of-day selection drives the map, the explorer and the previews.
  const [period, setPeriod] = useState<Period>('evening');
  const scrollRef = useRef<ScrollViewInstance>(null);
  // Offsets inside the scroll content, recorded on layout. `why` is relative to the light wrapper.
  const pos = useRef({ map: 0, light: 0, why: 0 });

  const scrollTo = (y: number) => {
    scrollRef.current?.scrollTo({ y: Math.max(0, y - (Platform.OS === 'web' ? 76 : 0)), animated: true });
  };

  return (
    <ScrollView ref={scrollRef} style={styles.page} contentInsetAdjustmentBehavior="automatic">
      {/* Hero and map share one green band, so the hero's decorations run behind the map without a seam. */}
      <View style={styles.band}>
        <Hero
          onMap={() => scrollTo(pos.current.map)}
          onWhy={() => scrollTo(pos.current.light + pos.current.why)}
        />
        <View
          onLayout={(e) => {
            pos.current.map = e.nativeEvent.layout.y;
          }}>
          <MapSection period={period} onPeriodChange={setPeriod} />
        </View>
      </View>

      <View
        style={styles.light}
        onLayout={(e) => {
          pos.current.light = e.nativeEvent.layout.y;
        }}>
        <FactsStrip />

        <Section
          eyebrow="Traffic explorer"
          title="ติดที่ไหน ตอนไหน"
          badge="ข้อมูลตัวอย่าง"
          subtitle="เลือกช่วงเวลาเพื่อดูเขตที่ติดมากที่สุดและสาเหตุหลักของแต่ละเขต ช่วงเวลาที่เลือกจะเปลี่ยนแผนที่ด้านบนไปด้วย">
          <Explorer period={period} onPeriodChange={setPeriod} />
        </Section>

        <Section
          eyebrow="Why Bangkok jams"
          title="ทำไมกรุงเทพฯ ถึงติดขนาดนี้"
          subtitle="สาเหตุหลักที่ระบบต้องแยกให้ออก แต่ละข้อมีตัวเลขหรือเหตุการณ์จริงกำกับ พร้อมลิงก์ไปยังแหล่งข้อมูล"
          onLayout={(e) => {
            pos.current.why = e.nativeEvent.layout.y;
          }}>
          <WhyGrid />
        </Section>

        <Section
          eyebrow="Architecture"
          title="สถาปัตยกรรมระบบ"
          subtitle="Expo Router สร้างทั้งเว็บและแอปจากโค้ดชุดเดียว API Routes เป็นตัวกลางระหว่างหน้าจอกับชั้นประมวลผล ส่วนข้อมูลมาจากหลายแหล่งที่กรุงเทพฯ มีอยู่แล้ว">
          <Architecture />
        </Section>

        <Section
          eyebrow="Preview"
          title="หน้าตาบนเว็บและมือถือ"
          subtitle="หน้าจอเดียวกันใช้ได้ทั้งบนเว็บและมือถือ ตัวอย่างด้านล่างเปลี่ยนตามช่วงเวลาที่เลือก">
          <Previews period={period} />
        </Section>
      </View>

      <Footer />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Green behind the hero, so iOS's top safe-area inset doesn't show a light strip.
  page: { flex: 1, backgroundColor: Brand.primary },
  light: { backgroundColor: Brand.page, paddingBottom: 96 },
  band: { backgroundColor: Brand.primary, overflow: 'hidden' },
});
