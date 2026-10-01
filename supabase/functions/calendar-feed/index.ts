// Deno Edge Function: fetch iCal feeds server-side (browsers cannot, CORS) and return normalized events for a date range.
// Deploy: npx supabase functions deploy calendar-feed --project-ref ojsmbjerdquvtffqrxlq  (JWT verification stays on).
import ICAL from 'npm:ical.js@2.2.1';
import { normalizeFeedUrl, parseFeed, type FeedEvent, type IcalModule } from './parse.ts';

const ORIGINS = ['https://masibasi.github.io', 'http://localhost:8081'];
const MAX_FEEDS = 10;
const MAX_RANGE_MS = 62 * 86_400_000;
const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;

interface FeedRequest { feeds?: { id?: unknown; url?: unknown }[]; from?: unknown; to?: unknown }

const corsFor = (request: Request): Record<string, string> => {
  const origin = request.headers.get('origin') ?? '';
  return {
    'Access-Control-Allow-Origin': ORIGINS.includes(origin) ? origin : ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
};

const reply = (request: Request, status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...corsFor(request), 'Content-Type': 'application/json' } });

// Each redirect hop is re-validated against the allowlist so an allowed host cannot bounce us to an internal address.
async function fetchFeed(rawUrl: string, signal: AbortSignal): Promise<string> {
  let url = normalizeFeedUrl(rawUrl);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const response = await fetch(url, { signal, redirect: 'manual', headers: { Accept: 'text/calendar, text/plain, */*', 'User-Agent': 'Daymark/0 (calendar-feed)' } });
    const location = response.headers.get('location');
    if (response.status >= 300 && response.status < 400 && location) { url = normalizeFeedUrl(new URL(location, url).toString()); continue; }
    if (!response.ok) throw new Error(`Calendar server answered ${response.status}.`);
    if (Number(response.headers.get('content-length') ?? 0) > MAX_BYTES) throw new Error('Calendar is too large.');
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Empty response.');
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) { await reader.cancel(); throw new Error('Calendar is too large.'); }
      chunks.push(value);
    }
    return new TextDecoder().decode(await new Blob(chunks).arrayBuffer());
  }
  throw new Error('Too many redirects.');
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsFor(request) });
  if (request.method !== 'POST') return reply(request, 405, { error: 'POST only.' });
  if (!request.headers.get('authorization')) return reply(request, 401, { error: 'Sign in required.' });

  let input: FeedRequest;
  try { input = await request.json() as FeedRequest; } catch { return reply(request, 400, { error: 'Invalid JSON.' }); }
  const from = new Date(String(input.from));
  const to = new Date(String(input.to));
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) return reply(request, 400, { error: 'Invalid date range.' });
  if (to.getTime() - from.getTime() > MAX_RANGE_MS) return reply(request, 400, { error: 'Range is limited to 62 days.' });
  const feeds = Array.isArray(input.feeds) ? input.feeds : [];
  if (feeds.length > MAX_FEEDS) return reply(request, 400, { error: `At most ${MAX_FEEDS} calendars per request.` });

  const events: FeedEvent[] = [];
  const errors: { feedId: string; message: string }[] = [];
  await Promise.all(feeds.map(async (feed) => {
    const feedId = typeof feed.id === 'string' ? feed.id : '';
    if (!feedId || typeof feed.url !== 'string') { errors.push({ feedId, message: 'Invalid feed.' }); return; }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const text = await fetchFeed(feed.url, controller.signal);
      events.push(...parseFeed(ICAL as unknown as IcalModule, feedId, text, from, to));
    } catch (error) {
      errors.push({ feedId, message: controller.signal.aborted ? 'Calendar took too long to respond.' : error instanceof Error ? error.message : 'Could not read calendar.' });
    } finally { clearTimeout(timer); }
  }));
  return reply(request, 200, { events, errors });
});
