// Pure backup logic: build, validate and parse a full JSON backup, and flatten tasks to CSV. No React / React Native imports.
import { format, parseISO } from 'date-fns';
import { formatDate, t } from '@/i18n';
import { isCustomMark } from './markPath';
import type { CalendarFeed, Category, CustomMark, DayMarkVariant, Project, Routine, Task, TimeBlock } from './types';

export const BACKUP_APP = 'daymark';
export const BACKUP_FORMAT = 1;

export interface BackupData {
  categories: Category[];
  projects: Project[];
  tasks: Task[];
  routines: Routine[];
  timeBlocks: TimeBlock[];
  dayMarkVariant: DayMarkVariant;
  customMark?: CustomMark;
  calendarFeeds: CalendarFeed[];
}

export interface Backup { app: typeof BACKUP_APP; format: number; exportedAt: string; data: BackupData }
export interface BackupCounts { lists: number; folders: number; tasks: number; routines: number }
export type ParseResult = { ok: true; backup: Backup; counts: BackupCounts } | { ok: false; reason: string };

const variants: DayMarkVariant[] = ['ribbon', 'glass', 'wash', 'current', 'doodle', 'custom'];
const projectStatuses = ['active', 'done', 'archived'];

export function buildBackup(state: BackupData, exportedAt: Date = new Date()): Backup {
  const { categories, projects, tasks, routines, timeBlocks, dayMarkVariant, customMark, calendarFeeds } = state;
  const data: BackupData = { categories, projects, tasks, routines, timeBlocks, dayMarkVariant, calendarFeeds };
  if (customMark) data.customMark = customMark;
  return { app: BACKUP_APP, format: BACKUP_FORMAT, exportedAt: exportedAt.toISOString(), data };
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const str = (value: unknown): value is string => typeof value === 'string';
const optStr = (value: unknown) => value === undefined || typeof value === 'string';

// Keep well-formed objects with unique string ids; anything else is dropped.
function clean<T>(value: unknown, ok: (item: Record<string, unknown>) => boolean): T[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const kept: T[] = [];
  for (const item of value) {
    if (!isRecord(item) || !str(item.id) || !item.id || seen.has(item.id) || !ok(item)) continue;
    seen.add(item.id);
    kept.push(item as T);
  }
  return kept;
}

export function parseBackup(text: string): ParseResult {
  const fail = (reason: string): ParseResult => ({ ok: false, reason });
  let raw: unknown;
  try { raw = JSON.parse(text.replace(/^﻿/, '')); } catch { return fail(t().backup.notBackup); }
  if (!isRecord(raw) || raw.app !== BACKUP_APP || typeof raw.format !== 'number' || !isRecord(raw.data)) return fail(t().backup.notBackup);
  if (!Number.isInteger(raw.format) || raw.format < 1) return fail(t().backup.notBackup);
  if (raw.format > BACKUP_FORMAT) return fail(t().backup.tooNew);
  const data = raw.data;
  if (!Array.isArray(data.categories) || !Array.isArray(data.tasks)) return fail(t().backup.notBackup);

  const categories = clean<Category>(data.categories, (c) => str(c.name) && typeof c.order === 'number' && Number.isFinite(c.order) && str(c.colorKey));
  const categoryIds = new Set(categories.map((c) => c.id));
  const projects = clean<Project>(data.projects, (p) => str(p.title) && str(p.categoryId) && categoryIds.has(p.categoryId) && str(p.status) && projectStatuses.includes(p.status) && optStr(p.deadline));
  const projectIds = new Set(projects.map((p) => p.id));
  const tasks = clean<Task>(data.tasks, (t) => str(t.title) && str(t.categoryId) && categoryIds.has(t.categoryId) && optStr(t.scheduledDate) && optStr(t.completedAt) && optStr(t.routineId) && (t.projectId === undefined || (str(t.projectId) && projectIds.has(t.projectId))));
  const taskIds = new Set(tasks.map((t) => t.id));
  const routines = clean<Routine>(data.routines, (r) => str(r.title) && str(r.categoryId) && categoryIds.has(r.categoryId) && typeof r.order === 'number' && Number.isFinite(r.order));
  const timeBlocks = clean<TimeBlock>(data.timeBlocks, (b) => str(b.taskId) && taskIds.has(b.taskId) && str(b.startAt) && str(b.endAt));
  const calendarFeeds = clean<CalendarFeed>(data.calendarFeeds, (f) => str(f.name) && str(f.url) && typeof f.enabled === 'boolean');
  const customMark = isCustomMark(data.customMark) ? data.customMark : undefined;
  const variant = variants.includes(data.dayMarkVariant as DayMarkVariant) ? (data.dayMarkVariant as DayMarkVariant) : 'doodle';
  const dayMarkVariant = variant === 'custom' && !customMark ? 'doodle' : variant;
  const exportedAt = str(raw.exportedAt) && !Number.isNaN(Date.parse(raw.exportedAt)) ? raw.exportedAt : new Date(0).toISOString();

  const backup: Backup = { app: BACKUP_APP, format: raw.format, exportedAt, data: { categories, projects, tasks, routines, timeBlocks, dayMarkVariant, customMark, calendarFeeds } };
  return { ok: true, backup, counts: { lists: categories.length, folders: projects.length, tasks: tasks.length, routines: routines.length } };
}

export function countsLine(counts: BackupCounts, exportedAt: string): string {
  const copy = t().backup;
  const when = Date.parse(exportedAt) > 0 ? copy.exportedOn(formatDate(parseISO(exportedAt), 'monthDay')) : '';
  return [copy.lists(counts.lists), copy.folders(counts.folders), copy.tasks(counts.tasks), copy.routines(counts.routines)].join(copy.separator) + when;
}

// CSV headers and the done/open status stay English in every language: a spreadsheet export is a data file, and fixed column names keep it portable.
const CSV_HEADER = ['Title', 'List', 'Folder', 'Scheduled date', 'Completed at', 'Routine', 'Status'];

// Quote when needed; neutralise cells a spreadsheet would run as a formula.
function cell(value: string): string {
  const safe = /^[=+@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function tasksToCsv(tasks: Task[], categories: Category[], projects: Project[], routines: Routine[]): string {
  const list = new Map(categories.map((c) => [c.id, c.name]));
  const folder = new Map(projects.map((p) => [p.id, p.title]));
  const routine = new Map(routines.map((r) => [r.id, r.title]));
  const rows = tasks.map((t) => {
    const done = t.completedAt && !Number.isNaN(Date.parse(t.completedAt)) ? format(parseISO(t.completedAt), 'yyyy-MM-dd HH:mm') : '';
    return [t.title, list.get(t.categoryId) ?? '', t.projectId ? folder.get(t.projectId) ?? '' : '', t.scheduledDate ?? '', done, t.routineId ? routine.get(t.routineId) ?? '' : '', t.completedAt ? 'done' : 'open'];
  });
  return '﻿' + [CSV_HEADER, ...rows].map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n';
}
