import type { CalendarEvent, ISODateTime, TimeBlock } from '../domain/types';

export interface DateRange {
  start: ISODateTime;
  end: ISODateTime;
}

/**
 * Abstraction over "a source of calendar events." V0 ships exactly one
 * implementation, MockCalendarProvider. A future GoogleCalendarProvider (see
 * docs/ROADMAP.md "Later") implements the same four methods so screens and
 * selectors never need to change when real sync arrives.
 */
export interface CalendarProvider {
  listEvents(range: DateRange): CalendarEvent[];
  createEvent(block: TimeBlock): CalendarEvent;
  updateEvent(eventId: string, patch: Partial<CalendarEvent>): void;
  deleteEvent(eventId: string): void;
}
