import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import { useDaymarkStore } from '@/store/useDaymarkStore';
import { getClient } from './client';
import { decideRemote, diffCollections, dirtyKey, EPOCH, maxUpdatedAt, type DirtyEntry, type RemoteChange, type RemoteRow, type SyncKind } from './merge';
import { setSyncStatus, useSyncStatus } from './syncStore';

// Local-first sync: the store stays the source of truth; signed in, changes are pushed and other devices' rows are pulled into it.
// Design notes live in docs/ARCHITECTURE.md ("Sync").
const STORAGE_KEY = 'daymark-sync-v1';
const TABLE = 'daymark_items';
const PUSH_DELAY_MS = 1500;
const POLL_MS = 60_000;
const PAGE = 1000;
const BATCH = 200;

interface SyncState { userId?: string; dirty: Record<string, DirtyEntry>; lastPulledAt?: string }
type DomainState = ReturnType<typeof useDaymarkStore.getState>;
type Id = { id: string };

let state: SyncState = { dirty: {} };
let applyingRemote = false;
let started = false;
let running = false;
let rerun = false;
let pushTimer: ReturnType<typeof setTimeout> | undefined;

const collections = (s: DomainState): Record<Exclude<SyncKind, 'preference'>, Id[]> => ({ category: s.categories, project: s.projects, task: s.tasks, timeBlock: s.timeBlocks, routine: s.routines });
const kinds = ['category', 'project', 'task', 'timeBlock', 'routine'] as const;

const saveState = () => { AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => undefined); };
const markDirty = (kind: SyncKind, id: string, deleted: boolean, data?: unknown, clientUpdatedAt = new Date().toISOString()) => { state.dirty[dirtyKey(kind, id)] = { kind, id, clientUpdatedAt, deleted, data }; };
const signedIn = () => useSyncStatus.getState().status !== 'signedOut';

// Record what changed between two store snapshots. Skipped while remote rows are being applied.
function trackChanges(prev: DomainState, next: DomainState) {
  if (applyingRemote) return;
  const before = collections(prev);
  const after = collections(next);
  let changed = false;
  for (const kind of kinds) {
    const { upserted, removed } = diffCollections(before[kind], after[kind]);
    upserted.forEach((item) => markDirty(kind, item.id, false));
    removed.forEach((item) => markDirty(kind, item.id, true, item));
    changed ||= upserted.length > 0 || removed.length > 0;
  }
  if (prev.dayMarkVariant !== next.dayMarkVariant) { markDirty('preference', 'dayMarkVariant', false); changed = true; }
  if (!changed) return;
  saveState();
  if (signedIn()) schedulePush();
}

function schedulePush() {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => { void syncNow(); }, PUSH_DELAY_MS);
}

// First sync for a user on this device: every local item is "older than anything on the server" so server copies win; leftovers get pushed.
function markEverythingDirty() {
  const current = useDaymarkStore.getState();
  state.dirty = {};
  const all = collections(current);
  kinds.forEach((kind) => all[kind].forEach((item) => markDirty(kind, item.id, false, undefined, EPOCH)));
  markDirty('preference', 'dayMarkVariant', false, undefined, EPOCH);
}

async function pull() {
  const client = getClient();
  const rows: RemoteRow[] = [];
  for (let from = 0; ; from += PAGE) {
    let query = client.from(TABLE).select('kind,id,data,deleted,client_updated_at,updated_at').order('updated_at').order('kind').order('id').range(from, from + PAGE - 1);
    if (state.lastPulledAt) query = query.gt('updated_at', state.lastPulledAt);
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...(data as RemoteRow[]));
    if (data.length < PAGE) break;
  }
  if (!rows.length) return;
  const changes: RemoteChange[] = [];
  for (const row of rows) {
    const key = dirtyKey(row.kind, row.id);
    if (decideRemote(row, state.dirty[key]) === 'skip') continue;
    changes.push({ kind: row.kind, id: row.id, deleted: row.deleted, data: row.data });
    delete state.dirty[key];
  }
  applyingRemote = true;
  try { useDaymarkStore.getState().applyRemoteItems(changes); } finally { applyingRemote = false; }
  state.lastPulledAt = maxUpdatedAt(rows, state.lastPulledAt);
  saveState();
}

// Current local value for a dirty entry (tombstones use the last known copy).
function rowData(entry: DirtyEntry, current: DomainState): unknown {
  if (entry.deleted) return entry.data ?? {};
  if (entry.kind === 'preference') return { value: current.dayMarkVariant };
  return collections(current)[entry.kind].find((item) => item.id === entry.id);
}

