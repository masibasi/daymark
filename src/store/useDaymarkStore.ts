import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { format, parseISO, setHours } from 'date-fns';
import type { CalendarEvent, CalendarView, Category, CategoryId, DayMarkVariant, Project, Routine, Task, TimeBlock } from '@/domain/types';
import { categoryColorKeys, type CategoryColorKey } from '@/theme/tokens';
import { now, todayKey } from '@/domain/clock';
import { sortTasksByOrder } from '@/domain/selectors';
import { initialCategories, initialEvents, initialProjects, initialTasks, initialTimeBlocks } from './mockData';

// What the last delete removed, so Undo can put it back exactly (same ids, order, completedAt). Never persisted.
type LastDeleted = { kind: 'task'; task: Task; timeBlocks: TimeBlock[]; index: number } | { kind: 'routine'; routine: Routine; index: number };
export interface Toast { id: number; message: string; undoable: boolean }

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
  lastDeleted: LastDeleted | null;
  toast: Toast | null;
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
  addTaskFromRoutine: (routineId: string, date: string, complete?: boolean) => void;
  moveTaskInDay: (taskId: string, toCategoryId: CategoryId, toIndex: number, day: string) => boolean;
  undoDelete: () => void;
  showToast: (message: string) => void;
  dismissToast: () => void;
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

const STORAGE_VERSION = 3;

let toastCounter = 0;
const makeToast = (message: string, undoable: boolean): Toast => ({ id: ++toastCounter, message, undoable });

// Order for a task newly placed at the end of a list on a day (max + 1).
const nextOrder = (tasks: Task[], day: string, categoryId: CategoryId, excludeId?: string) =>
  tasks.reduce((max, task) => task.scheduledDate === day && task.categoryId === categoryId && task.id !== excludeId && task.order !== undefined ? Math.max(max, task.order) : max, -1) + 1;

