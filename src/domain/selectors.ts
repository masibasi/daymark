import { differenceInCalendarDays, format, isSameDay, parseISO, startOfDay } from 'date-fns';
import type { Category, CategoryId, Project, Task } from './types';

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

export function selectDeadlineTone(days: number): 'muted' | 'normal' | 'warm' | 'urgent' {
  if (days <= 1) return 'urgent';
  if (days <= 3) return 'warm';
  if (days <= 7) return 'normal';
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
