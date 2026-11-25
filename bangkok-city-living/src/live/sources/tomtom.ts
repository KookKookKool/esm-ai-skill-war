import { BANGKOK_BBOX } from '../geo.ts';
import type { FlowReading, LatLon } from '../types.ts';
import { isObject, num } from './util.ts';

/** Speed on the road segment nearest `at` (TomTom Traffic API, Flow Segment Data v4). */
export function tomtomFlowUrl(at: LatLon, key: string) {
  const url = new URL('https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json');
  url.searchParams.set('point', `${at.lat},${at.lon}`);
  url.searchParams.set('key', key);
  return url.toString();
}

export type Tile = { z: number; x: number; y: number };

/** Raster flow tile, coloured by speed relative to free flow, styled for dark basemaps. */
export function tomtomTileUrl({ z, x, y }: Tile, key: string) {
  const url = new URL(`https://api.tomtom.com/traffic/map/4/tile/flow/relative0-dark/${z}/${x}/${y}.png`);
  url.searchParams.set('key', key);
  url.searchParams.set('tileSize', '256');
  return url.toString();
}

export function normalizeFlowSegment(raw: unknown): FlowReading | null {
  if (!isObject(raw) || !isObject(raw.flowSegmentData)) return null;
  const f = raw.flowSegmentData;
  const currentKmh = num(f.currentSpeed);
  const freeFlowKmh = num(f.freeFlowSpeed);
  if (currentKmh === null || freeFlowKmh === null || freeFlowKmh <= 0) return null;
  return { currentKmh, freeFlowKmh, confidence: num(f.confidence) ?? 0, roadClosed: f.roadClosure === true };
}

const INT = /^\d+$/;
export const TILE_MIN_ZOOM = 9;
export const TILE_MAX_ZOOM = 18;

/** Validate the z/x/y of a tile request before anything is sent to TomTom. */
export function parseTileParams(params: Record<string, string | undefined>): Tile | null {
  const { z, x, y } = params;
  if (!z || !x || !y || !INT.test(z) || !INT.test(x) || !INT.test(y)) return null;
  const tile = { z: +z, x: +x, y: +y };
  const size = 2 ** tile.z;
  if (tile.z < TILE_MIN_ZOOM || tile.z > TILE_MAX_ZOOM || tile.x >= size || tile.y >= size) return null;
  return tile;
}

function tileLon(x: number, z: number) {
  return (x / 2 ** z) * 360 - 180;
}

function tileLat(y: number, z: number) {
  const n = Math.PI - (2 * Math.PI * y) / 2 ** z;
  return (180 / Math.PI) * Math.atan(Math.sinh(n));
}

/** The proxy only serves Bangkok, so it can't be used as a free worldwide TomTom relay. */
export function tileInBangkok({ z, x, y }: Tile) {
  const west = tileLon(x, z);
  const east = tileLon(x + 1, z);
  const north = tileLat(y, z);
  const south = tileLat(y + 1, z);
  const b = BANGKOK_BBOX;
  return east >= b.west && west <= b.east && north >= b.south && south <= b.north;
}
