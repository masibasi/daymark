import { addDays, differenceInCalendarDays, format, isSameDay, parseISO, startOfDay } from 'date-fns';
import { categoryColorKeys, type CategoryColorKey } from '@/theme/tokens';
import type { CalendarEvent, Category, CategoryId, Project, Routine, Task } from './types';

export interface DayOrbitSegment {
  categoryId: CategoryId;
  colorKey: CategoryColorKey;
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
export function selectTodaySections(tasks: Task[], categories: Category[]): Array<{ category: Category; tasks: Task[] }> {
  return categories
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((category) => ({ category, tasks: sortTasksByOrder(tasks.filter((task) => task.categoryId === category.id)) }))
    .filter((group) => !group.category.archived || group.tasks.length > 0);
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

export function selectDayOrbit(tasks: Task[], day: Date, categories: Category[]): DayOrbitSegment[] {
  const relevant = tasks.filter((task) => task.scheduledDate === format(day, 'yyyy-MM-dd'));
  if (relevant.length === 0) return [];
  return categories.slice().sort((a, b) => a.order - b.order).flatMap((category) => {
    const categoryTasks = relevant.filter((task) => task.categoryId === category.id);
    if (categoryTasks.length === 0) return [];
    const completed = categoryTasks.filter((task) => task.completedAt && isSameDay(parseISO(task.completedAt), day)).length;
    return [{ categoryId: category.id, colorKey: category.colorKey, share: categoryTasks.length / relevant.length, completion: completed / categoryTasks.length }];
  });
}

export function selectCompletedCountOnDay(tasks: Task[], day: Date): number {
  return tasks.filter((task) => task.completedAt && isSameDay(parseISO(task.completedAt), day)).length;
}

// Routines shown as ghost rows: this list's routines not yet added on `day`. Never for past days.
export function selectGhostRoutines(routines: Routine[], tasks: Task[], categoryId: CategoryId, day: Date, today: Date): Routine[] {
  if (differenceInCalendarDays(day, today) < 0) return [];
  return selectRoutinesForList(routines, categoryId).filter((routine) => !selectRoutineAddedOnDay(tasks, routine.id, day));
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
