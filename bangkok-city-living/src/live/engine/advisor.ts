import type { Advice, ForecastHour, HotspotStatus } from '../types.ts';
import { tenKmMinutes } from './congestion.ts';

/** When to leave within the forecast window, and which junctions to stay away from now. */
export function advise(forecast: ForecastHour[], hotspots: HotspotStatus[]): Advice {
  const now = forecast[0];
  const best = forecast.reduce((a, b) => (b.extraPct < a.extraPct ? b : a), now);
  const savingPct = Math.round((1 - (1 + best.extraPct / 100) / (1 + now.extraPct / 100)) * 100);
  return {
    nowIndex: now.index,
    best,
    savingPct: Math.max(0, savingPct),
    tenKmMinutesNow: Math.round(tenKmMinutes(now.extraPct)),
    avoid: [...hotspots]
      .sort((a, b) => b.congestion.index - a.congestion.index)
      .slice(0, 3)
      .map((h) => ({ id: h.id, name: h.name, index: h.congestion.index, cause: h.causes.top })),
  };
}
