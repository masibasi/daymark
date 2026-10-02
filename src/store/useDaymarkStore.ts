import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { format, parseISO, setHours } from 'date-fns';
import type { CalendarEvent, CalendarFeed, CalendarView, Category, CategoryId, DayMarkVariant, Project, Routine, RoutineRepeat, Task, TimeBlock } from '@/domain/types';
import { categoryColorKeys, type CategoryColorKey } from '@/theme/tokens';
import { now, todayKey } from '@/domain/clock';
import { selectFolderGroups, sortTasksByOrder } from '@/domain/selectors';
import { applyChanges, sameData, type RemoteChange } from '@/sync/merge';
import { initialCategories, initialEvents, initialProjects, initialTasks, initialTimeBlocks } from './mockData';

// What the last delete removed, so Undo can put it back exactly (same ids, order, completedAt). Never persisted.
type LastDeleted =
  | { kind: 'task'; task: Task; timeBlocks: TimeBlock[]; index: number }
  | { kind: 'routine'; routine: Routine; index: number }
  | { kind: 'archive'; project: Project }
  | { kind: 'move'; task: Task; project: Project };
export interface Toast { id: number; message: string; undoable: boolean }

interface DaymarkState {
  categories: Category[];
  routines: Routine[];
  projects: Project[];
  tasks: Task[];
  timeBlocks: TimeBlock[];
  events: CalendarEvent[];
  calendarFeeds: CalendarFeed[];
  feedErrors: Record<string, string>;
  // Lists folded shut on Today; device-local view state, never synced.
  collapsedListIds: string[];
  toggleListCollapsed: (listId: string) => void;
  calendarView: CalendarView;
  calendarDate: string;
  selectedTodayDate: string;
  dayMarkVariant: DayMarkVariant;
  hasHydrated: boolean;
  // Past days whose "unfinished from …" banner the user dismissed (last 14 kept).
  carryoverDismissed: string[];
  lastDeleted: LastDeleted | null;
  toast: Toast | null;
  toggleTask: (taskId: string) => void;
  setTaskOnToday: (taskId: string, onToday: boolean) => void;
  removeTimeBlock: (id: string) => void;
  setCalendarView: (view: CalendarView) => void;
  setCalendarDate: (date: string) => void;
  addTask: (title: string, categoryId: Task['categoryId']) => void;
  addCategory: (name: string, colorKey?: CategoryColorKey) => void;
  updateCategory: (id: CategoryId, patch: { name?: string; colorKey?: CategoryColorKey }) => void;
  moveCategory: (id: CategoryId, direction: -1 | 1) => void;
  archiveCategory: (id: CategoryId) => void;
  addRoutine: (title: string, categoryId: CategoryId) => void;
  updateRoutine: (id: string, patch: { repeat?: RoutineRepeat }) => void;
  removeRoutine: (id: string) => void;
  addTaskFromRoutine: (routineId: string, date: string, complete?: boolean) => void;
  // categoryId undefined = create the "Schedule" list (next free colour) and add the task to it in one step.
  addTaskFromEvent: (event: Pick<CalendarEvent, 'id' | 'title'>, categoryId: CategoryId | undefined, date: string) => void;
  moveTaskInDay: (taskId: string, toCategoryId: CategoryId, toIndex: number, day: string) => boolean;
  undoDelete: () => void;
  showToast: (message: string) => void;
  dismissToast: () => void;
  setSelectedTodayDate: (date: string) => void;
  moveTaskToDate: (taskId: string, date?: string) => void;
  setProjectAttentionDays: (projectId: string, days: number) => void;
  setDayMarkVariant: (variant: DayMarkVariant) => void;
  // Returns the new folder's id.
  addProject: (input: { title: string; categoryId: CategoryId; deadline?: string; pinned?: boolean }) => string;
  renameProject: (projectId: string, title: string) => void;
  setProjectDeadline: (projectId: string, deadline?: string) => void;
  setProjectPinned: (projectId: string, pinned: boolean) => void;
  archiveProject: (projectId: string) => void;
  restoreProject: (projectId: string) => void;
  acknowledgeCompletion: (projectId: string) => void;
  // Manual order within the pinned group or the undated group; `toIndex` counts the group without the moved folder.
  moveFolder: (projectId: string, toIndex: number, group: 'pinned' | 'undated') => void;
  // Puts an incomplete task into a folder (list follows the folder) and takes it off its day. False when it can't move.
  moveTaskToFolder: (taskId: string, projectId: string) => boolean;
  dismissCarryover: (day: string) => void;
  deleteProject: (projectId: string) => void;
  addProjectTask: (projectId: string, title: string) => void;
  deleteTask: (taskId: string) => void;
  renameTask: (taskId: string, title: string) => void;
  addCalendarFeed: (name: string, url: string) => void;
  setCalendarFeedEnabled: (id: string, enabled: boolean) => void;
  removeCalendarFeed: (id: string) => void;
  applyFeedEvents: (feedIds: string[], windowStart: string, windowEnd: string, loaded: CalendarEvent[], errors: Record<string, string>) => void;
  loadSampleData: () => void;
  eraseAllData: () => void;
  applyRemoteItems: (changes: RemoteChange[]) => void;
  setHasHydrated: (hydrated: boolean) => void;
}

