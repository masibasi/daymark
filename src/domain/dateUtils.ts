import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import type { ISODate, ISODateTime } from './types';

/** "2026-09-18" style key from any Date. */
export function toDateKey(date: Date): ISODate {
  return format(date, 'yyyy-MM-dd');
}

/** Extract the date-key portion of an ISODateTime ("...T14:00" -> "2026-09-18"). */
export function dateKeyOf(iso: ISODateTime | ISODate): ISODate {
  return iso.slice(0, 10);
}

export function parseDateKey(key: ISODate): Date {
  return parseISO(key);
}

export function isSameDateKey(iso: ISODateTime | ISODate, key: ISODate): boolean {
  return dateKeyOf(iso) === key;
}

export function weekRange(date: Date): { start: Date; end: Date } {
  return {
    start: startOfWeek(date, { weekStartsOn: 0 }),
    end: endOfWeek(date, { weekStartsOn: 0 }),
  };
}

export function daysOfWeek(date: Date): Date[] {
  const { start, end } = weekRange(date);
  return eachDayOfInterval({ start, end });
}

/** 6x7 month grid days, including leading/trailing days from adjacent months. */
export function monthGridDays(date: Date): Date[] {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  // Ensure a full 6-row grid (42 cells) for consistent layout.
  while (days.length < 42) {
    days.push(addDays(days[days.length - 1], 1));
  }
  return days.slice(0, 42);
}

export function isToday(date: Date, today: Date): boolean {
  return isSameDay(date, today);
}

/** Whole-day difference: deadline - today. Negative = overdue. */
export function daysUntil(deadline: ISODate, today: Date): number {
  return differenceInCalendarDays(parseISO(deadline), today);
}

export function formatDayLabel(date: Date): string {
  return format(date, 'EEE');
}

export function formatDayNumber(date: Date): string {
  return format(date, 'd');
}

export function formatMonthTitle(date: Date): string {
  return format(date, 'MMMM yyyy');
}

export function formatTime(iso: ISODateTime): string {
  return format(parseISO(iso), 'h:mma').toLowerCase();
}

export function hourOf(iso: ISODateTime): number {
  const d = parseISO(iso);
  return d.getHours() + d.getMinutes() / 60;
}

/** Current wall-clock hour (real device time), used only to position the
 * "now" line on whichever column represents today. */
export function currentHour(): number {
  const d = new Date();
  return d.getHours() + d.getMinutes() / 60;
}
