import { addMinutes, differenceInCalendarDays, format, getMinutes, isSameDay, parseISO, setHours, setMilliseconds, setMinutes, setSeconds, startOfDay } from 'date-fns';
import type { CalendarEvent, Category, CategoryId, Project, Task, TimeBlock } from './types';

export interface DayOrbitSegment {
  categoryId: CategoryId;
  share: number;
  completion: number;
}

export function selectTodayTasks(tasks: Task[], date: Date): Task[] {
  const key = format(date, 'yyyy-MM-dd');
  return tasks.filter((task) => task.scheduledDate === key);
}

export function selectTasksByCategory(tasks: Task[], categories: Category[]): Array<{ category: Category; tasks: Task[] }> {
  return categories
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((category) => ({ category, tasks: tasks.filter((task) => task.categoryId === category.id) }))
    .filter((group) => group.tasks.length > 0);
}

export function selectProjectTasks(tasks: Task[], projectId: string): Task[] {
  return tasks.filter((task) => task.projectId === projectId);
}

export function selectProjectProgress(tasks: Task[], projectId: string): { completed: number; total: number } {
  const projectTasks = selectProjectTasks(tasks, projectId);
  return { completed: projectTasks.filter((task) => Boolean(task.completedAt)).length, total: projectTasks.length };
}

export function selectUpcomingProjects(projects: Project[], now: Date, limit = 3): Project[] {
  return projects
    .filter((project) => project.status === 'active' && differenceInCalendarDays(parseISO(project.deadline), startOfDay(now)) >= 0)
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, limit);
}

export function selectDeadlineDays(deadline: string, now: Date): number {
  return differenceInCalendarDays(parseISO(deadline), startOfDay(now));
}

export function selectDeadlineTone(days: number, attentionDays = 7): 'muted' | 'normal' | 'warm' | 'urgent' {
  if (days <= 1) return 'urgent';
  if (days <= 3) return 'warm';
  if (days <= attentionDays) return 'normal';
  return 'muted';
}

export function selectDayOrbit(tasks: Task[], day: Date): DayOrbitSegment[] {
  const relevant = tasks.filter((task) => task.scheduledDate === format(day, 'yyyy-MM-dd'));
  if (relevant.length === 0) return [];
  const ids: CategoryId[] = ['study', 'career', 'personal', 'routine'];
  return ids.flatMap((categoryId) => {
    const categoryTasks = relevant.filter((task) => task.categoryId === categoryId);
    if (categoryTasks.length === 0) return [];
    const completed = categoryTasks.filter((task) => task.completedAt && isSameDay(parseISO(task.completedAt), day)).length;
    return [{ categoryId, share: categoryTasks.length / relevant.length, completion: completed / categoryTasks.length }];
  });
}

export function selectCompletedCountOnDay(tasks: Task[], day: Date): number {
  return tasks.filter((task) => task.completedAt && isSameDay(parseISO(task.completedAt), day)).length;
}

// --- Today time rail / reserve-time interaction study ---
// See docs/DECISIONS.md "Today scheduling needs an interaction study" and
// docs/ROADMAP.md V0.2 "compact Today free-time preview". These selectors are
// additive support for that V0 study; they do not change any completion math.

export type AgendaItem =
  | { kind: 'event'; event: CalendarEvent }
  | { kind: 'block'; block: TimeBlock; task: Task };

/** Timed (non all-day) events and task TimeBlocks on a day, sorted by start time. */
export function selectDayAgenda(events: CalendarEvent[], blocks: TimeBlock[], tasks: Task[], day: Date): AgendaItem[] {
  const taskMap = new Map(tasks.map((task) => [task.id, task]));
  const items: AgendaItem[] = [
    ...events
      .filter((event) => !event.allDay && isSameDay(parseISO(event.startAt), day))
      .map((event) => ({ kind: 'event' as const, event })),
    ...blocks
      .filter((block) => isSameDay(parseISO(block.startAt), day) && taskMap.has(block.taskId))
      .map((block) => ({ kind: 'block' as const, block, task: taskMap.get(block.taskId)! })),
  ];
  return items.sort((a, b) => {
    const aStart = a.kind === 'event' ? a.event.startAt : a.block.startAt;
    const bStart = b.kind === 'event' ? b.event.startAt : b.block.startAt;
    // Compare actual instants, not raw strings: mock data uses explicit
    // offsets (e.g. "-07:00") while generated slots use UTC "Z" — the two
    // representations are not directly string-comparable even though both
    // are valid ISO datetimes for the same moment.
    return parseISO(aStart).getTime() - parseISO(bStart).getTime();
  });
}

