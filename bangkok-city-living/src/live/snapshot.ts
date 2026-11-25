import { advise } from './engine/advisor.ts';
import { classifyCauses } from './engine/causes.ts';
import { estimateCongestion, measuredCongestion } from './engine/congestion.ts';
import { bangkokDayStart, dayHours, forecastHours } from './engine/forecast.ts';
import { buildJams } from './engine/jams.ts';
import { buildTimelineItems } from './engine/timeline.ts';
import { bangkokHour, isBangkokWeekend, periodOf } from './time.ts';
import type {
    AirStation,
    CitizenReport,
    Corridor,
    FlowReading,
    Hotspot,
    HotspotStatus,
    LiveSnapshot,
    SourceStatus,
    TrafficEvent,
    WeatherHour,
    WeatherNow,
} from './types.ts';

export type SnapshotInput = {
  nowMs: number;
  hotspots: Hotspot[];
  events: TrafficEvent[];
  reports: CitizenReport[];
  air: AirStation[];
  weather: WeatherNow | null;
  /** Every hourly entry from the weather source, for the day timeline. */
  weatherHours: WeatherHour[];
  flows: Partial<Record<string, FlowReading>>;
  sources: SourceStatus[];
  trafficTiles: boolean;
  /** Directions of travel through the hotspots, along real roads. */
  corridors: Corridor[];
};

const REPORT_WINDOW_MS = 12 * 3600_000;

/** Runs every model over the normalized inputs. Pure: no I/O, no clock. */
export function buildSnapshot(i: SnapshotInput): LiveSnapshot {
  const weekend = isBangkokWeekend(i.nowMs);
  const reports = i.reports
    .filter((r) => r.reportedMs <= i.nowMs && r.reportedMs > i.nowMs - REPORT_WINDOW_MS)
    .sort((a, b) => b.reportedMs - a.reportedMs);
  const events = [...i.events].sort((a, b) => b.startMs - a.startMs);
  const signals = { nowMs: i.nowMs, weekend, rain: i.weather?.rain ?? 'none', events, reports } as const;

  const hotspots: HotspotStatus[] = i.hotspots.map((h) => {
    const flow = i.flows[h.id];
    return {
      ...h,
      congestion: flow ? measuredCongestion(flow) : estimateCongestion(h, signals),
      causes: classifyCauses(h, { ...signals, weather: i.weather }),
    };
  });

  const forecast = forecastHours(i.nowMs, weekend, i.weatherHours);
  return {
    generatedMs: i.nowMs,
    period: periodOf(bangkokHour(i.nowMs)),
    weekend,
    weather: i.weather,
    events,
    reports,
    air: i.air,
    hotspots,
    forecast,
    advice: advise(forecast, hotspots),
    jams: buildJams(i.corridors, hotspots, events, i.nowMs, weekend),
    timeline: {
      dayStartMs: bangkokDayStart(i.nowMs),
      hours: dayHours(i.nowMs, weekend, i.weatherHours),
      items: buildTimelineItems(i.nowMs, events, reports),
    },
    trafficTiles: i.trafficTiles,
    sources: i.sources,
  };
}
