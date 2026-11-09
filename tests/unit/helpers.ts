// SPDX-License-Identifier: GPL-3.0-or-later
import type { KeyValueStore } from '../../src/state/storage';

export interface MemoryStorage extends KeyValueStore {
  data: Map<string, string>;
}

/** In-memory stand-in for localStorage. `failWrites` simulates a full or blocked store. */
export function memoryStorage(
  initial: Record<string, string> = {},
  opts: { failReads?: boolean; failWrites?: boolean } = {},
): MemoryStorage {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem(key) {
      if (opts.failReads) throw new Error('SecurityError');
      return data.get(key) ?? null;
    },
    setItem(key, value) {
      if (opts.failWrites) throw new Error('QuotaExceededError');
      data.set(key, value);
    },
    removeItem(key) {
      data.delete(key);
    },
  };
}

export const FIXED_NOW = new Date('2026-11-08T12:00:00');
export const FIXED_AS_OF = '2026-11-08';
