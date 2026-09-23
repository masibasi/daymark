import type { CalendarEvent } from '@/domain/types';

export interface CalendarProvider {
  listEvents(startAt: string, endAt: string): Promise<CalendarEvent[]>;
}

