import type { CalendarEvent } from '@/domain/types';
import type { CalendarProvider } from './CalendarProvider';

export class MockCalendarProvider implements CalendarProvider {
  constructor(private readonly events: CalendarEvent[]) {}

  async listEvents(startAt: string, endAt: string): Promise<CalendarEvent[]> {
    return this.events.filter((event) => event.startAt < endAt && event.endAt > startAt);
  }
}

