import { addDays, differenceInCalendarDays, endOfWeek, format, isSameDay, isWithinInterval, parseISO, startOfDay, startOfWeek } from 'date-fns';
import { listColors, type ListColors } from '@/theme/palette';
import { categoryColorKeys, type CategoryColorKey } from '@/theme/tokens';
import type { CalendarEvent, Category, CategoryId, Project, Routine, RoutineRepeat, Task } from './types';

export interface DayOrbitSegment {
  categoryId: CategoryId;
  // Resolved light/dark solid, soft and mark colors, so DayOrbit never needs the store. Hand-built segments (Settings previews) may give only colorKey.
  colors?: ListColors;
  colorKey?: CategoryColorKey;
  share: number;
  completion: number;
}

export function selectTodayTasks(tasks: Task[], date: Date): Task[] {
  const key = format(date, 'yyyy-MM-dd');
  return tasks.filter((task) => task.scheduledDate === key);
}

// Stable rule: tasks without `order` come first in their existing array order, then ordered tasks by `order`.
export function sortTasksByOrder(tasks: Task[]): Task[] {
  return tasks.map((task, index) => ({ task, index })).sort((a, b) => (a.task.order ?? -1) - (b.task.order ?? -1) || a.index - b.index).map((entry) => entry.task);
}

export function selectActiveCategories(categories: Category[]): Category[] {
  return categories.filter((category) => !category.archived).sort((a, b) => a.order - b.order);
}

export function selectCategoryColorKey(categories: Category[], categoryId: CategoryId): CategoryColorKey {
  return categories.find((category) => category.id === categoryId)?.colorKey ?? categoryColorKeys[0];
}

// Today's sections: every active list (even when empty) plus any archived list that has tasks that day.
// `missed` are the day's missed tasks (see selectMissedOnDay): shown muted under their list, and they keep an archived list visible.
export function selectTodaySections(tasks: Task[], categories: Category[], missed: Task[] = []): Array<{ category: Category; tasks: Task[]; missed: Task[] }> {
  return categories
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((category) => ({ category, tasks: sortTasksByOrder(tasks.filter((task) => task.categoryId === category.id)), missed: missed.filter((task) => task.categoryId === category.id) }))
    .filter((group) => !group.category.archived || group.tasks.length > 0 || group.missed.length > 0);
}

// Tasks that were left incomplete on `day` and moved off it later. They count as planned (not completed) for that day forever.
export function selectMissedOnDay(tasks: Task[], day: Date): Task[] {
  const key = format(day, 'yyyy-MM-dd');
  return tasks.filter((task) => task.scheduledDate !== key && task.missedOn?.includes(key));
}

export function selectRoutinesForList(routines: Routine[], categoryId: CategoryId): Routine[] {
  return routines.filter((routine) => routine.categoryId === categoryId).sort((a, b) => a.order - b.order);
}

export function selectRoutineAddedOnDay(tasks: Task[], routineId: string, day: Date): boolean {
  const key = format(day, 'yyyy-MM-dd');
  return tasks.some((task) => task.routineId === routineId && task.scheduledDate === key);
}

export function selectProjectTasks(tasks: Task[], projectId: string): Task[] {
  return tasks.filter((task) => task.projectId === projectId);
}

export function selectProjectProgress(tasks: Task[], projectId: string): { completed: number; total: number } {
  const projectTasks = selectProjectTasks(tasks, projectId);
  return { completed: projectTasks.filter((task) => Boolean(task.completedAt)).length, total: projectTasks.length };
}

// Active folders with a deadline that has not passed, soonest first.
export function selectUpcomingProjects(projects: Project[], now: Date, limit = 3): Project[] {
  return projects
    .filter((project) => project.status === 'active' && project.deadline !== undefined && differenceInCalendarDays(parseISO(project.deadline), startOfDay(now)) >= 0)
    .sort((a, b) => (a.deadline ?? '').localeCompare(b.deadline ?? ''))
    .slice(0, limit);
}

const byOrder = (a: Project, b: Project) => (a.order ?? 1e9) - (b.order ?? 1e9);