const STORAGE_VERSION = 7;

let toastCounter = 0;
const makeToast = (message: string, undoable: boolean): Toast => ({ id: ++toastCounter, message, undoable });

// Order for a task newly placed at the end of a list on a day (max + 1).
const nextOrder = (tasks: Task[], day: string, categoryId: CategoryId, excludeId?: string) =>
  tasks.reduce((max, task) => task.scheduledDate === day && task.categoryId === categoryId && task.id !== excludeId && task.order !== undefined ? Math.max(max, task.order) : max, -1) + 1;

// Moving an incomplete task off a past day records that day as missed so the day keeps showing it (3/5 stays 3/5).
// Moving off today or a future day is just replanning and records nothing.
const leaveDay = (task: Task, nextDate: string | undefined): Task => {
  const from = task.scheduledDate;
  if (!from || from === nextDate || task.completedAt || from >= todayKey() || task.missedOn?.includes(from)) return task;
  return { ...task, missedOn: [...(task.missedOn ?? []), from] };
};

// Same stamp toggleTask uses: real time for today, noon for a browsed day.
const completionStamp = (day: string) => (day === todayKey() ? now() : setHours(parseISO(day), 12)).toISOString();

// Globally unique: two devices may create items at the same millisecond, so ids carry random bits.
const randomPart = () => {
  const bytes = globalThis.crypto?.getRandomValues?.(new Uint32Array(2));
  return bytes ? `${bytes[0].toString(36)}${bytes[1].toString(36)}` : `${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 6)}`;
};
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${randomPart()}`;

const nextProjectOrder = (projects: Project[]) => projects.reduce((max, project) => Math.max(max, project.order ?? -1), -1) + 1;

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
      events: [],
      calendarFeeds: [],
      collapsedListIds: [],
      toggleListCollapsed: (listId) => set((state) => ({ collapsedListIds: state.collapsedListIds.includes(listId) ? state.collapsedListIds.filter((id) => id !== listId) : [...state.collapsedListIds, listId] })),
      feedErrors: {},
      calendarView: 'week',
      calendarDate: now().toISOString(),
      selectedTodayDate: todayKey(),
      dayMarkVariant: 'doodle',
      hasHydrated: false,
      carryoverDismissed: [],
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
          ? { ...leaveDay(task, onToday ? todayKey() : undefined), scheduledDate: onToday ? todayKey() : undefined, order: onToday ? nextOrder(state.tasks, todayKey(), task.categoryId, task.id) : undefined }
          : task),
      })),
      // Legacy blocks only: nothing creates TimeBlocks any more (time-blocking is paused), but existing ones can be removed.
      removeTimeBlock: (id) => set((state) => ({ timeBlocks: state.timeBlocks.filter((block) => block.id !== id) })),
      setCalendarView: (calendarView) => set({ calendarView }),
      setCalendarDate: (calendarDate) => set({ calendarDate }),
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
      updateRoutine: (id, patch) => set((state) => ({ routines: state.routines.map((routine) => routine.id === id ? { ...routine, ...patch } : routine) })),
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
      // Explicit user action only ("Add to Today" on an event). One task per event per day.
      addTaskFromEvent: (event, categoryId, date) => set((state) => {
        if (state.tasks.some((task) => task.sourceEventId === event.id && task.scheduledDate === date)) return state;
        let categories = state.categories;
        let target = categoryId ? categories.find((item) => item.id === categoryId) : undefined;
        if (!categoryId) {
          const order = categories.reduce((max, category) => Math.max(max, category.order), -1) + 1;
          target = { id: newId('list'), name: 'Schedule', colorKey: nextColorKey(categories), order };
          categories = [...categories, target];
        }
        if (!target || target.archived) return state;
        return { categories, tasks: [...state.tasks, { id: newId('task'), title: event.title.trim() || 'Event', categoryId: target.id, scheduledDate: date, sourceEventId: event.id, order: nextOrder(state.tasks, date, target.id) }] };
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
        if (deleted.kind === 'archive') return { projects: state.projects.map((project) => project.id === deleted.project.id ? deleted.project : project), lastDeleted: null, toast: null };
        if (deleted.kind === 'move') return { tasks: state.tasks.map((task) => task.id === deleted.task.id ? deleted.task : task), projects: state.projects.map((project) => project.id === deleted.project.id ? deleted.project : project), lastDeleted: null, toast: null };
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
          ? { ...leaveDay(task, date ? format(parseISO(date), 'yyyy-MM-dd') : undefined), scheduledDate: date ? format(parseISO(date), 'yyyy-MM-dd') : undefined, order: date ? nextOrder(state.tasks, format(parseISO(date), 'yyyy-MM-dd'), task.categoryId, task.id) : undefined }
          : task),
      })),
      setProjectAttentionDays: (projectId, days) => set((state) => ({
        projects: state.projects.map((project) => project.id === projectId ? { ...project, attentionDays: days } : project),
      })),
      setDayMarkVariant: (dayMarkVariant) => set({ dayMarkVariant }),
      addProject: ({ title, categoryId, deadline, pinned }) => {
        const id = newId('project');
        set((state) => ({
          projects: [...state.projects, { id, title: title.trim(), categoryId, status: 'active', order: nextProjectOrder(state.projects), ...(deadline ? { deadline } : {}), ...(pinned ? { pinned: true } : {}) }],
        }));
        return id;
      },
      renameProject: (projectId, title) => set((state) => {
        const clean = title.trim();
        const project = state.projects.find((item) => item.id === projectId);
        if (!clean || !project || project.title === clean) return state;
        return { projects: state.projects.map((item) => item.id === projectId ? { ...item, title: clean } : item) };
      }),
      setProjectDeadline: (projectId, deadline) => set((state) => ({
        projects: state.projects.map((project) => {
          if (project.id !== projectId) return project;
          const { deadline: _old, completionAcknowledged: _ack, ...rest } = project;
          return deadline ? { ...rest, deadline } : rest;
        }),
      })),
      setProjectPinned: (projectId, pinned) => set((state) => ({
        projects: state.projects.map((project) => {
          if (project.id !== projectId || Boolean(project.pinned) === pinned) return project;
          const { pinned: _pinned, ...rest } = project;
          // Joins the end of whichever group it lands in.
          return pinned ? { ...rest, pinned: true, order: nextProjectOrder(state.projects) } : { ...rest, order: nextProjectOrder(state.projects) };
        }),
      })),
      archiveProject: (projectId) => set((state) => {
        const project = state.projects.find((item) => item.id === projectId);
        if (!project || project.status === 'archived') return state;
        return {
          projects: state.projects.map((item) => item.id === projectId ? { ...item, status: 'archived' as const, archivedAt: now().toISOString() } : item),
          lastDeleted: { kind: 'archive', project },
          toast: makeToast(`Archived "${project.title}"`, true),
        };
      }),
      restoreProject: (projectId) => set((state) => ({
        projects: state.projects.map((project) => {
          if (project.id !== projectId || project.status !== 'archived') return project;
          const { archivedAt: _archivedAt, ...rest } = project;
          return { ...rest, status: 'active' as const };
        }),
      })),
      acknowledgeCompletion: (projectId) => set((state) => ({ projects: state.projects.map((project) => project.id === projectId ? { ...project, completionAcknowledged: true } : project) })),
      moveFolder: (projectId, toIndex, group) => set((state) => {
        const groups = selectFolderGroups(state.projects);
        const list = (group === 'pinned' ? groups.pinned : groups.undated).slice();
        const from = list.findIndex((project) => project.id === projectId);
        if (from < 0) return state;
        const [moved] = list.splice(from, 1);
        list.splice(Math.max(0, Math.min(toIndex, list.length)), 0, moved);
        const orders = new Map(list.map((project, index) => [project.id, index]));
        if (!state.projects.some((project) => orders.has(project.id) && project.order !== orders.get(project.id))) return state;
        return { projects: state.projects.map((project) => orders.has(project.id) && project.order !== orders.get(project.id) ? { ...project, order: orders.get(project.id) } : project) };
      }),
      moveTaskToFolder: (taskId, projectId) => {
        const state = get();
        const task = state.tasks.find((item) => item.id === taskId);
        const project = state.projects.find((item) => item.id === projectId);
        if (!task || task.completedAt || !project || project.status === 'archived') return false;
        const { scheduledDate: _date, order: _order, ...rest } = leaveDay(task, undefined);
        set({
          tasks: state.tasks.map((item) => item.id === taskId ? { ...rest, projectId, categoryId: project.categoryId } : item),
          // A new open step re-opens the "all steps done" question.
          projects: project.completionAcknowledged ? state.projects.map((item) => item.id === projectId ? { ...item, completionAcknowledged: false } : item) : state.projects,
          lastDeleted: { kind: 'move', task, project },
          toast: makeToast(`Moved to "${project.title}"`, true),
        });
        return true;
      },
      dismissCarryover: (day) => set((state) => state.carryoverDismissed.includes(day) ? state : { carryoverDismissed: [...state.carryoverDismissed, day].slice(-14) }),
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
        return {
          tasks: [...state.tasks, { id: newId('task'), title: title.trim(), categoryId: project.categoryId, projectId }],
          projects: project.completionAcknowledged ? state.projects.map((item) => item.id === projectId ? { ...item, completionAcknowledged: false } : item) : state.projects,
        };
      }),
      // Title only: never touches completedAt, order, or list. Empty titles are ignored.
      renameTask: (taskId, title) => set((state) => {
        const clean = title.trim();
        const task = state.tasks.find((item) => item.id === taskId);
        if (!clean || !task || task.title === clean) return state;
        return { tasks: state.tasks.map((item) => item.id === taskId ? { ...item, title: clean } : item) };
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
      addCalendarFeed: (name, url) => set((state) => ({ calendarFeeds: [...state.calendarFeeds, { id: newId('feed'), name: name.trim() || 'Calendar', url, enabled: true }] })),
      setCalendarFeedEnabled: (id, enabled) => set((state) => ({ calendarFeeds: state.calendarFeeds.map((feed) => feed.id === id ? { ...feed, enabled } : feed) })),
      removeCalendarFeed: (id) => set((state) => ({
        calendarFeeds: state.calendarFeeds.filter((feed) => feed.id !== id),
        events: state.events.filter((event) => event.feedId !== id),
        feedErrors: Object.fromEntries(Object.entries(state.feedErrors).filter(([feedId]) => feedId !== id)),
      })),
      // Fetched feed events for [windowStart, windowEnd): replace that window for the loaded feeds, keep everything else
      // (other windows, feeds that errored this round, sample events). Events of removed or disabled feeds are dropped.
      applyFeedEvents: (feedIds, windowStart, windowEnd, loaded, errors) => set((state) => {
        const live = new Set(state.calendarFeeds.filter((feed) => feed.enabled).map((feed) => feed.id));
        const replaced = new Set(feedIds.filter((id) => !(id in errors)));
        const kept = state.events.filter((event) => event.provider !== 'ics' || (event.feedId !== undefined && live.has(event.feedId) && !(replaced.has(event.feedId) && event.startAt < windowEnd && event.endAt > windowStart)));
        const known = new Set(kept.map((event) => event.id));
        return { events: [...kept, ...loaded.filter((event) => event.feedId !== undefined && live.has(event.feedId) && !known.has(event.id))], feedErrors: errors };
      }),
      loadSampleData: () => set((state) => {
        const missing = initialCategories.filter((category) => !state.categories.some((item) => item.id === category.id));
        const base = state.categories.reduce((max, category) => Math.max(max, category.order), -1) + 1;
        return {
          // Sample data uses the four default lists, so bring back any of them that were archived too.
          categories: [...state.categories.map((category) => initialCategories.some((item) => item.id === category.id) ? { ...category, archived: false } : category), ...missing.map((category, index) => ({ ...category, order: base + index }))],
          projects: initialProjects, tasks: initialTasks, timeBlocks: initialTimeBlocks,
          events: [...state.events.filter((event) => event.provider !== 'mock'), ...initialEvents],
        };
      }),
      eraseAllData: () => set((state) => ({ projects: [], tasks: [], timeBlocks: [], events: state.events.filter((event) => event.provider !== 'mock'), lastDeleted: null, toast: null })),
      // Synced rows from another device. Upserts/removes by id per kind; leaves `order` and all derived rules alone.
      applyRemoteItems: (changes) => set((state) => {
        const of = (kind: RemoteChange['kind']) => changes.filter((change) => change.kind === kind);
        const categories = applyChanges(state.categories, of('category'));
        const projects = applyChanges(state.projects, of('project'));
        const tasks = applyChanges(state.tasks, of('task'));
        const timeBlocks = applyChanges(state.timeBlocks, of('timeBlock'));
        const routines = applyChanges(state.routines, of('routine'));
        const variant = of('preference').find((change) => change.id === 'dayMarkVariant' && !change.deleted)?.data as { value?: DayMarkVariant } | undefined;
        const feedsRow = of('preference').find((change) => change.id === 'calendarFeeds' && !change.deleted)?.data as { value?: CalendarFeed[] } | undefined;
        const calendarFeeds = Array.isArray(feedsRow?.value) && !sameData(feedsRow.value, state.calendarFeeds) ? feedsRow.value : state.calendarFeeds;
        const dayMarkVariant = variant?.value && ['ribbon', 'glass', 'wash', 'current', 'doodle'].includes(variant.value) ? variant.value : state.dayMarkVariant;
        if (categories === state.categories && projects === state.projects && tasks === state.tasks && timeBlocks === state.timeBlocks && routines === state.routines && dayMarkVariant === state.dayMarkVariant && calendarFeeds === state.calendarFeeds) return state;
        return { categories, projects, tasks, timeBlocks, routines, dayMarkVariant, calendarFeeds };
      }),
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
        calendarFeeds: state.calendarFeeds,
        carryoverDismissed: state.carryoverDismissed,
        collapsedListIds: state.collapsedListIds,
      }),
      // v1 -> v2: shapes are compatible; make sure every category has an `order` and routines exist.
      // v2 -> v3: Task.order optional; v3 -> v4: calendarFeeds defaults to []; v4 -> v5: folders (Project.deadline optional, pinned/order/archivedAt,
      // Task.missedOn, carryoverDismissed). Existing projects keep their deadlines and get `order` by deadline.
      // v5 -> v6: Routine.repeat optional (missing = daily); pass-through. v6 -> v7: collapsedListIds (device-local, defaults to []); pass-through.
      migrate: (persisted, version) => {
        let old = (persisted ?? {}) as Partial<DaymarkState>;
        if (version === 1 && Array.isArray(old.categories)) {
          old = { ...old, categories: old.categories.map((category, index) => ({ ...category, order: typeof category.order === 'number' ? category.order : index })), routines: [] };
        } else if (version < 1 || !Array.isArray(old.categories)) {
          // Only unreadable or pre-v1 data resets. Any other version (including a newer one written by a
          // later deploy) passes through so a version bump can never wipe someone's tasks.
          return { categories: initialCategories, routines: [], projects: [], tasks: [], timeBlocks: [], dayMarkVariant: 'doodle' as DayMarkVariant } as unknown as DaymarkState;
        }
        if (Array.isArray(old.projects)) {
          const ranked = old.projects.slice().sort((a, b) => (a.deadline ?? '').localeCompare(b.deadline ?? ''));
          old = { ...old, projects: old.projects.map((project) => ({ ...project, order: typeof project.order === 'number' ? project.order : ranked.indexOf(project) })) };
        }
        return old as DaymarkState;
      },
      onRehydrateStorage: () => (state) => {
        // The Classic style was retired from Settings; anyone who had it moves to Watercolor wash.
        if (state?.dayMarkVariant === 'current') state.setDayMarkVariant('wash');
        state?.setHasHydrated(true);
      },
    },
  ),
);
