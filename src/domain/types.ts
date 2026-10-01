import type { CategoryColorKey } from '@/theme/tokens';

export type ISODate = string;
export type ISODateTime = string;
export type CategoryId = string;

export interface Category {
  id: CategoryId;
  name: string;
  colorKey: CategoryColorKey;
  order: number;
  archived?: boolean;
}

// A one-tap template: tapping it creates a normal Task for the displayed day. Never auto-generated.
export interface Routine {
  id: string;
  title: string;
  categoryId: CategoryId;
  order: number;
}

export interface Project {
  id: string;
  title: string;
  categoryId: CategoryId;
  deadline: ISODate;
  status: 'active' | 'done' | 'archived';
  notes?: string;
  attentionDays?: number;
}

export interface Task {
  id: string;
  title: string;
  categoryId: CategoryId;
  projectId?: string;
  scheduledDate?: ISODate;
  completedAt?: ISODateTime;
  routineId?: string;
  // Set only when the user explicitly chose "Add to Today" on a CalendarEvent. Never set automatically.
  sourceEventId?: string;
  // Position within its list on its scheduled day (0-based). Unordered tasks sort first, in array order.
  order?: number;
}

export interface TimeBlock {
  id: string;
  taskId: string;
  startAt: ISODateTime;
  endAt: ISODateTime;
  externalCalendarEventId?: string;
}

export interface CalendarEvent {
  id: string;
  provider: 'mock' | 'google' | 'ics';
  externalId: string;
  // Which CalendarFeed produced it (ics only).
  feedId?: string;
  location?: string;
  title: string;
  startAt: ISODateTime;
  endAt: ISODateTime;
  allDay: boolean;
  colorKey?: 'event';
}

// A read-only iCal feed the owner pasted in Settings. Synced as the `calendarFeeds` preference row; the URL is a secret.
export interface CalendarFeed {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  colorHint?: string;
}

export type CalendarView = 'week' | 'month';

export type DayMarkVariant = 'ribbon' | 'glass' | 'wash' | 'current';
