// The publishable key is designed to be public; row-level security (supabase/schema.sql) guards the data.
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://ojsmbjerdquvtffqrxlq.supabase.co';
export const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? 'sb_publishable_ulSWsM5Yfm47qw0CWS78Ug_3vsZ4IaG';