export interface FreeSlot { startAt: string; endAt: string }

function roundUpToHalfHour(date: Date): number {
  const clean = setMilliseconds(setSeconds(date, 0), 0);
  const remainder = getMinutes(clean) % 30;
  return (remainder === 0 ? clean : addMinutes(clean, 30 - remainder)).getTime();
}

/**
 * Free (unbusy) gaps on a day within a display window, merging overlapping
 * events and TimeBlocks. `from` (if on the same day) clamps the earliest
 * possible slot start and is rounded up to the next :00/:30.
 */
export function selectFreeSlots(
  events: CalendarEvent[],
  blocks: TimeBlock[],
  day: Date,
  options?: { from?: Date; dayStart?: number; dayEnd?: number; minMinutes?: number },
): FreeSlot[] {
  const dayStart = options?.dayStart ?? 8;
  const dayEnd = options?.dayEnd ?? 21;
  const minMinutes = options?.minMinutes ?? 30;
  const windowStart = setMinutes(setHours(startOfDay(day), dayStart), 0).getTime();
  const windowEnd = setMinutes(setHours(startOfDay(day), dayEnd), 0).getTime();
  const earliest = options?.from && isSameDay(options.from, day) ? roundUpToHalfHour(options.from) : windowStart;
  const rangeStart = Math.max(earliest, windowStart);
  if (rangeStart >= windowEnd) return [];

  const busy = [
    ...events
      .filter((event) => !event.allDay && isSameDay(parseISO(event.startAt), day))
      .map((event) => ({ start: parseISO(event.startAt).getTime(), end: parseISO(event.endAt).getTime() })),
    ...blocks
      .filter((block) => isSameDay(parseISO(block.startAt), day))
      .map((block) => ({ start: parseISO(block.startAt).getTime(), end: parseISO(block.endAt).getTime() })),
  ]
    .filter((interval) => interval.end > rangeStart && interval.start < windowEnd)
    .sort((a, b) => a.start - b.start);

  const merged: Array<{ start: number; end: number }> = [];
  for (const interval of busy) {
    const last = merged[merged.length - 1];
    if (last && interval.start <= last.end) {
      last.end = Math.max(last.end, interval.end);
    } else {
      merged.push({ ...interval });
    }
  }

  const slots: FreeSlot[] = [];
  let cursor = rangeStart;
  for (const interval of merged) {
    const gapEnd = Math.min(interval.start, windowEnd);
    if (gapEnd - cursor >= minMinutes * 60000) {
      slots.push({ startAt: new Date(cursor).toISOString(), endAt: new Date(gapEnd).toISOString() });
    }
    cursor = Math.max(cursor, interval.end);
  }
  if (windowEnd - cursor >= minMinutes * 60000) {
    slots.push({ startAt: new Date(cursor).toISOString(), endAt: new Date(windowEnd).toISOString() });
  }
  return slots;
}

/** A Task's TimeBlocks on a specific day, sorted by start time. */
export function selectTaskBlocksOnDay(blocks: TimeBlock[], taskId: string, day: Date): TimeBlock[] {
  return blocks
    .filter((block) => block.taskId === taskId && isSameDay(parseISO(block.startAt), day))
    .sort((a, b) => parseISO(a.startAt).getTime() - parseISO(b.startAt).getTime());
}

/** Start times to offer for a reservation: each gap's start, then later starts inside long gaps, earliest first. */
export function selectSuggestedStarts(slots: FreeSlot[], durationMinutes: number, limit = 3): string[] {
  const durationMs = durationMinutes * 60000;
  const stepMs = Math.max(durationMinutes, 90) * 60000;
  const starts: string[] = [];
  for (const slot of slots) {
    const end = parseISO(slot.endAt).getTime();
    for (let start = parseISO(slot.startAt).getTime(); start + durationMs <= end && starts.length < limit; start += stepMs) {
      starts.push(new Date(start).toISOString());
    }
  }
  return starts;
}
