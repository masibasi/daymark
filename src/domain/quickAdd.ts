import { addDays, format } from 'date-fns';
import type { Category, Project } from './types';
import { WEEK_STARTS_ON } from './week';

// Pure parser behind the quick-add field. English and Korean words work in either UI language, so nobody has to switch.
//   tomorrow / 내일, today / 오늘, 모레, mon..sun / 월요일..일요일 (the next one), "next mon" / "다음 주 월요일" (that day next week)
//   #list     -> the list whose name matches (case-insensitive, prefix ok)
//   @folder   -> the folder whose title matches; the task becomes a step of that folder
// Anything not recognized (including unknown #tags) stays in the title. Default: today, in the last used list.

export interface QuickAddContext {
  today: Date;
  categories: Pick<Category, 'id' | 'name' | 'order' | 'archived'>[];
  projects: Pick<Project, 'id' | 'title' | 'categoryId' | 'status' | 'order'>[];
  lastUsedListId?: string;
}

export interface QuickAddPlan {
  title: string; // empty when there is nothing to add (or no list to add to)
  date?: string; // yyyy-MM-dd; undefined only for a folder step with no date word
  categoryId?: string; // undefined only when there is no active list
  projectId?: string;
  dateGiven: boolean; // a date word was typed (otherwise the default, today)
  listGiven: boolean; // a #list matched
}

const WEEKDAYS: Record<string, number> = {
  sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tues: 2, tuesday: 2, wed: 3, weds: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4, fri: 5, friday: 5, sat: 6, saturday: 6,
  일요일: 0, 월요일: 1, 화요일: 2, 수요일: 3, 목요일: 4, 금요일: 5, 토요일: 6,
};
const OFFSETS: Record<string, number> = { today: 0, tomorrow: 1, tmrw: 1, 오늘: 0, 내일: 1, 모레: 2 };
const NEXT_WORDS = new Set(['next', '다음']);
const NEXT_WEEK_WORDS = new Set(['주', '다음주']); // "다음 주" is two tokens, "다음주" one
// Korean particles that may trail a date word ("금요일까지", "내일은"); dropped together with it.
const KO_TAIL = /(에|엔|까지|은|는)$/;

const key = (date: Date) => format(date, 'yyyy-MM-dd');
const clean = (token: string) => token.replace(/[,.;:!?]+$/, '');
const norm = (text: string) => text.normalize('NFC').toLowerCase().replace(/[\s_-]+/g, '');

function dateWord(raw: string): { offset: number } | { weekday: number } | undefined {
  const word = clean(raw).toLowerCase();
  const stripped = /[가-힣]/.test(word) ? word.replace(KO_TAIL, '') : word;
  for (const candidate of stripped === word ? [word] : [word, stripped]) {
    if (candidate in OFFSETS) return { offset: OFFSETS[candidate] };
    if (candidate in WEEKDAYS) return { weekday: WEEKDAYS[candidate] };
  }
  return undefined;
}

function findByName<T>(items: T[], nameOf: (item: T) => string, query: string): T | undefined {
  const q = norm(query);
  if (!q) return undefined;
  return items.find((item) => norm(nameOf(item)) === q) ?? items.find((item) => norm(nameOf(item)).startsWith(q));
}

// The date a word points to: a weekday is its next occurrence (never today); "next" jumps to that day in next week.
function resolveDate(today: Date, hit: { offset: number } | { weekday: number }, next: boolean): Date {
  if ('offset' in hit) return addDays(today, hit.offset);
  if (next) {
    const nextWeekStart = addDays(today, 7 - ((today.getDay() - WEEK_STARTS_ON + 7) % 7));
    return addDays(nextWeekStart, (hit.weekday - WEEK_STARTS_ON + 7) % 7);
  }
  return addDays(today, (hit.weekday - today.getDay() + 7) % 7 || 7);
}

export function parseQuickAdd(input: string, ctx: QuickAddContext): QuickAddPlan {
  const lists = ctx.categories.filter((category) => !category.archived).sort((a, b) => a.order - b.order);
  const folders = ctx.projects.filter((project) => project.status !== 'archived').sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const tokens = input.normalize('NFC').split(/\s+/).filter(Boolean);
  const used = new Array<boolean>(tokens.length).fill(false);
  let date: Date | undefined;
  let list: (typeof lists)[number] | undefined;
  let folder: (typeof folders)[number] | undefined;

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (!date) {
      // "next mon", "다음 주 월요일", "다음주 월요일"
      if (NEXT_WORDS.has(clean(token).toLowerCase())) {
        const skipWeek = i + 2 < tokens.length && NEXT_WEEK_WORDS.has(tokens[i + 1]);
        const wordIndex = skipWeek ? i + 2 : i + 1;
        const hit = wordIndex < tokens.length ? dateWord(tokens[wordIndex]) : undefined;
        if (hit && 'weekday' in hit && (skipWeek || token.toLowerCase().startsWith('next'))) {
          date = resolveDate(ctx.today, hit, true);
          for (let j = i; j <= wordIndex; j += 1) used[j] = true;
          i = wordIndex;
          continue;
        }
      }
      if (token.startsWith('다음주') && token.length === 3 && i + 1 < tokens.length) {
        const hit = dateWord(tokens[i + 1]);
        if (hit && 'weekday' in hit) { date = resolveDate(ctx.today, hit, true); used[i] = used[i + 1] = true; i += 1; continue; }
      }
      const hit = dateWord(token);
      if (hit) { date = resolveDate(ctx.today, hit, false); used[i] = true; continue; }
    }
    if (!list && token.length > 1 && token[0] === '#') {
      const match = findByName(lists, (item) => item.name, clean(token).slice(1));
      if (match) { list = match; used[i] = true; continue; }
    }
    if (!folder && token.length > 1 && token[0] === '@') {
      const match = findByName(folders, (item) => item.title, clean(token).slice(1));
      if (match) { folder = match; used[i] = true; }
    }
  }

  const title = tokens.filter((_, index) => !used[index]).join(' ');
  if (folder) {
    // A folder step belongs to the folder's list; it is only planned on a day if one was typed.
    return { title, categoryId: folder.categoryId, projectId: folder.id, ...(date ? { date: key(date) } : {}), dateGiven: Boolean(date), listGiven: false };
  }
  const fallback = lists.find((item) => item.id === ctx.lastUsedListId) ?? lists[0];
  const target = list ?? fallback;
  return {
    title: target ? title : '',
    categoryId: target?.id,
    date: key(date ?? ctx.today),
    dateGiven: Boolean(date),
    listGiven: Boolean(list),
  };
}
