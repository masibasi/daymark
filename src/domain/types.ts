import type { CategoryColorKey } from '../theme/categoryColors';

/** ISO date, no time: "2026-09-18" */
export type ISODate = string;
/** ISO datetime: "2026-09-18T14:00:00" */
export type ISODateTime = string;

export interface Category {
  id: string;
  name: string;
  color: CategoryColorKey;
  order: number;
}

export type ProjectStatus = 'active' | 'done' | 'archived';

export interface Project {
  id: string;
  title: string;
  categoryId: string;
  deadline: ISODate;
  status: ProjectStatus;
  notes?: string;
}

export interface Task {
  id: string;
  title: string;
  categoryId: string;
  /** Set => this task is a subtask of that project. */
  projectId?: string;
  /** Set => this task is on the Today list for that date. */
  scheduledDate?: ISODate;
  /** Set => this task was completed at this instant. Cleared on uncomplete. */
  completedAt?: ISODateTime;
  order: number;
  /** V0 recurrence: a simple daily-routine flag, not a rule engine. */
  recurrence?: 'daily';
}

export interface ExternalRef {
  provider: 'google' | 'mock';
  eventId: string;
}

export interface TimeBlock {
  id: string;
  taskId: string;
  start: ISODateTime;
  end: ISODateTime;
  externalRef?: ExternalRef;
}

export interface CalendarEventSource {
  provider: 'google' | 'mock';
  calendarId: string;
  eventId: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: ISODateTime;
  end: ISODateTime;
  allDay: boolean;
  source: CalendarEventSource;
  /** Hex color for the event's source calendar (not a category color). */
  color: string;
}

export type DeadlineUrgencyTier = 'far' | 'week' | 'soon' | 'urgent';

export interface DayMarkSegment {
  categoryId: string;
  /** Fraction (0..1) of the ring's circumference this segment occupies. */
  share: number;
  /** Fraction (0..1) of this segment that is filled (done/total). */
  fill: number;
  total: number;
  done: number;
}

export type CalendarViewMode = 'week' | 'month';
