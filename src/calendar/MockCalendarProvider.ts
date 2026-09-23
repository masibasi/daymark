import type { CalendarEvent, TimeBlock } from '../domain/types';
import { calendarEvents as seedEvents } from '../store/mockData';
import type { CalendarProvider, DateRange } from './CalendarProvider';

/**
 * In-memory CalendarProvider backed by the seeded mock event array. This is
 * V0's only provider — see docs/ARCHITECTURE.md "Calendar provider
 * abstraction" for why the interface exists even though there's one impl.
 */
export class MockCalendarProvider implements CalendarProvider {
  private events: CalendarEvent[] = [...seedEvents];

  listEvents(range: DateRange): CalendarEvent[] {
    return this.events.filter((e) => e.start < range.end && e.end > range.start);
  }

  createEvent(block: TimeBlock): CalendarEvent {
    const event: CalendarEvent = {
      id: `evt-from-${block.id}`,
      title: 'Scheduled task',
      start: block.start,
      end: block.end,
      allDay: false,
      color: '#5B8DEF',
      source: { provider: 'mock', calendarId: 'daymark', eventId: block.id },
    };
    this.events.push(event);
    return event;
  }

  updateEvent(eventId: string, patch: Partial<CalendarEvent>): void {
    this.events = this.events.map((e) => (e.id === eventId ? { ...e, ...patch } : e));
  }

  deleteEvent(eventId: string): void {
    this.events = this.events.filter((e) => e.id !== eventId);
  }
}

export const mockCalendarProvider = new MockCalendarProvider();
