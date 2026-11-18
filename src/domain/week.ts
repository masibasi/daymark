// The week starts on Sunday everywhere (Today history, Calendar, Reflection, date pickers).
export const WEEK_STARTS_ON = 0 as const;
export const WEEK_OPTIONS = { weekStartsOn: WEEK_STARTS_ON } as const;
// Weekday numbers (0 = Sunday) in display order, starting from WEEK_STARTS_ON.
export const WEEK_DAY_ORDER: number[] = Array.from({ length: 7 }, (_, index) => (index + WEEK_STARTS_ON) % 7);
