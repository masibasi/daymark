import { parseISO } from 'date-fns';
import type { CalendarEvent, CalendarFeed } from '@/domain/types';
import { getClient } from '@/sync/client';
import type { CalendarListing, CalendarProvider } from './CalendarProvider';

// What the calendar-feed Edge Function returns (supabase/functions/calendar-feed/parse.ts FeedEvent).
interface FeedEventDto {
  id: string; feedId: string; title: string; startAt: string; endAt: string; allDay: boolean;
  startDate?: string; endDate?: string; location?: string;
}
interface FeedResponse { events: FeedEventDto[]; errors: { feedId: string; message: string }[] }

// All-day events arrive as calendar dates (end exclusive); anchor them at LOCAL midnight so they land on the same day for any viewer.
const toEvent = (dto: FeedEventDto): CalendarEvent => {
  const allDay = dto.allDay && dto.startDate && dto.endDate;
  return {
    id: dto.id, provider: 'ics', externalId: dto.id, feedId: dto.feedId, title: dto.title, allDay: Boolean(allDay), colorKey: 'event', location: dto.location,
    startAt: allDay ? parseISO(dto.startDate!).toISOString() : dto.startAt,
    endAt: allDay ? parseISO(dto.endDate!).toISOString() : dto.endAt,
  };
};

// Reads the owner's iCal feeds through the Supabase Edge Function (needs a signed-in session). Never writes anywhere.
export class IcsCalendarProvider implements CalendarProvider {
  constructor(private readonly feeds: CalendarFeed[]) {}

  async listEvents(startAt: string, endAt: string): Promise<CalendarListing> {
    const feeds = this.feeds.filter((feed) => feed.enabled).map(({ id, url }) => ({ id, url }));
    if (!feeds.length) return { events: [], errors: [] };
    const { data, error } = await getClient().functions.invoke<FeedResponse>('calendar-feed', { body: { feeds, from: startAt, to: endAt } });
    if (error || !data) throw new Error(error?.message ?? 'Could not reach the calendar service.');
    return { events: data.events.map(toEvent), errors: data.errors };
  }
}
