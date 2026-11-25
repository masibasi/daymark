// Spike B probe: pure module imported by both Deno (Edge Function) and the Expo app.
import { addDays, format } from 'date-fns';
import type { ProbeOptions } from './sharedTypes.ts';

export function probeTomorrow(options: ProbeOptions = { pattern: 'yyyy-MM-dd' }): string {
  return format(addDays(new Date(0), 1), options.pattern);
}