// Folder ordering, single source of truth. Pinned (manual order), then dated (deadline ascending, overdue first), then undated (manual order).
export function selectFolderGroups(projects: Project[]): { pinned: Project[]; dated: Project[]; undated: Project[] } {
  const active = projects.filter((project) => project.status !== 'archived');
  return {
    pinned: active.filter((project) => project.pinned).sort(byOrder),
    dated: active.filter((project) => !project.pinned && project.deadline).sort((a, b) => (a.deadline ?? '').localeCompare(b.deadline ?? '') || byOrder(a, b)),
    undated: active.filter((project) => !project.pinned && !project.deadline).sort(byOrder),
  };
}

export function selectFolders(projects: Project[]): Project[] {
  const { pinned, dated, undated } = selectFolderGroups(projects);
  return [...pinned, ...dated, ...undated];
}

export function selectArchivedFolders(projects: Project[]): Project[] {
  return projects.filter((project) => project.status === 'archived').sort((a, b) => (b.archivedAt ?? '').localeCompare(a.archivedAt ?? ''));
}

// Today's strip: pinned folders and every folder with a deadline; undated unpinned folders stay on the Folders tab.
export function selectTodayFolders(projects: Project[]): Project[] {
  return selectFolders(projects).filter((project) => project.pinned || project.deadline);
}

// A dated folder whose steps are all done asks once whether to archive it (Keep silences it until a new step is added). Undated folders never ask.
export function selectCompletionPrompt(project: Project, tasks: Task[]): boolean {
  if (!project.deadline || project.completionAcknowledged || project.status !== 'active') return false;
  const progress = selectProjectProgress(tasks, project.id);
  return progress.total > 0 && progress.completed === progress.total;
}

