// Pure iCal parsing + recurrence expansion. No Deno or network imports: the ical.js module is passed in so this file runs
// under Deno (index.ts) and under Node (local tests). Docs: docs/ARCHITECTURE.md "Calendar feeds".

// The slice of ical.js we use.
interface IcalTime { isDate: boolean; toJSDate(): Date; toString(): string; clone(): IcalTime; addDuration(duration: unknown): void; compare(other: IcalTime): number }
interface IcalComponent { getFirstPropertyValue(name: string): unknown; getAllSubcomponents(name: string): IcalComponent[] }
interface IcalDetails { recurrenceId: IcalTime; item: IcalEvent; startDate: IcalTime; endDate: IcalTime }
interface IcalExpansion { next(): IcalTime | undefined }
interface IcalEvent {
  uid: string; summary: string; location: string; startDate: IcalTime; endDate: IcalTime | null; component: IcalComponent;
  isRecurring(): boolean; isRecurrenceException(): boolean; relateException(exception: IcalEvent): void;
  getOccurrenceDetails(occurrence: IcalTime): IcalDetails; iterator(): IcalExpansion;
}
export interface IcalModule {
  parse(text: string): unknown;
  Component: new (jcal: unknown) => IcalComponent;
  Event: new (component: IcalComponent) => IcalEvent;
  Timezone: new (component: IcalComponent) => unknown;
  TimezoneService: { register(timezone: unknown): void; reset(): void };
  Duration: { fromSeconds(seconds: number): unknown };
}

// All-day events carry calendar dates, not instants: `startDate` / `endDate` (yyyy-MM-dd, end exclusive) are the truth and
// the client renders them on that calendar day in any timezone. `startAt` / `endAt` are those dates at 00:00 UTC (informational).
export interface FeedEvent {
  id: string; feedId: string; title: string; startAt: string; endAt: string; allDay: boolean;
  startDate?: string; endDate?: string; location?: string;
}

const MAX_OCCURRENCES = 10_000;
const DAY_MS = 86_400_000;

export function parseFeed(ICAL: IcalModule, feedId: string, text: string, from: Date, to: Date): FeedEvent[] {
  ICAL.TimezoneService.reset(); // zones are per feed; Google and Apple name the same TZID differently
  const root = new ICAL.Component(ICAL.parse(text));
  root.getAllSubcomponents('vtimezone').forEach((zone) => ICAL.TimezoneService.register(new ICAL.Timezone(zone)));

  // Group by UID so RECURRENCE-ID overrides attach to their series.
  const masters = new Map<string, IcalEvent>();
  const overrides = new Map<string, IcalEvent[]>();
  const standalone: IcalEvent[] = [];
  for (const component of root.getAllSubcomponents('vevent')) {
    const event = new ICAL.Event(component);
    if (!event.uid) continue;
    if (event.isRecurrenceException()) overrides.set(event.uid, [...(overrides.get(event.uid) ?? []), event]);
    else masters.set(event.uid, event);
  }
  for (const [uid, list] of overrides) {
    const master = masters.get(uid);
    if (master) list.forEach((exception) => master.relateException(exception));
    else standalone.push(...list); // override without its series (e.g. a single invited occurrence)
  }

  const out: FeedEvent[] = [];
  const emit = (uid: string, occurrence: IcalTime, event: IcalEvent, start: IcalTime, end: IcalTime | null) => {
    if (String(event.component.getFirstPropertyValue('status') ?? '').toUpperCase() === 'CANCELLED') return;
    const allDay = start.isDate;
    const title = event.summary?.trim() || '(No title)';
    const location = event.location?.trim() || undefined;
    if (allDay) {
      const startDate = start.toString();
      let endDate = end && end.compare(start) > 0 ? end.toString() : plusDays(startDate, 1);
      if (endDate <= startDate) endDate = plusDays(startDate, 1);
      const startAt = `${startDate}T00:00:00.000Z`;
      const endAt = `${endDate}T00:00:00.000Z`;
      if (Date.parse(startAt) >= to.getTime() + DAY_MS || Date.parse(endAt) <= from.getTime() - DAY_MS) return;
      out.push({ id: `${feedId}:${uid}:${occurrence.toString()}`, feedId, title, startAt, endAt, allDay, startDate, endDate, location });
      return;
    }
    const startMs = start.toJSDate().getTime();
    const endMs = end && end.toJSDate().getTime() > startMs ? end.toJSDate().getTime() : startMs + 3_600_000;
    if (startMs >= to.getTime() || endMs <= from.getTime()) return;
    out.push({ id: `${feedId}:${uid}:${occurrence.toJSDate().toISOString()}`, feedId, title, startAt: new Date(startMs).toISOString(), endAt: new Date(endMs).toISOString(), allDay, location });
  };

  for (const [uid, event] of masters) {
    if (!event.isRecurring()) { emit(uid, event.startDate, event, event.startDate, event.endDate); continue; }
    const iterator = event.iterator(); // honours RRULE, RDATE and EXDATE
    for (let i = 0, next = iterator.next(); next && i < MAX_OCCURRENCES; i += 1, next = iterator.next()) {
      // Original slot far past the window cannot land inside it (overrides move by days, not months).
      if (next.toJSDate().getTime() > to.getTime() + 30 * DAY_MS) break;
      const detail = event.getOccurrenceDetails(next);
      emit(uid, detail.recurrenceId, detail.item, detail.startDate, detail.endDate);
    }
  }
  for (const event of standalone) emit(event.uid, event.startDate, event, event.startDate, event.endDate);

  return out.sort((a, b) => a.startAt.localeCompare(b.startAt) || a.id.localeCompare(b.id));
}

function plusDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00.000Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

// --- feed URL safety (shared logic is duplicated client-side in src/calendar/feedUrl.ts; keep them in sync) ---
const HOSTS = ['calendar.google.com', 'outlook.office365.com', 'outlook.live.com'];
export const isAllowedHost = (host: string) => HOSTS.includes(host) || host.endsWith('.icloud.com');

// webcal:// -> https://, https only, allowlisted host, no credentials or custom port. Throws with a user-facing message.
export function normalizeFeedUrl(raw: string): string {
  const trimmed = raw.trim().replace(/^webcals?:\/\//i, 'https://');
  let url: URL;
  try { url = new URL(trimmed); } catch { throw new Error('Not a valid URL.'); }
  if (url.protocol !== 'https:') throw new Error('Calendar URLs must use https or webcal.');
  if (url.username || url.password || (url.port && url.port !== '443')) throw new Error('Calendar URL not allowed.');
  if (!isAllowedHost(url.hostname.toLowerCase())) throw new Error('Only Google, iCloud, and Outlook calendar links are supported.');
  return url.toString();
}
