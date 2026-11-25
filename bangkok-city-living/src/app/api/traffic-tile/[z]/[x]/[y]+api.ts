import { parseTileParams, tileInBangkok, tomtomTileUrl } from '@/live/sources/tomtom';

/**
 * Relays TomTom traffic-flow tiles so the API key stays on the server.
 * Only Bangkok tiles at zoom 9-18 are served.
 */
export async function GET(_request: Request, params: Record<string, string>) {
  const key = process.env.TOMTOM_API_KEY?.trim();
  if (!key) return Response.json({ error: 'TOMTOM_API_KEY is not set' }, { status: 404 });

  const tile = parseTileParams(params);
  if (!tile || !tileInBangkok(tile)) return Response.json({ error: 'Invalid tile or outside Bangkok' }, { status: 400 });

  const upstream = await fetch(tomtomTileUrl(tile, key));
  if (!upstream.ok) return Response.json({ error: `TomTom responded ${upstream.status}` }, { status: 502 });

  return new Response(await upstream.arrayBuffer(), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=120' },
  });
}
