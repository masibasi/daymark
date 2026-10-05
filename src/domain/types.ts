import type { CategoryColorKey } from '@/theme/tokens';

export type ISODate = string;
export type ISODateTime = string;
export type CategoryId = string;

export interface Category {
  id: CategoryId;
  name: string;
  colorKey: CategoryColorKey;
  // Optional custom list color (hex). When present it wins over the colorKey preset; absent on every list made before custom colors.
  color?: string;
  order: number;
  archived?: boolean;
}

// A one-tap template: tapping it creates a normal Task for the displayed day. Never auto-generated.
// Missing `repeat` means daily. weekdays use 0 = Sunday .. 6 = Saturday.
export type RoutineRepeat = { kind: 'daily' } | { kind: 'weekdays'; days: number[] } | { kind: 'perWeek'; times: number };

export interface Routine {
  id: string;
  title: string;
  categoryId: CategoryId;
  order: number;
  repeat?: RoutineRepeat;
}

export interface Project {
  id: string;
  title: string;
  categoryId: CategoryId;
  // Optional: a Folder may or may not have a deadline.
  deadline?: ISODate;
  status: 'active' | 'done' | 'archived';
  notes?: string;
  attentionDays?: number;
  // Pinned folders show on Today even without a deadline.
  pinned?: boolean;
  // Manual position within its group (pinned, or undated); dated folders sort by deadline instead.
  order?: number;
  archivedAt?: ISODateTime;
  // Set by "Keep" on the all-steps-done prompt; cleared when a new step is added.
  completionAcknowledged?: boolean;
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
  // Past days this task was left incomplete on before being moved off (the day keeps showing it as planned, not done).
  missedOn?: ISODate[];
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

export type DayMarkVariant = 'ribbon' | 'glass' | 'wash' | 'current' | 'doodle' | 'custom';

// A user-drawn Day Mark ("Custom (beta)"): normalized unit-box strokes in drawing order (closed strokes repeat the first point last). Synced as a preference row.
// `points`/`closed` are the first stroke, kept so older app versions still read something; `strokes` is the full drawing (absent on older saves).
export interface CustomMark {
  points: [number, number][];
  closed: boolean;
  strokes?: Array<{ points: [number, number][]; closed: boolean }>;
  updatedAt: string;
}
