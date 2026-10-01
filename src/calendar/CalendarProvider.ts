import type { CalendarEvent } from '@/domain/types';

export interface CalendarFeedError { feedId: string; message: string }
export interface CalendarListing { events: CalendarEvent[]; errors: CalendarFeedError[] }

// Read-only: Daymark never writes to calendars. Screens never import a concrete provider (see loadCalendarEvents).
export interface CalendarProvider {
  listEvents(startAt: string, endAt: string): Promise<CalendarListing>;
}
