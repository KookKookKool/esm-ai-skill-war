/**
 * Data models for the live Bangkok system. The server collector produces them, the models
 * read them, and the Explore screen renders them. Everything here must stay JSON-serializable.
 */

export type LatLon = { lat: number; lon: number };
/** GeoJSON-style [lon, lat] vertices along a road. */
export type Line = [number, number][];
export type Period = 'morning' | 'noon' | 'evening' | 'night';
export type CauseKey = 'rush' | 'rain' | 'accident' | 'construction' | 'junction' | 'event';
/** 0 = free flow (or very good air) ... 4 = gridlock (or unhealthy air). */
export type Level = 0 | 1 | 2 | 3 | 4;

// ---- Normalized source records -------------------------------------------------------------

export type EventKind = 'accident' | 'breakdown' | 'roadwork' | 'closure' | 'flood' | 'event' | 'fire' | 'jam' | 'other';

/** A traffic event reported by iTIC staff and partners, via the Longdo event feed. */
export type TrafficEvent = {
  id: string;
  kind: EventKind;
  title: string;
  detail: string;
  at: LatLon;
  startMs: number;
  endMs: number | null;
};

export type ReportCategory = 'flood' | 'traffic' | 'roadwork' | 'obstruction';

/** A citizen report from Traffy Fondue that is about roads, traffic or flooding. */
export type CitizenReport = {
  id: string;
  category: ReportCategory;
  text: string;
  district: string | null;
  at: LatLon;
  reportedMs: number;
  state: string;
};

/** An hourly PM2.5 reading from a Pollution Control Department (Air4Thai) station. */
export type AirStation = {
  id: string;
  name: string;
  at: LatLon;
  pm25: number;
  level: Level;
  measuredMs: number;
};

export type RainIntensity = 'none' | 'light' | 'heavy';
export type WeatherHour = { startMs: number; rainProbability: number; precipitationMm: number };

/** Current weather in central Bangkok (Open-Meteo) plus the next few hours. */
export type WeatherNow = {
  observedMs: number;
  temperatureC: number;
  precipitationMm: number;
  weatherCode: number;
  rain: RainIntensity;
  hours: WeatherHour[];
};

/** Measured speed on the road segment nearest a point (TomTom Flow Segment Data). */
export type FlowReading = {
  currentKmh: number;
  freeFlowKmh: number;
  confidence: number;
  roadClosed: boolean;
};

export type Hotspot = {
  id: string;
  name: string;
  at: LatLon;
  /** A sourced note when the junction is known to carry more traffic than it was built for. */
  overCapacity?: string;
};

// ---- Model outputs -------------------------------------------------------------------------

export type CongestionResult = {
  /** Extra travel time compared with free flow, in percent (TomTom's "congestion level"). */
  extraPct: number;
  /** extraPct mapped onto 0-100 so the level bands sit at 20/40/60/80. */
  index: number;
  level: Level;
  speedKmh: number;
  basis: 'measured' | 'estimated';
  confidence: number | null;
  /** Live signals that changed an estimate, for display. */
  adjustments: string[];
};

export type RankedCause = { cause: CauseKey; score: number; reasons: string[] };
export type CauseResult = { top: CauseKey; ranked: RankedCause[] };
export type HotspotStatus = Hotspot & { congestion: CongestionResult; causes: CauseResult };

export type ForecastHour = {
  startMs: number;
  extraPct: number;
  index: number;
  level: Level;
  rainProbability: number;
};

/** One direction of travel through a junction, along the real road (from OpenStreetMap via OSRM). */
export type Corridor = {
  id: string;
  hotspotId: string;
  road: string;
  direction: string;
  /** Heading towards central Bangkok: heavier in the morning, lighter in the evening. */
  inbound: boolean;
  line: Line;
  /** Distance along `line` where it passes through the junction. */
  junctionKm: number;
  /** Named places along the line, used to say where a jam starts and where it clears. */
  landmarks: { name: string; km: number }[];
};

/** A stretch of a corridor where traffic is queuing, and the stretch just after where it clears. */
export type JamSegment = {
  id: string;
  corridorId: string;
  hotspotId: string;
  road: string;
  direction: string;
  cause: CauseKey;
  level: Level;
  speedKmh: number;
  /** Extra minutes compared with driving the same stretch at free-flow speed. */
  delayMin: number;
  fromKm: number;
  toKm: number;
  fromName: string;
  toName: string;
  clearName: string;
  line: Line;
  clearLine: Line;
  basis: 'estimated' | 'measured' | 'event';
};

/** One hour of today's timeline. Past and future hours use the same model; `now` marks the current one. */
export type TimelineHour = ForecastHour & { past: boolean; now: boolean };

/** An event or report placed on today's timeline, clipped to 00:00-24:00 Bangkok time. */
export type TimelineItem = {
  id: string;
  source: 'itic' | 'traffy';
  kind: EventKind | ReportCategory;
  title: string;
  startMs: number;
  /** null for point-in-time reports. */
  endMs: number | null;
  fromEarlier: boolean;
  untilLater: boolean;
};

export type Advice = {
  nowIndex: number;
  best: ForecastHour;
  /** Travel time saved by leaving at `best` instead of now, in percent. */
  savingPct: number;
  tenKmMinutesNow: number;
  avoid: { id: string; name: string; index: number; cause: CauseKey }[];
};

// ---- Pipeline status -----------------------------------------------------------------------

export type SourceId = 'itic' | 'traffy' | 'air4thai' | 'openmeteo' | 'tomtom';
/** `loading`: first fetch still running. `stale`: latest fetch failed, showing the previous data. */
export type SourceState = 'ok' | 'loading' | 'stale' | 'error' | 'disabled';

export type SourceStatus = {
  id: SourceId;
  state: SourceState;
  /** Records the page uses from this source. */
  records: number;
  fetchedMs: number | null;
  /** How long the last upstream request took. */
  latencyMs: number | null;
  error: string | null;
};

export type LiveSnapshot = {
  generatedMs: number;
  period: Period;
  weekend: boolean;
  weather: WeatherNow | null;
  events: TrafficEvent[];
  reports: CitizenReport[];
  air: AirStation[];
  hotspots: HotspotStatus[];
  forecast: ForecastHour[];
  advice: Advice;
  jams: JamSegment[];
  timeline: { dayStartMs: number; hours: TimelineHour[]; items: TimelineItem[] };
  trafficTiles: boolean;
  sources: SourceStatus[];
};
