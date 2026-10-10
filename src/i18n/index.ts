import { useSyncExternalStore } from 'react';
import { format as dateFnsFormat } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { ko } from 'date-fns/locale/ko';
import { getLocales } from 'expo-localization';
import { en, type Dictionary } from './en';
import { ko as koDictionary } from './ko';

export type { Dictionary };
export type Language = 'system' | 'en' | 'ko';
export type Locale = 'en' | 'ko';
export type DateKey = keyof Dictionary['dates'];

const dictionaries: Record<Locale, Dictionary> = { en, ko: koDictionary };
const dateLocales = { en: enUS, ko } as const;

// The language preference lives in the store (persisted, device-local); this module keeps a mirror so it never imports the store
// (the store needs `t()` for its toasts). `setActiveLanguage` is called from the store on rehydrate and whenever Settings changes it.
let activeLanguage: Language = 'system';
const listeners = new Set<() => void>();

let cachedSystem: Locale | undefined;

// Korean when the device's first preferred language is Korean, otherwise English. Read once; the OS language rarely changes while the app runs.
export function systemLocale(): Locale {
  if (cachedSystem) return cachedSystem;
  try {
    cachedSystem = getLocales()[0]?.languageCode === 'ko' ? 'ko' : 'en';
  } catch {
    cachedSystem = 'en';
  }
  return cachedSystem;
}

export const resolveLocale = (language: Language): Locale => (language === 'system' ? systemLocale() : language);

export function setActiveLanguage(language: Language) {
  activeLanguage = language;
  if (typeof document !== 'undefined') document.documentElement.lang = resolveLocale(language);
  listeners.forEach((listener) => listener());
}

if (typeof document !== 'undefined') document.documentElement.lang = resolveLocale('system');

const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

// Non-hook getters for store, sync and toast code.
export const getLocale = (): Locale => resolveLocale(activeLanguage);
export const t = (): Dictionary => dictionaries[getLocale()];
export const dictionaryFor = (locale: Locale): Dictionary => dictionaries[locale];

/** Active locale ('en' | 'ko'); re-renders when the language changes. */
export function useLocale(): { locale: Locale; dateLocale: typeof enUS } {
  const locale = useSyncExternalStore(subscribe, getLocale, getLocale);
  return { locale, dateLocale: dateLocales[locale] };
}

/** The active dictionary; re-renders when the language changes. */
export function useT(): Dictionary {
  return dictionaries[useSyncExternalStore(subscribe, getLocale, getLocale)];
}

/** Formats a date with the active locale and the language's pattern for `key` (see `dates` in the dictionaries). */
export function formatDate(date: Date | number, key: DateKey): string {
  const locale = getLocale();
  return dateFnsFormat(date, dictionaries[locale].dates[key], { locale: dateLocales[locale] });
}

/** Hook form of `formatDate`, so the component re-renders when the language changes. */
export function useFormat(): (date: Date | number, key: DateKey) => string {
  useLocale();
  return formatDate;
}

/** "2:00 – 3:30 PM" / "오후 2:00 – 3:30": a time range in the active language. */
export function formatTimeRange(start: Date, end: Date): string {
  const copy = t();
  const samePeriod = formatDate(start, 'period') === formatDate(end, 'period');
  return copy.calendar.timeRange(formatDate(start, 'time'), formatDate(start, 'timeShort'), formatDate(end, 'time'), formatDate(end, 'timeShort'), samePeriod);
}

/** Raw date-fns format with the active locale, for patterns that are the same in every language (e.g. a single weekday letter 'EEEEE'). */
export function formatWith(date: Date | number, pattern: string): string {
  return dateFnsFormat(date, pattern, { locale: dateLocales[getLocale()] });
}
