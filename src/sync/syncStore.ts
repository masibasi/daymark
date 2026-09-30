import { create } from 'zustand';

export type SyncStatus = 'signedOut' | 'idle' | 'syncing' | 'offline' | 'error';
interface SyncStatusState { email?: string; status: SyncStatus; lastSyncedAt?: number; error?: string }

// UI-facing status only; the engine (engine.ts) owns the logic.
export const useSyncStatus = create<SyncStatusState>(() => ({ status: 'signedOut' }));
export const setSyncStatus = (patch: Partial<SyncStatusState>) => useSyncStatus.setState(patch);
