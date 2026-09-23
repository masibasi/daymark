import { create } from 'zustand';
import type {
  CalendarEvent,
  CalendarViewMode,
  Category,
  ISODate,
  Project,
  Task,
  TimeBlock,
} from '../domain/types';
import {
  TODAY_KEY,
  calendarEvents as seedEvents,
  categories as seedCategories,
  projects as seedProjects,
  tasks as seedTasks,
  timeBlocks as seedTimeBlocks,
} from './mockData';

interface DaymarkState {
  today: ISODate;
  categories: Category[];
  projects: Project[];
  tasks: Task[];
  calendarEvents: CalendarEvent[];
  timeBlocks: TimeBlock[];

  calendarView: CalendarViewMode;
  calendarDate: ISODate;
  /** Task selected from the ScheduleTaskSheet, awaiting a slot tap. */
  placingTaskId: string | null;

  // Actions — the only place domain data mutates. See docs/ARCHITECTURE.md
  // "state boundaries": components call these, never mutate entities directly.
  toggleTask: (taskId: string) => void;
  setTaskOnToday: (taskId: string, on: boolean) => void;
  addTask: (input: {
    title: string;
    categoryId: string;
    scheduledDate?: ISODate;
    projectId?: string;
  }) => void;
  addTimeBlock: (taskId: string, start: string, end: string) => void;
  setCalendarView: (view: CalendarViewMode) => void;
  setCalendarDate: (date: ISODate) => void;
  beginPlacingTask: (taskId: string) => void;
  cancelPlacingTask: () => void;
}

export const useStore = create<DaymarkState>((set) => ({
  today: TODAY_KEY,
  categories: seedCategories,
  projects: seedProjects,
  tasks: seedTasks,
  calendarEvents: seedEvents,
  timeBlocks: seedTimeBlocks,

  calendarView: 'week',
  calendarDate: TODAY_KEY,
  placingTaskId: null,

  toggleTask: (taskId) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? { ...t, completedAt: t.completedAt ? undefined : new Date().toISOString() }
          : t
      ),
    })),

  setTaskOnToday: (taskId, on) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, scheduledDate: on ? state.today : undefined } : t
      ),
    })),

  addTask: ({ title, categoryId, scheduledDate, projectId }) =>
    set((state) => {
      const maxOrder = state.tasks.reduce((m, t) => Math.max(m, t.order), 0);
      const task: Task = {
        id: `t-${Date.now()}-${Math.round(Math.random() * 1000)}`,
        title,
        categoryId,
        scheduledDate,
        projectId,
        order: maxOrder + 1,
      };
      return { tasks: [...state.tasks, task] };
    }),

  addTimeBlock: (taskId, start, end) =>
    set((state) => ({
      timeBlocks: [
        ...state.timeBlocks,
        { id: `tb-${Date.now()}`, taskId, start, end },
      ],
      placingTaskId: null,
    })),

  setCalendarView: (view) => set({ calendarView: view }),
  setCalendarDate: (date) => set({ calendarDate: date }),
  beginPlacingTask: (taskId) => set({ placingTaskId: taskId }),
  cancelPlacingTask: () => set({ placingTaskId: null }),
}));
