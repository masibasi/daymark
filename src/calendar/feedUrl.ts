import { t } from '@/i18n';

// Same allowlist as supabase/functions/calendar-feed/parse.ts (normalizeFeedUrl). Keep them in sync; the server is the real gate.
const HOSTS = ['calendar.google.com', 'outlook.office365.com', 'outlook.live.com'];

// webcal:// -> https://. Returns the normalized URL, or an error message for the form.
export function checkFeedUrl(raw: string): { url: string } | { error: string } {
  let url: URL;
  try { url = new URL(raw.trim().replace(/^webcals?:\/\//i, 'https://')); } catch { return { error: t().settings.calendars.notALink }; }
  if (url.protocol !== 'https:') return { error: t().settings.calendars.badScheme };
  if (url.username || url.password || (url.port && url.port !== '443')) return { error: t().settings.calendars.unsupported };
  const host = url.hostname.toLowerCase();
  if (!HOSTS.includes(host) && !host.endsWith('.icloud.com')) return { error: t().settings.calendars.hosts };
  return { url: url.toString() };
}
