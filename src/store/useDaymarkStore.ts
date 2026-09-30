import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { format, parseISO, setHours } from 'date-fns';
import type { CalendarEvent, CalendarView, Category, CategoryId, DayMarkVariant, Project, Routine, Task, TimeBlock } from '@/domain/types';
import { categoryColorKeys, type CategoryColorKey } from '@/theme/tokens';
import { now, todayKey } from '@/domain/clock';
import { initialCategories, initialEvents, initialProjects, initialTasks, initialTimeBlocks } from './mockData';

interface DaymarkState {
  categories: Category[];
  routines: Routine[];
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
  addCategory: (name: string, colorKey?: CategoryColorKey) => void;
  updateCategory: (id: CategoryId, patch: { name?: string; colorKey?: CategoryColorKey }) => void;
  moveCategory: (id: CategoryId, direction: -1 | 1) => void;
  archiveCategory: (id: CategoryId) => void;
  addRoutine: (title: string, categoryId: CategoryId) => void;
  removeRoutine: (id: string) => void;
  addTaskFromRoutine: (routineId: string, date: string) => void;
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

const STORAGE_VERSION = 2;

let idCounter = 0;
const newId = (prefix: string) => `${prefix}-${Date.now()}-${idCounter++}`;

const activeOrdered = (categories: Category[]) => categories.filter((category) => !category.archived).sort((a, b) => a.order - b.order);

function nextColorKey(categories: Category[]): CategoryColorKey {
  const active = categories.filter((category) => !category.archived);
  const unused = categoryColorKeys.find((key) => !active.some((category) => category.colorKey === key));
  return unused ?? categoryColorKeys[active.length % categoryColorKeys.length];
}

export const useDaymarkStore = create<DaymarkState>()(
  persist(
    (set) => ({
      categories: initialCategories,
      routines: [],
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
        tasks: [...state.tasks, { id: newId('task'), title: title.trim(), categoryId, scheduledDate: state.selectedTodayDate }],
      })),
      addCategory: (name, colorKey) => set((state) => {
        if (!name.trim()) return state;
        const order = state.categories.reduce((max, category) => Math.max(max, category.order), -1) + 1;
        return { categories: [...state.categories, { id: newId('list'), name: name.trim(), colorKey: colorKey ?? nextColorKey(state.categories), order }] };
      }),
      updateCategory: (id, patch) => set((state) => ({
        categories: state.categories.map((category) => category.id === id
          ? { ...category, name: patch.name?.trim() ? patch.name.trim() : category.name, colorKey: patch.colorKey ?? category.colorKey }
          : category),
      })),
      moveCategory: (id, direction) => set((state) => {
        const list = activeOrdered(state.categories);
        const index = list.findIndex((category) => category.id === id);
        const neighbor = list[index + direction];
        if (index < 0 || !neighbor) return state;
        const own = list[index];
        return { categories: state.categories.map((category) => category.id === own.id ? { ...category, order: neighbor.order } : category.id === neighbor.id ? { ...category, order: own.order } : category) };
      }),
      archiveCategory: (id) => set((state) => {
        if (activeOrdered(state.categories).length <= 1) return state;
        return { categories: state.categories.map((category) => category.id === id ? { ...category, archived: true } : category), routines: state.routines.filter((routine) => routine.categoryId !== id) };
      }),
      addRoutine: (title, categoryId) => set((state) => {
        const clean = title.trim();
        if (!clean || state.routines.some((routine) => routine.categoryId === categoryId && routine.title.toLowerCase() === clean.toLowerCase())) return state;
        const order = state.routines.reduce((max, routine) => Math.max(max, routine.order), -1) + 1;
        return { routines: [...state.routines, { id: newId('routine'), title: clean, categoryId, order }] };
      }),
      removeRoutine: (id) => set((state) => ({ routines: state.routines.filter((routine) => routine.id !== id) })),
      addTaskFromRoutine: (routineId, date) => set((state) => {
        const routine = state.routines.find((item) => item.id === routineId);
        if (!routine) return state;
        return { tasks: [...state.tasks, { id: newId('task'), title: routine.title, categoryId: routine.categoryId, scheduledDate: date, routineId }] };
      }),
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
      loadSampleData: () => set((state) => {
        const missing = initialCategories.filter((category) => !state.categories.some((item) => item.id === category.id));
        const base = state.categories.reduce((max, category) => Math.max(max, category.order), -1) + 1;
        return {
          // Sample data uses the four default lists, so bring back any of them that were archived too.
          categories: [...state.categories.map((category) => initialCategories.some((item) => item.id === category.id) ? { ...category, archived: false } : category), ...missing.map((category, index) => ({ ...category, order: base + index }))],
          projects: initialProjects, tasks: initialTasks, timeBlocks: initialTimeBlocks,
        };
      }),
      eraseAllData: () => set({ projects: [], tasks: [], timeBlocks: [] }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: 'daymark-v0',
      version: STORAGE_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        categories: state.categories,
        routines: state.routines,
        projects: state.projects,
        tasks: state.tasks,
        timeBlocks: state.timeBlocks,
        dayMarkVariant: state.dayMarkVariant,
      }),
      // v1 -> v2: shapes are compatible; make sure every category has an `order` and routines exist.
      migrate: (persisted, version) => {
        const old = (persisted ?? {}) as Partial<DaymarkState>;
        if (version === 1 && Array.isArray(old.categories)) {
          return {
            ...old,
            categories: old.categories.map((category, index) => ({ ...category, order: typeof category.order === 'number' ? category.order : index })),
            routines: [],
          } as DaymarkState;
        }
        return { categories: initialCategories, routines: [], projects: [], tasks: [], timeBlocks: [], dayMarkVariant: 'wash' as DayMarkVariant } as unknown as DaymarkState;
      },
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
