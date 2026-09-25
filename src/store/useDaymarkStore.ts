import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { format, parseISO, setHours } from 'date-fns';
import type { CalendarEvent, CalendarView, Category, CategoryId, DayMarkVariant, Project, Task, TimeBlock } from '@/domain/types';
import { now, todayKey } from '@/domain/clock';
import { initialCategories, initialEvents, initialProjects, initialTasks, initialTimeBlocks } from './mockData';

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
  dayMarkVariant: DayMarkVariant;
  hasHydrated: boolean;
  toggleTask: (taskId: string) => void;
  setTaskOnToday: (taskId: string, onToday: boolean) => void;
  addTimeBlock: (taskId: string, startAt: string, endAt: string) => void;
  setCalendarView: (view: CalendarView) => void;
  setCalendarDate: (date: string) => void;
  setScheduleTask: (taskId?: string) => void;
  addTask: (title: string, categoryId: Task['categoryId']) => void;
  setSelectedTodayDate: (date: string) => void;
  moveTaskToDate: (taskId: string, date?: string) => void;
  setProjectAttentionDays: (projectId: string, days: number) => void;
  setDayMarkVariant: (variant: DayMarkVariant) => void;
  addProject: (input: { title: string; categoryId: CategoryId; deadline: string }) => void;
  deleteProject: (projectId: string) => void;
  addProjectTask: (projectId: string, title: string) => void;
  deleteTask: (taskId: string) => void;
  loadSampleData: () => void;
  eraseAllData: () => void;
  setHasHydrated: (hydrated: boolean) => void;
}

const STORAGE_VERSION = 1;

export const useDaymarkStore = create<DaymarkState>()(
  persist(
    (set) => ({
      categories: initialCategories,
      projects: [],
      tasks: [],
      timeBlocks: [],
      events: initialEvents,
      calendarView: 'week',
      calendarDate: now().toISOString(),
      selectedTodayDate: todayKey(),
      dayMarkVariant: 'wash',
      hasHydrated: false,
      toggleTask: (taskId) => set((state) => ({
        tasks: state.tasks.map((task) => task.id === taskId
          ? {
            ...task,
            completedAt: task.completedAt
              ? undefined
              : (state.selectedTodayDate === todayKey() ? now() : setHours(parseISO(state.selectedTodayDate), 12)).toISOString(),
          }
          : task),
      })),
      setTaskOnToday: (taskId, onToday) => set((state) => ({
        tasks: state.tasks.map((task) => task.id === taskId
          ? { ...task, scheduledDate: onToday ? todayKey() : undefined }
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
      moveTaskToDate: (taskId, date) => set((state) => ({
        tasks: state.tasks.map((task) => task.id === taskId && !task.completedAt
          ? { ...task, scheduledDate: date ? format(parseISO(date), 'yyyy-MM-dd') : undefined }
          : task),
      })),
      setProjectAttentionDays: (projectId, days) => set((state) => ({
        projects: state.projects.map((project) => project.id === projectId ? { ...project, attentionDays: days } : project),
      })),
      setDayMarkVariant: (dayMarkVariant) => set({ dayMarkVariant }),
      addProject: ({ title, categoryId, deadline }) => set((state) => ({
        projects: [...state.projects, { id: `project-${Date.now()}`, title: title.trim(), categoryId, deadline, status: 'active' }],
      })),
      deleteProject: (projectId) => set((state) => {
        const taskIds = new Set(state.tasks.filter((task) => task.projectId === projectId).map((task) => task.id));
        return {
          projects: state.projects.filter((project) => project.id !== projectId),
          tasks: state.tasks.filter((task) => !taskIds.has(task.id)),
          timeBlocks: state.timeBlocks.filter((block) => !taskIds.has(block.taskId)),
        };
      }),
      addProjectTask: (projectId, title) => set((state) => {
        const project = state.projects.find((item) => item.id === projectId);
        if (!project || !title.trim()) return state;
        return { tasks: [...state.tasks, { id: `task-${Date.now()}`, title: title.trim(), categoryId: project.categoryId, projectId }] };
      }),
      deleteTask: (taskId) => set((state) => ({
        tasks: state.tasks.filter((task) => task.id !== taskId),
        timeBlocks: state.timeBlocks.filter((block) => block.taskId !== taskId),
      })),
      loadSampleData: () => set({ projects: initialProjects, tasks: initialTasks, timeBlocks: initialTimeBlocks }),
      eraseAllData: () => set({ projects: [], tasks: [], timeBlocks: [] }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: 'daymark-v0',
      version: STORAGE_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        categories: state.categories,
        projects: state.projects,
        tasks: state.tasks,
        timeBlocks: state.timeBlocks,
        dayMarkVariant: state.dayMarkVariant,
      }),
      migrate: () => ({
        categories: initialCategories,
        projects: [],
        tasks: [],
        timeBlocks: [],
        dayMarkVariant: 'wash' as DayMarkVariant,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