async function push() {
  const client = getClient();
  const entries = Object.values(state.dirty);
  for (let i = 0; i < entries.length; i += BATCH) {
    const current = useDaymarkStore.getState();
    const sendable = entries.slice(i, i + BATCH).flatMap((entry) => {
      const data = rowData(entry, current);
      return data === undefined ? [] : [{ entry, row: { user_id: state.userId, kind: entry.kind, id: entry.id, data, deleted: entry.deleted, client_updated_at: entry.clientUpdatedAt } }];
    });
    if (!sendable.length) continue;
    const { error } = await client.from(TABLE).upsert(sendable.map((item) => item.row), { onConflict: 'user_id,kind,id' });
    if (error) throw error;
    // Only forget entries that were not edited again while the request was in flight.
    sendable.forEach(({ entry }) => {
      const key = dirtyKey(entry.kind, entry.id);
      if (state.dirty[key]?.clientUpdatedAt === entry.clientUpdatedAt) delete state.dirty[key];
    });
    saveState();
  }
}

const isNetworkError = (error: unknown) => {
  const { message = '', status } = (error ?? {}) as { message?: string; status?: number };
  return status === 0 || /fetch|network|offline|timed? ?out/i.test(message) || (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.onLine === false);
};

// One sync cycle: pull, then push. Dirty entries are only dropped on success, so a failure loses nothing.
export async function syncNow() {
  if (!signedIn() || !state.userId) return;
  if (running) { rerun = true; return; }
  running = true;
  clearTimeout(pushTimer);
  setSyncStatus({ status: 'syncing', error: undefined });
  try {
    await pull();
    await push();
    setSyncStatus({ status: 'idle', lastSyncedAt: Date.now(), error: undefined });
  } catch (error) {
    const message = (error as { message?: string } | null)?.message ?? 'Sync failed.';
    if (isNetworkError(error)) setSyncStatus({ status: 'offline', error: undefined });
    else setSyncStatus({ status: 'error', error: message });
  } finally {
    running = false;
    if (rerun && useSyncStatus.getState().status !== 'signedOut') { rerun = false; void syncNow(); } else rerun = false;
  }
}

function adopt(session: Session) {
  const email = session.user.email ?? undefined;
  if (useSyncStatus.getState().status !== 'signedOut' && useSyncStatus.getState().email === email) return;
  if (state.userId !== session.user.id) {
    state = { userId: session.user.id, dirty: {}, lastPulledAt: undefined };
    markEverythingDirty();
    saveState();
  }
  setSyncStatus({ email, status: 'idle', error: undefined });
  void syncNow();
}

function onTrigger() { if (signedIn()) void syncNow(); }

async function init() {
  const snapshot = useDaymarkStore.getState();
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) state = { dirty: {}, ...(JSON.parse(stored) as Partial<SyncState>) };
  } catch { /* unreadable sync state: start clean; first sync re-marks everything */ }
  // Catch edits made while the saved sync state was loading, then follow the store.
  trackChanges(snapshot, useDaymarkStore.getState());
  useDaymarkStore.subscribe((next, prev) => trackChanges(prev, next));

  getClient().auth.onAuthStateChange((event, session) => {
    // Never await Supabase calls inside this callback; hand off to the next tick.
    setTimeout(() => {
      if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) adopt(session);
      else if (event === 'SIGNED_OUT') setSyncStatus({ email: undefined, status: 'signedOut', error: undefined });
    }, 0);
  });

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') onTrigger(); });
    window.addEventListener('focus', onTrigger);
    window.addEventListener('online', onTrigger);
  } else {
    AppState.addEventListener('change', (next) => { if (next === 'active') onTrigger(); });
  }
  setInterval(() => { if (Platform.OS !== 'web' || document.visibilityState === 'visible') onTrigger(); }, POLL_MS);
}

// Call once, after the store has hydrated.
export function startSync() {
  if (started) return;
  started = true;
  void init();
}

export async function signIn(email: string, password: string): Promise<string | undefined> {
  const { error } = await getClient().auth.signInWithPassword({ email: email.trim(), password });
  return error?.message;
}

// Confirm email is off in the project, so sign-up returns a session; fall back to an explicit sign-in otherwise.
export async function signUp(email: string, password: string): Promise<string | undefined> {
  const { data, error } = await getClient().auth.signUp({ email: email.trim(), password });
  if (error) return error.message;
  return data.session ? undefined : signIn(email, password);
}

export async function signOut() {
  clearTimeout(pushTimer);
  await getClient().auth.signOut({ scope: 'local' });
}
