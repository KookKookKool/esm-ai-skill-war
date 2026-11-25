export type CacheResult<T> = {
  value: T | null;
  state: 'ok' | 'loading' | 'stale' | 'error';
  /** When the cached value was fetched; null until the first success. */
  fetchedMs: number | null;
  error: string | null;
};

function message(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

/**
 * Caches one upstream source. Keeps serving the last good value when a refresh fails, shares
 * a single in-flight load between concurrent requests, and can stop waiting after `waitMs`
 * while the load carries on in the background.
 */
export function createCachedSource<T>({ ttlMs, load }: { ttlMs: number; load: () => Promise<T> }) {
  let value: T | null = null;
  let fetchedMs: number | null = null;
  let error: string | null = null;
  let inflight: Promise<void> | null = null;

  const result = (): CacheResult<T> => ({
    value,
    fetchedMs,
    error,
    state: value !== null ? (error ? 'stale' : 'ok') : inflight ? 'loading' : 'error',
  });

  return {
    async get(nowMs: number, waitMs = Infinity): Promise<CacheResult<T>> {
      if (fetchedMs !== null && nowMs - fetchedMs < ttlMs) return result();
      if (!inflight) {
        inflight = load().then(
          (v) => {
            value = v;
            fetchedMs = nowMs;
            error = null;
            inflight = null;
          },
          (e) => {
            error = message(e);
            inflight = null;
          },
        );
      }
      if (!Number.isFinite(waitMs)) {
        await inflight;
        return result();
      }
      let timer: ReturnType<typeof setTimeout> | undefined;
      await Promise.race([inflight, new Promise<void>((r) => (timer = setTimeout(r, waitMs)))]);
      clearTimeout(timer);
      return result();
    },
  };
}
