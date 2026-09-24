import { create } from 'zustand';
import { format, parseISO, setHours } from 'date-fns';
import type { CalendarEvent, CalendarView, Category, Project, Task, TimeBlock } from '@/domain/types';
import { initialCategories, initialEvents, initialProjects, initialTasks, initialTimeBlocks, prototypeDate } from './mockData';

interface DaymarkState {
  categories: Category[];
  projects: Project[];
  tasks: Task[];
  timeBlocks: TimeBlock[];
  events: CalendarEvent[];
  calendarView: CalendarView;
  calendarDate: string;
  scheduleTaskId?: string;
  selectedTodayDate: string;
  toggleTask: (taskId: string) => void;
  setTaskOnToday: (taskId: string, onToday: boolean) => void;
  addTimeBlock: (taskId: string, startAt: string, endAt: string) => void;
  setCalendarView: (view: CalendarView) => void;
  setCalendarDate: (date: string) => void;
  setScheduleTask: (taskId?: string) => void;
  addTask: (title: string, categoryId: Task['categoryId']) => void;
  setSelectedTodayDate: (date: string) => void;
}

export const useDaymarkStore = create<DaymarkState>((set) => ({
  categories: initialCategories,
  projects: initialProjects,
  tasks: initialTasks,
  timeBlocks: initialTimeBlocks,
  events: initialEvents,
  calendarView: 'week',
  calendarDate: prototypeDate.toISOString(),
  selectedTodayDate: '2026-09-22',
  toggleTask: (taskId) => set((state) => ({
    tasks: state.tasks.map((task) => task.id === taskId
      ? { ...task, completedAt: task.completedAt ? undefined : setHours(parseISO(state.selectedTodayDate), 12).toISOString() }
      : task),
  })),
  setTaskOnToday: (taskId, onToday) => set((state) => ({
    tasks: state.tasks.map((task) => task.id === taskId
      ? { ...task, scheduledDate: onToday ? format(prototypeDate, 'yyyy-MM-dd') : undefined }
      : task),
  })),
  addTimeBlock: (taskId, startAt, endAt) => set((state) => ({
    timeBlocks: [...state.timeBlocks, { id: `block-${Date.now()}`, taskId, startAt, endAt }],
    scheduleTaskId: undefined,
  })),
  setCalendarView: (calendarView) => set({ calendarView }),
  setCalendarDate: (calendarDate) => set({ calendarDate }),
  setScheduleTask: (scheduleTaskId) => set({ scheduleTaskId }),
  addTask: (title, categoryId) => set((state) => ({
    tasks: [...state.tasks, { id: `task-${Date.now()}`, title: title.trim(), categoryId, scheduledDate: state.selectedTodayDate }],
  })),
  setSelectedTodayDate: (selectedTodayDate) => set({ selectedTodayDate: format(parseISO(selectedTodayDate), 'yyyy-MM-dd') }),
}));
