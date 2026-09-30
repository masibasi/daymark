// Pure merge rules for sync. No store, network, or storage imports so they can be tested in isolation.
export type SyncKind = 'category' | 'project' | 'task' | 'timeBlock' | 'routine' | 'preference';

// A local change not yet confirmed by the server. `data` is kept for deletes so a tombstone row can still be pushed after a reload.
export interface DirtyEntry { kind: SyncKind; id: string; clientUpdatedAt: string; deleted: boolean; data?: unknown }
export interface RemoteRow { kind: SyncKind; id: string; data: unknown; deleted: boolean; client_updated_at: string; updated_at: string }
export interface RemoteChange { kind: SyncKind; id: string; deleted: boolean; data: unknown }

export const EPOCH = '1970-01-01T00:00:00.000Z';
export const dirtyKey = (kind: SyncKind, id: string) => `${kind}:${id}`;

// Items are replaced (not mutated) when they change, so reference equality finds what changed.
export function diffCollections<T extends { id: string }>(prev: T[], next: T[]): { upserted: T[]; removed: T[] } {
  const before = new Map(prev.map((item) => [item.id, item]));
  const nextIds = new Set(next.map((item) => item.id));
  return {
    upserted: next.filter((item) => before.get(item.id) !== item),
    removed: prev.filter((item) => !nextIds.has(item.id)),
  };
}

// Local wins only when it was edited after the server copy; otherwise the server copy applies.
export function decideRemote(row: Pick<RemoteRow, 'client_updated_at'>, dirty?: Pick<DirtyEntry, 'clientUpdatedAt'>): 'apply' | 'skip' {
  return dirty && Date.parse(dirty.clientUpdatedAt) > Date.parse(row.client_updated_at) ? 'skip' : 'apply';
}

export function maxUpdatedAt(rows: Pick<RemoteRow, 'updated_at'>[], current?: string): string | undefined {
  return rows.reduce<string | undefined>((max, row) => (!max || Date.parse(row.updated_at) > Date.parse(max) ? row.updated_at : max), current);
}

// Key-order independent, undefined-dropping comparison (Postgres jsonb reorders keys).
const stable = (value: unknown): string => JSON.stringify(value, (_key, inner: unknown) => inner && typeof inner === 'object' && !Array.isArray(inner)
  ? Object.fromEntries(Object.entries(inner as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : 1)))
  : inner);
export const sameData = (a: unknown, b: unknown) => stable(a) === stable(b);

// Upsert/remove changes of one kind by id. Returns the same array when nothing differs.
export function applyChanges<T extends { id: string }>(items: T[], changes: RemoteChange[]): T[] {
  let result = items;
  for (const change of changes) {
    const index = result.findIndex((item) => item.id === change.id);
    if (change.deleted) {
      if (index >= 0) result = result.filter((item) => item.id !== change.id);
    } else if (index < 0) {
      result = [...result, change.data as T];
    } else if (!sameData(result[index], change.data)) {
      result = result.map((item, i) => (i === index ? (change.data as T) : item));
    }
  }
  return result;
}
