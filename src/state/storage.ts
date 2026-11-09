// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * localStorage persistence. Every access is guarded: storage can be missing, full, or
 * throw (Safari private mode, blocked site data). The app keeps working in memory either way.
 */
import { StateError, type StateErrorCode } from './errors';
import { createEmptyState, parseJson, parseState } from './migrations';
import type { UserState } from './schema';

export const STORAGE_KEY = 'effectiveaf:state';
export const CORRUPT_KEY_PREFIX = 'effectiveaf:corrupt:';

export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Returns localStorage if it can actually be written to, else undefined. */
export function getBrowserStorage(): KeyValueStore | undefined {
  try {
    const storage = window.localStorage;
    const probe = 'effectiveaf:probe';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return undefined;
  }
}

export type LoadStatus = 'loaded' | 'new' | 'recovered' | 'unavailable';

export interface LoadResult {
  state: UserState;
  status: LoadStatus;
  problem?: StateErrorCode;
}

export function loadState(storage: KeyValueStore | undefined, nowIso: string): LoadResult {
  if (!storage) return { state: createEmptyState(nowIso), status: 'unavailable' };

  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { state: createEmptyState(nowIso), status: 'unavailable' };
  }
  if (raw === null) return { state: createEmptyState(nowIso), status: 'new' };

  try {
    return { state: parseState(parseJson(raw)), status: 'loaded' };
  } catch (err) {
    // Never silently discard what the user had: park the unreadable data under a side key.
    try {
      storage.setItem(`${CORRUPT_KEY_PREFIX}${nowIso}`, raw);
    } catch {
      // Storage full or failing; nothing more we can do.
    }
    const problem = err instanceof StateError ? err.code : 'invalid-shape';
    return { state: createEmptyState(nowIso), status: 'recovered', problem };
  }
}

/** Returns false if the write failed (quota, storage disabled). */
export function saveState(storage: KeyValueStore, state: UserState): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export interface DebouncedSaver {
  schedule(state: UserState): void;
  /** Writes any pending state immediately (call on page hide). */
  flush(): void;
}

export function createDebouncedSaver(
  save: (state: UserState) => void,
  delayMs: number,
): DebouncedSaver {
  let pending: UserState | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const flush = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    if (pending !== undefined) {
      const state = pending;
      pending = undefined;
      save(state);
    }
  };

  return {
    schedule(state) {
      pending = state;
      if (timer !== undefined) clearTimeout(timer);
      timer = setTimeout(flush, delayMs);
    },
    flush,
  };
}
