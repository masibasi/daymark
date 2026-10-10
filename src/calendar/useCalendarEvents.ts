import { useEffect, useMemo } from 'react';
import { AppState, Platform } from 'react-native';
import { useDaymarkStore } from '@/store/useDaymarkStore';
import { useSyncStatus } from '@/sync/syncStore';
import { IcsCalendarProvider } from './IcsCalendarProvider';
import { t } from '@/i18n';

const REFRESH_MS = 15 * 60_000;
const MIN_GAP_MS = 30_000; // focus/visibility bursts must not hammer the function
let inFlight = false;
let lastKey = '';
let lastAt = 0;
let queued: { from: string; to: string } | undefined;

// Fetch the owner's iCal feeds for [from, to) into store.events. Signed out or no enabled feeds: does nothing (no network).
async function load(from: string, to: string, force: boolean) {
  const { calendarFeeds, applyFeedEvents } = useDaymarkStore.getState();
  if (useSyncStatus.getState().status === 'signedOut') return;
  const enabled = calendarFeeds.filter((feed) => feed.enabled);
  if (!enabled.length) return;
  if (inFlight) { queued = { from, to }; return; } // run once the current request finishes
  const key = `${from}|${to}|${enabled.map((feed) => `${feed.id}:${feed.url}`).join(',')}`;
  if (!force && key === lastKey && Date.now() - lastAt < MIN_GAP_MS) return;
  inFlight = true;
  try {
    const { events, errors } = await new IcsCalendarProvider(enabled).listEvents(from, to);
    applyFeedEvents(enabled.map((feed) => feed.id), from, to, events, Object.fromEntries(errors.map((error) => [error.feedId, error.message])));
    lastKey = key;
    lastAt = Date.now();
  } catch {
    // Keep the last events; surface a generic per-feed message in Settings.
    applyFeedEvents([], from, to, [], Object.fromEntries(enabled.map((feed) => [feed.id, t().settings.calendars.unreachable])));
  } finally {
    inFlight = false;
    const next = queued;
    queued = undefined;
    if (next) void load(next.from, next.to, false);
  }
}

// Keep events fresh for the window the screen shows. Refreshes on window/feeds/sign-in change, app focus, and every 15 min while visible.
export function useCalendarEvents(windowStart: Date, windowEnd: Date) {
  const feeds = useDaymarkStore((state) => state.calendarFeeds);
  const status = useSyncStatus((state) => state.status);
  const from = windowStart.toISOString();
  const to = windowEnd.toISOString();
  const feedKey = useMemo(() => feeds.filter((feed) => feed.enabled).map((feed) => `${feed.id}:${feed.url}`).join(','), [feeds]);

  useEffect(() => { void load(from, to, false); }, [from, to, feedKey, status === 'signedOut']);

  useEffect(() => {
    const refresh = () => { void load(from, to, false); };
    const visible = () => Platform.OS !== 'web' || document.visibilityState === 'visible';
    const timer = setInterval(() => { if (visible()) void load(from, to, true); }, REFRESH_MS);
    if (Platform.OS === 'web') {
      document.addEventListener('visibilitychange', refresh);
      window.addEventListener('focus', refresh);
      return () => { clearInterval(timer); document.removeEventListener('visibilitychange', refresh); window.removeEventListener('focus', refresh); };
    }
    const subscription = AppState.addEventListener('change', (next) => { if (next === 'active') refresh(); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, [from, to]);
}
