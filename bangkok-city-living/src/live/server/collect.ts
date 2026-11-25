/**
 * Server-only: fetches every upstream source through its own cache and builds the snapshot.
 * Imported by the /api/live route; never bundled into the client.
 */
import { CORRIDORS } from '../corridors.ts';
import { HOTSPOTS } from '../hotspots.ts';
import { buildSnapshot } from '../snapshot.ts';
import { AIR4THAI_URL, normalizeAirStations } from '../sources/air4thai.ts';
import { ITIC_FEED_URL, normalizeIticEvents } from '../sources/itic.ts';
import { hourly, normalizeWeather, OPEN_METEO_URL } from '../sources/openmeteo.ts';
import { normalizeFlowSegment, tomtomFlowUrl } from '../sources/tomtom.ts';
import { normalizeTraffyReports, TRAFFY_URL } from '../sources/traffy.ts';
import { isObject } from '../sources/util.ts';
import type { FlowReading, LiveSnapshot, SourceId, SourceStatus } from '../types.ts';
import { createCachedSource, type CacheResult } from './cache.ts';
import { getJsonWithExtraCa, LETS_ENCRYPT_YR1_CHAIN } from './https-json.ts';

const USER_AGENT = 'BangkokCityLiving/1.0 (concept dashboard)';
/** How long a page request waits for slow sources before answering with what it has. */
const WAIT_MS = 6000;

const latency: Partial<Record<SourceId, number>> = {};

async function getJson(id: SourceId, url: string, timeoutMs: number): Promise<unknown> {
  const started = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    if (ctrl.signal.aborted) throw new Error(`หมดเวลา ${timeoutMs / 1000} วินาที`);
    throw e;
  } finally {
    clearTimeout(timer);
    latency[id] = Date.now() - started;
  }
}

function expect(ok: boolean) {
  if (!ok) throw new Error('รูปแบบข้อมูลไม่ตรงกับที่คาดไว้');
}

// Raw JSON is cached where normalizing depends on the current time.
const itic = createCachedSource({
  ttlMs: 60_000,
  load: async () => {
    const raw = await getJson('itic', ITIC_FEED_URL, 10_000);
    expect(Array.isArray(raw));
    return raw;
  },
});

const traffy = createCachedSource({
  ttlMs: 3 * 60_000,
  load: async () => {
    const raw = await getJson('traffy', TRAFFY_URL, 25_000);
    expect(isObject(raw) && Array.isArray(raw.results));
    return normalizeTraffyReports(raw);
  },
});

const air = createCachedSource({
  ttlMs: 10 * 60_000,
  load: async () => {
    const started = Date.now();
    let raw: unknown;
    try {
      raw = await getJsonWithExtraCa(AIR4THAI_URL, LETS_ENCRYPT_YR1_CHAIN, 20_000, { 'User-Agent': USER_AGENT, Accept: 'application/json' });
    } finally {
      latency.air4thai = Date.now() - started;
    }
    expect(isObject(raw) && Array.isArray(raw.stations));
    return normalizeAirStations(raw);
  },
});

const weather = createCachedSource({
  ttlMs: 10 * 60_000,
  load: async () => {
    const raw = await getJson('openmeteo', OPEN_METEO_URL, 10_000);
    expect(isObject(raw) && isObject(raw.current));
    return raw;
  },
});

let flows: ReturnType<typeof createCachedSource<Partial<Record<string, FlowReading>>>> | null = null;
let flowsKey: string | null = null;

/** TomTom is optional: it needs TOMTOM_API_KEY in the server environment (e.g. `.env.local`). */
function tomtomFlows(key: string) {
  if (!flows || flowsKey !== key) {
    flowsKey = key;
    flows = createCachedSource({
      // 9 junctions per refresh; 10 minutes keeps a busy day inside TomTom's free tier.
      ttlMs: 10 * 60_000,
      load: async () => {
        const settled = await Promise.allSettled(
          HOTSPOTS.map(async (h) => [h.id, normalizeFlowSegment(await getJson('tomtom', tomtomFlowUrl(h.at, key), 8000))] as const),
        );
        const ok = settled.flatMap((s) => (s.status === 'fulfilled' && s.value[1] ? [[s.value[0], s.value[1]] as const] : []));
        if (ok.length === 0) {
          const first = settled.find((s) => s.status === 'rejected');
          throw first && first.status === 'rejected' ? first.reason : new Error('ไม่มีข้อมูลความเร็ว');
        }
        return Object.fromEntries(ok);
      },
    });
  }
  return flows;
}

function status<T>(id: SourceId, r: CacheResult<T>, records: number): SourceStatus {
  return { id, state: r.state, records, fetchedMs: r.fetchedMs, latencyMs: latency[id] ?? null, error: r.error };
}

export async function getLiveSnapshot(nowMs: number): Promise<LiveSnapshot> {
  const key = process.env.TOMTOM_API_KEY?.trim() || null;
  const [i, t, a, w, f] = await Promise.all([
    itic.get(nowMs, WAIT_MS),
    traffy.get(nowMs, WAIT_MS),
    air.get(nowMs, WAIT_MS),
    weather.get(nowMs, WAIT_MS),
    key ? tomtomFlows(key).get(nowMs, WAIT_MS) : Promise.resolve(null),
  ]);

  const events = i.value ? normalizeIticEvents(i.value, nowMs) : [];
  const reports = t.value ?? [];
  const stations = a.value ?? [];
  const weatherNow = w.value ? normalizeWeather(w.value, nowMs) : null;
  const weatherHours = w.value && isObject(w.value) ? hourly(w.value.hourly) : [];
  const flowValues = f?.value ?? {};

  return buildSnapshot({
    nowMs,
    hotspots: HOTSPOTS,
    corridors: CORRIDORS,
    events,
    reports,
    air: stations,
    weather: weatherNow,
    weatherHours,
    flows: flowValues,
    // A rejected key would only produce broken tiles, so the layer waits for a working key.
    trafficTiles: key !== null && f?.state !== 'error',
    sources: [
      status('itic', i, events.length),
      status('traffy', t, reports.length),
      status('air4thai', a, stations.length),
      status('openmeteo', w, weatherHours.length),
      f
        ? status('tomtom', f, Object.keys(flowValues).length)
        : { id: 'tomtom', state: 'disabled', records: 0, fetchedMs: null, latencyMs: null, error: null },
    ],
  });
}
