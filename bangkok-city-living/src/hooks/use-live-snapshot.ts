import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import type { LiveSnapshot, SourceId } from '@/live/types';

/** Normal refresh. The server caches each source, so this never hits upstream more often than they allow. */
export const REFRESH_MS = 60_000;
/** Sooner while a slow source (usually Traffy) is still on its first load. */
const PENDING_MS = 8_000;
const ERROR_MS = 15_000;

/** One successful refresh, shown on the live timeline so the polling itself is visible. */
export type RefreshEntry = { ms: number; ready: number; events: number; reports: number; hotspots: number };

export type LiveState = {
  data: LiveSnapshot | null;
  error: string | null;
  /** When the app last received a snapshot. */
  receivedMs: number | null;
  nextMs: number | null;
  /** Event and report ids that were not in any earlier snapshot this session. */
  fresh: ReadonlySet<string>;
  history: RefreshEntry[];
  refreshing: boolean;
  refresh: () => void;
};

export function useLiveSnapshot(): LiveState {
  const [data, setData] = useState<LiveSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [receivedMs, setReceivedMs] = useState<number | null>(null);
  const [nextMs, setNextMs] = useState<number | null>(null);
  const [fresh, setFresh] = useState<ReadonlySet<string>>(() => new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState<RefreshEntry[]>([]);
  const seen = useRef<Set<string> | null>(null);
  /** Sources that had data last time: items from a source that only just loaded aren't "new". */
  const hadData = useRef<Set<SourceId>>(new Set());

  /** Fetches once and returns how long to wait before the next fetch. */
  const fetchOnce = useCallback(async () => {
    try {
      const res = await fetch('/api/live');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const snapshot = (await res.json()) as LiveSnapshot;
      const eventIds = snapshot.events.map((e) => e.id);
      const reportIds = snapshot.reports.map((r) => r.id);
      const before = seen.current;
      const candidates = [...(hadData.current.has('itic') ? eventIds : []), ...(hadData.current.has('traffy') ? reportIds : [])];
      setFresh(before ? new Set(candidates.filter((id) => !before.has(id))) : new Set());
      seen.current = new Set([...(before ?? []), ...eventIds, ...reportIds]);
      hadData.current = new Set(snapshot.sources.filter((s) => s.state === 'ok' || s.state === 'stale').map((s) => s.id));
      setData(snapshot);
      setHistory((h) =>
        [
          {
            ms: snapshot.generatedMs,
            ready: snapshot.sources.filter((x) => x.state === 'ok').length,
            events: snapshot.events.length,
            reports: snapshot.reports.length,
            hotspots: snapshot.hotspots.length,
          },
          ...h.filter((x) => x.ms !== snapshot.generatedMs),
        ].slice(0, 8),
      );
      setError(null);
      setReceivedMs(Date.now());
      return snapshot.sources.some((s) => s.state === 'loading') ? PENDING_MS : REFRESH_MS;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return ERROR_MS;
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Poll only while the screen is focused.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const run = async () => {
        const wait = await fetchOnce();
        if (cancelled) return;
        setNextMs(Date.now() + wait);
        timer = setTimeout(run, wait);
      };
      run();
      return () => {
        cancelled = true;
        if (timer) clearTimeout(timer);
      };
    }, [fetchOnce]),
  );

  const refresh = useCallback(() => {
    setRefreshing(true);
    void fetchOnce();
  }, [fetchOnce]);

  return { data, error, receivedMs, nextMs, fresh, history, refreshing, refresh };
}
