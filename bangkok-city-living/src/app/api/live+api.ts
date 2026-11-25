import { getLiveSnapshot } from '@/live/server/collect';

/** Everything the Explore page shows, from every source, with the models already run. */
export async function GET() {
  const snapshot = await getLiveSnapshot(Date.now());
  return Response.json(snapshot, { headers: { 'Cache-Control': 'no-store' } });
}