export function selectDeadlineLabel(days: number): string {
  return days < 0 ? `Overdue · ${-days} day${days === -1 ? '' : 's'}` : days === 0 ? 'Due today' : `D−${days}`;
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

export function selectDayOrbit(tasks: Task[], day: Date, categories: Category[]): DayOrbitSegment[] {
  // Planned for the day: scheduled on it, or left incomplete on it and moved off later (never counted as completed unless completedAt is that day).
  const key = format(day, 'yyyy-MM-dd');
  const relevant = tasks.filter((task) => task.scheduledDate === key || task.missedOn?.includes(key));
  if (relevant.length === 0) return [];
  return categories.slice().sort((a, b) => a.order - b.order).flatMap((category) => {
    const categoryTasks = relevant.filter((task) => task.categoryId === category.id);
    if (categoryTasks.length === 0) return [];
    const completed = categoryTasks.filter((task) => task.completedAt && isSameDay(parseISO(task.completedAt), day)).length;
    return [{ categoryId: category.id, colors: listColors(category), colorKey: category.colorKey, share: categoryTasks.length / relevant.length, completion: completed / categoryTasks.length }];
  });
}

export function selectCompletedCountOnDay(tasks: Task[], day: Date): number {
  return tasks.filter((task) => task.completedAt && isSameDay(parseISO(task.completedAt), day)).length;
}

// Completed tasks from this routine within the Mon-Sun week containing `day` (by completedAt).
export function selectRoutineWeekDone(tasks: Task[], routineId: string, day: Date): number {
  const interval = { start: startOfWeek(day, { weekStartsOn: 1 }), end: endOfWeek(day, { weekStartsOn: 1 }) };
  return tasks.filter((task) => task.routineId === routineId && task.completedAt && isWithinInterval(parseISO(task.completedAt), interval)).length;
}

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const sameDays = (days: number[], want: number[]) => days.length === want.length && want.every((day) => days.includes(day));

// Preset the repeat matches, for picker highlighting; 'custom' for any other weekday set.
export function selectRepeatPreset(repeat: RoutineRepeat | undefined): 'daily' | 'weekdays' | 'weekends' | 'custom' | 'perWeek' {
  if (!repeat || repeat.kind === 'daily') return 'daily';
  if (repeat.kind === 'perWeek') return 'perWeek';
  if (sameDays(repeat.days, [1, 2, 3, 4, 5])) return 'weekdays';
  if (sameDays(repeat.days, [0, 6])) return 'weekends';
  return 'custom';
}

// Short summary of when a routine repeats, e.g. "Every day", "Mon · Wed · Fri", "3 times a week".
export function selectRepeatSummary(repeat: RoutineRepeat | undefined): string {
  const preset = selectRepeatPreset(repeat);
  if (preset === 'daily') return 'Every day';
  if (preset === 'weekdays') return 'Weekdays';
  if (preset === 'weekends') return 'Weekends';
  if (repeat?.kind === 'perWeek') return `${repeat.times} ${repeat.times === 1 ? 'time' : 'times'} a week`;
  if (repeat?.kind === 'weekdays') return repeat.days.length === 0 ? 'No days' : [1, 2, 3, 4, 5, 6, 0].filter((day) => repeat.days.includes(day)).map((day) => WEEKDAY_NAMES[day]).join(' · ');
  return 'Every day';
}

// Ghost meta line under the title: nothing for daily routines, progress for per-week ones.
export function selectRoutineMeta(routine: Routine, tasks: Task[], day: Date): string | undefined {
  const repeat = routine.repeat;
  if (!repeat || repeat.kind === 'daily') return undefined;
  if (repeat.kind === 'perWeek') return `${selectRoutineWeekDone(tasks, routine.id, day)} of ${repeat.times} this week`;
  return selectRepeatSummary(repeat);
}

function routineDueOnDay(routine: Routine, tasks: Task[], day: Date): boolean {
  const repeat = routine.repeat;
  if (!repeat || repeat.kind === 'daily') return true;
  if (repeat.kind === 'weekdays') return repeat.days.includes(day.getDay());
  return selectRoutineWeekDone(tasks, routine.id, day) < repeat.times;
}

// A task that is (or reads as) this list's routine: linked by routineId, or an unlinked task with the same title (saved before linking existed).
export function selectTaskRoutine(routines: Routine[], task: Task): Routine | undefined {
  const title = task.title.trim().toLowerCase();
  return routines.find((routine) => routine.id === task.routineId) ?? (task.routineId ? undefined : routines.find((routine) => routine.categoryId === task.categoryId && routine.title.toLowerCase() === title));
}

// Routines shown as ghost rows: this list's routines due on `day` and not yet added. Never for past days. `tasks` must be all tasks (per-week counts span the week).
export function selectGhostRoutines(routines: Routine[], tasks: Task[], categoryId: CategoryId, day: Date, today: Date): Routine[] {
  if (differenceInCalendarDays(day, today) < 0) return [];
  const key = format(day, 'yyyy-MM-dd');
  const sameTitleToday = (routine: Routine) => tasks.some((task) => !task.routineId && task.scheduledDate === key && task.categoryId === routine.categoryId && task.title.trim().toLowerCase() === routine.title.toLowerCase());
  return selectRoutinesForList(routines, categoryId).filter((routine) => routineDueOnDay(routine, tasks, day) && !selectRoutineAddedOnDay(tasks, routine.id, day) && !sameTitleToday(routine));
}

// Events overlapping `day` (end exclusive): all-day first, then by start time.
export function selectEventsOnDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  const start = startOfDay(day);
  const end = addDays(start, 1);
  return events
    .filter((event) => parseISO(event.startAt) < end && parseISO(event.endAt) > start)
    .sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.startAt.localeCompare(b.startAt));
}

// The task the user explicitly created from this event on `day`, if any.
export function selectTaskFromEvent(tasks: Task[], eventId: string, day: Date): Task | undefined {
  const key = format(day, 'yyyy-MM-dd');
  return tasks.find((task) => task.sourceEventId === eventId && task.scheduledDate === key);
}

// Incomplete tasks left on the most recent past day (within 7 days) that has any; null when that day was dismissed.
export function selectCarryover(tasks: Task[], today: string, dismissed: string[]): { day: string; tasks: Task[] } | null {
  for (let back = 1; back <= 7; back += 1) {
    const day = format(addDays(parseISO(today), -back), 'yyyy-MM-dd');
    const left = tasks.filter((task) => task.scheduledDate === day && !task.completedAt);
    if (left.length > 0) return dismissed.includes(day) ? null : { day, tasks: sortTasksByOrder(left) };
  }
  return null;
}
