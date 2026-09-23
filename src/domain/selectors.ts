import type {
  Category,
  DayMarkSegment,
  DeadlineUrgencyTier,
  ISODate,
  Project,
  Task,
} from './types';
import { dateKeyOf, daysUntil, isSameDateKey } from './dateUtils';

// ---------------------------------------------------------------------------
// Today
// ---------------------------------------------------------------------------

/** Tasks flagged onto a given date's Today list (top-level or subtasks). */
export function selectTasksForDate(tasks: Task[], date: ISODate): Task[] {
  return tasks
    .filter((t) => t.scheduledDate === date)
    .sort((a, b) => a.order - b.order);
}

/** Today's tasks grouped by category, incomplete first (by order), completed sunk to bottom. */
export function selectTasksByCategoryForDate(
  tasks: Task[],
  categories: Category[],
  date: ISODate
): { category: Category; tasks: Task[] }[] {
  const forDate = selectTasksForDate(tasks, date);
  return categories
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((category) => {
      const inCategory = forDate.filter((t) => t.categoryId === category.id);
      const incomplete = inCategory.filter((t) => !t.completedAt);
      const completed = inCategory.filter((t) => t.completedAt);
      return { category, tasks: [...incomplete, ...completed] };
    })
    .filter((group) => group.tasks.length > 0);
}

// ---------------------------------------------------------------------------
// Day Mark — MANDATORY RULE: completedAt only, never scheduledDate, for
// completion history. See docs/ARCHITECTURE.md "Day Mark data rule".
// ---------------------------------------------------------------------------

interface DayMarkOptions {
  /** When true (Today), size segments by *planned* (scheduledDate) tasks so
   * the live ring reflects "today's plan vs. actual." When false (history /
   * month cells), size + fill purely from completedAt tasks that day. */
  live?: boolean;
}

export function selectDayMark(
  tasks: Task[],
  categories: Category[],
  date: ISODate,
  options: DayMarkOptions = {}
): DayMarkSegment[] {
  const completedToday = tasks.filter(
    (t) => t.completedAt && isSameDateKey(t.completedAt, date)
  );

  const denominatorTasks = options.live
    ? tasks.filter((t) => t.scheduledDate === date)
    : completedToday;

  const byCategory = new Map<string, { total: number; done: number }>();
  for (const t of denominatorTasks) {
    const entry = byCategory.get(t.categoryId) ?? { total: 0, done: 0 };
    entry.total += 1;
    byCategory.set(t.categoryId, entry);
  }
  // In live mode, "done" is still gated strictly by completedAt-today.
  for (const t of completedToday) {
    if (options.live && t.scheduledDate !== date) continue;
    const entry = byCategory.get(t.categoryId);
    if (entry) entry.done += 1;
  }

  const totalTasks = denominatorTasks.length;
  if (totalTasks === 0) return [];

  const orderedIds = categories
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((c) => c.id)
    .filter((id) => byCategory.has(id));

  return orderedIds.map((categoryId) => {
    const entry = byCategory.get(categoryId)!;
    return {
      categoryId,
      share: entry.total / totalTasks,
      fill: entry.total > 0 ? entry.done / entry.total : 0,
      total: entry.total,
      done: entry.done,
    };
  });
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export function selectProjectTasks(tasks: Task[], projectId: string): Task[] {
  return tasks
    .filter((t) => t.projectId === projectId)
    .sort((a, b) => a.order - b.order);
}

export function selectProjectProgress(
  tasks: Task[],
  projectId: string
): { done: number; total: number; fraction: number } {
  const projectTasks = selectProjectTasks(tasks, projectId);
  const done = projectTasks.filter((t) => !!t.completedAt).length;
  const total = projectTasks.length;
  return { done, total, fraction: total > 0 ? done / total : 0 };
}

export function selectUpcomingProjects(
  projects: Project[],
  today: Date,
  limit = 3
): Project[] {
  return projects
    .filter((p) => p.status === 'active')
    .slice()
    .sort((a, b) => daysUntil(a.deadline, today) - daysUntil(b.deadline, today))
    .slice(0, limit);
}

export function selectDeadlineUrgencyTier(
  deadline: ISODate,
  today: Date
): DeadlineUrgencyTier {
  const d = daysUntil(deadline, today);
  if (d <= 1) return 'urgent';
  if (d <= 3) return 'soon';
  if (d <= 7) return 'week';
  return 'far';
}

// ---------------------------------------------------------------------------
// Misc lookups
// ---------------------------------------------------------------------------

export function selectCategoryById(
  categories: Category[],
  id: string
): Category | undefined {
  return categories.find((c) => c.id === id);
}

export function selectUnscheduledTasksForSheet(
  tasks: Task[],
  scheduledTaskIds: Set<string>,
  today: ISODate
): Task[] {
  // Tasks eligible to be turned into a TimeBlock: today's tasks or any
  // active project's incomplete subtasks, not already time-blocked.
  return tasks.filter(
    (t) =>
      !t.completedAt &&
      !scheduledTaskIds.has(t.id) &&
      (t.scheduledDate === today || !!t.projectId)
  );
}

export { dateKeyOf };
