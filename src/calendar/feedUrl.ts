// Same allowlist as supabase/functions/calendar-feed/parse.ts (normalizeFeedUrl). Keep them in sync; the server is the real gate.
const HOSTS = ['calendar.google.com', 'outlook.office365.com', 'outlook.live.com'];

// webcal:// -> https://. Returns the normalized URL, or an error message for the form.
export function checkFeedUrl(raw: string): { url: string } | { error: string } {
  let url: URL;
  try { url = new URL(raw.trim().replace(/^webcals?:\/\//i, 'https://')); } catch { return { error: 'That does not look like a calendar link.' }; }
  if (url.protocol !== 'https:') return { error: 'Calendar links must start with https:// or webcal://.' };
  if (url.username || url.password || (url.port && url.port !== '443')) return { error: 'That calendar link is not supported.' };
  const host = url.hostname.toLowerCase();
  if (!HOSTS.includes(host) && !host.endsWith('.icloud.com')) return { error: 'Only Google, iCloud, and Outlook calendar links are supported.' };
  return { url: url.toString() };
}
