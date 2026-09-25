import { format } from 'date-fns';

// Real wall-clock time, used everywhere the app means "right now."
// `prototypeDate` in store/mockData.ts stays fixed and only anchors sample data.
export function now(): Date {
  return new Date();
}

export function todayKey(): string {
  return format(now(), 'yyyy-MM-dd');
}
