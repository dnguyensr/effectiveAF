// SPDX-License-Identifier: GPL-3.0-or-later
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEmptyState } from '../../../src/state/migrations';
import {
  CORRUPT_KEY_PREFIX,
  createDebouncedSaver,
  getBrowserStorage,
  loadState,
  saveState,
  STORAGE_KEY,
} from '../../../src/state/storage';
import { memoryStorage } from '../helpers';

const NOW = '2026-11-08T12:00:00.000Z';

describe('loadState', () => {
  it('starts fresh when storage is unavailable', () => {
    expect(loadState(undefined, NOW).status).toBe('unavailable');
    expect(loadState(memoryStorage({}, { failReads: true }), NOW).status).toBe('unavailable');
  });

  it('starts fresh on a first visit', () => {
    const r = loadState(memoryStorage(), NOW);
    expect(r.status).toBe('new');
    expect(r.state.wallet).toEqual([]);
  });

  it('loads valid saved state', () => {
    const saved = { ...createEmptyState(NOW), wallet: ['amex-gold'] };
    const r = loadState(memoryStorage({ [STORAGE_KEY]: JSON.stringify(saved) }), NOW);
    expect(r.status).toBe('loaded');
    expect(r.state.wallet).toEqual(['amex-gold']);
  });

  it.each([
    ['{not json', 'invalid-json'],
    ['{"schemaVersion":99}', 'newer-version'],
    ['{"schemaVersion":1,"wallet":"oops"}', 'invalid-shape'],
  ])('keeps unreadable data %j under a side key and starts fresh', (raw, problem) => {
    const storage = memoryStorage({ [STORAGE_KEY]: raw });
    const r = loadState(storage, NOW);
    expect(r.status).toBe('recovered');
    expect(r.problem).toBe(problem);
    expect(r.state.wallet).toEqual([]);
    expect(storage.data.get(`${CORRUPT_KEY_PREFIX}${NOW}`)).toBe(raw);
  });

  it('still recovers when the side copy cannot be written', () => {
    const storage = memoryStorage({ [STORAGE_KEY]: '{bad' }, { failWrites: true });
    expect(loadState(storage, NOW).status).toBe('recovered');
  });
});

describe('saveState', () => {
  it('writes JSON and reports success', () => {
    const storage = memoryStorage();
    expect(saveState(storage, createEmptyState(NOW))).toBe(true);
    expect(JSON.parse(storage.data.get(STORAGE_KEY) ?? '')).toMatchObject({ schemaVersion: 1 });
  });

  it('reports failure instead of throwing', () => {
    expect(saveState(memoryStorage({}, { failWrites: true }), createEmptyState(NOW))).toBe(false);
  });
});

describe('createDebouncedSaver', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('coalesces rapid changes into one write of the latest state', () => {
    vi.useFakeTimers();
    const save = vi.fn();
    const saver = createDebouncedSaver(save, 250);
    const a = { ...createEmptyState(NOW), wallet: ['a'] };
    const b = { ...createEmptyState(NOW), wallet: ['b'] };
    saver.schedule(a);
    vi.advanceTimersByTime(200);
    saver.schedule(b);
    vi.advanceTimersByTime(200);
    expect(save).not.toHaveBeenCalled();
    vi.advanceTimersByTime(50);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(b);
  });

  it('flush writes pending state immediately, once', () => {
    vi.useFakeTimers();
    const save = vi.fn();
    const saver = createDebouncedSaver(save, 250);
    saver.flush();
    expect(save).not.toHaveBeenCalled();
    saver.schedule(createEmptyState(NOW));
    saver.flush();
    vi.advanceTimersByTime(1000);
    expect(save).toHaveBeenCalledTimes(1);
  });
});

describe('getBrowserStorage', () => {
  it('returns localStorage when it works', () => {
    expect(getBrowserStorage()).toBe(window.localStorage);
  });

  it('returns undefined when localStorage throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(getBrowserStorage()).toBeUndefined();
    spy.mockRestore();
  });
});