// Same stamp toggleTask uses: real time for today, noon for a browsed day.
const completionStamp = (day: string) => (day === todayKey() ? now() : setHours(parseISO(day), 12)).toISOString();

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
    (set, get) => ({
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
      lastDeleted: null,
      toast: null,
      toggleTask: (taskId) => set((state) => ({
        tasks: state.tasks.map((task) => task.id === taskId
          ? {
            ...task,
            completedAt: task.completedAt ? undefined : completionStamp(state.selectedTodayDate),
          }
          : task),
      })),
      setTaskOnToday: (taskId, onToday) => set((state) => ({
        tasks: state.tasks.map((task) => task.id === taskId
          ? { ...task, scheduledDate: onToday ? todayKey() : undefined, order: onToday ? nextOrder(state.tasks, todayKey(), task.categoryId, task.id) : undefined }
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
        tasks: [...state.tasks, { id: newId('task'), title: title.trim(), categoryId, scheduledDate: state.selectedTodayDate, order: nextOrder(state.tasks, state.selectedTodayDate, categoryId) }],
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
      removeRoutine: (id) => set((state) => {
        const index = state.routines.findIndex((routine) => routine.id === id);
        if (index < 0) return state;
        const routine = state.routines[index];
        return { routines: state.routines.filter((item) => item.id !== id), lastDeleted: { kind: 'routine', routine, index }, toast: makeToast(`Removed routine "${routine.title}"`, true) };
      }),
      addTaskFromRoutine: (routineId, date, complete) => set((state) => {
        const routine = state.routines.find((item) => item.id === routineId);
        if (!routine) return state;
        const task: Task = { id: newId('task'), title: routine.title, categoryId: routine.categoryId, scheduledDate: date, routineId, order: nextOrder(state.tasks, date, routine.categoryId) };
        if (complete) task.completedAt = completionStamp(date);
        return { tasks: [...state.tasks, task] };
      }),
      // Reorder within a list or move to another list on `day`. `toIndex` counts the target list without the moved task.
      // Completed tasks and project tasks may reorder but never change list. Returns false when nothing was changed.
      moveTaskInDay: (taskId, toCategoryId, toIndex, day) => {
        const state = get();
        const task = state.tasks.find((item) => item.id === taskId);
        if (!task) return false;
        const crossList = task.categoryId !== toCategoryId;
        if (crossList) {
          const target = state.categories.find((category) => category.id === toCategoryId);
          if (!target || target.archived || task.completedAt || task.projectId) return false;
        }
        const listOf = (categoryId: CategoryId) => sortTasksByOrder(state.tasks.filter((item) => item.scheduledDate === day && item.categoryId === categoryId && item.id !== taskId));
        const source = listOf(task.categoryId);
        const target = crossList ? listOf(toCategoryId) : source;
        target.splice(Math.max(0, Math.min(toIndex, target.length)), 0, task);
        const orders = new Map<string, number>();
        (crossList ? [source, target] : [target]).forEach((list) => list.forEach((item, index) => orders.set(item.id, index)));
        set({ tasks: state.tasks.map((item) => item.id === taskId ? { ...item, categoryId: toCategoryId, order: orders.get(item.id) } : orders.has(item.id) ? { ...item, order: orders.get(item.id) } : item) });
        return true;
      },
      undoDelete: () => set((state) => {
        const deleted = state.lastDeleted;
        if (!deleted) return state;
        if (deleted.kind === 'routine') {
          const routines = state.routines.slice();
          routines.splice(Math.min(deleted.index, routines.length), 0, deleted.routine);
          return { routines, lastDeleted: null, toast: null };
        }
        const tasks = state.tasks.slice();
        tasks.splice(Math.min(deleted.index, tasks.length), 0, deleted.task);
        return { tasks, timeBlocks: [...state.timeBlocks, ...deleted.timeBlocks], lastDeleted: null, toast: null };
      }),
      showToast: (message) => set({ toast: makeToast(message, false), lastDeleted: null }),
      dismissToast: () => set({ toast: null, lastDeleted: null }),
      setSelectedTodayDate: (selectedTodayDate) => set({ selectedTodayDate: format(parseISO(selectedTodayDate), 'yyyy-MM-dd') }),
      moveTaskToDate: (taskId, date) => set((state) => ({
        tasks: state.tasks.map((task) => task.id === taskId && !task.completedAt
          ? { ...task, scheduledDate: date ? format(parseISO(date), 'yyyy-MM-dd') : undefined, order: date ? nextOrder(state.tasks, format(parseISO(date), 'yyyy-MM-dd'), task.categoryId, task.id) : undefined }
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
      deleteTask: (taskId) => set((state) => {
        const index = state.tasks.findIndex((task) => task.id === taskId);
        if (index < 0) return state;
        const task = state.tasks[index];
        return {
          tasks: state.tasks.filter((item) => item.id !== taskId),
          timeBlocks: state.timeBlocks.filter((block) => block.taskId !== taskId),
          lastDeleted: { kind: 'task', task, timeBlocks: state.timeBlocks.filter((block) => block.taskId === taskId), index },
          toast: makeToast(`Deleted "${task.title}"`, true),
        };
      }),
      loadSampleData: () => set((state) => {
        const missing = initialCategories.filter((category) => !state.categories.some((item) => item.id === category.id));
        const base = state.categories.reduce((max, category) => Math.max(max, category.order), -1) + 1;
        return {
          // Sample data uses the four default lists, so bring back any of them that were archived too.
          categories: [...state.categories.map((category) => initialCategories.some((item) => item.id === category.id) ? { ...category, archived: false } : category), ...missing.map((category, index) => ({ ...category, order: base + index }))],
          projects: initialProjects, tasks: initialTasks, timeBlocks: initialTimeBlocks,
        };
      }),
      eraseAllData: () => set({ projects: [], tasks: [], timeBlocks: [], lastDeleted: null, toast: null }),
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
        if (version === 2) return old as DaymarkState; // v2 -> v3: Task.order is optional, nothing to rewrite.
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
