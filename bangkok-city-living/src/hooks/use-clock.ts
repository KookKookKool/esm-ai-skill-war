import { useSyncExternalStore } from 'react';

let now = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(onTick: () => void) {
  listeners.add(onTick);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((l) => l());
    }, 1000);
  }
  return () => {
    listeners.delete(onTick);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

/** The current time, ticking once a second. `null` while server rendering and hydrating. */
export function useClock(): number | null {
  return useSyncExternalStore(
    subscribe,
    () => now,
    () => null,
  );
}
