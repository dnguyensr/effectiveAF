// SPDX-License-Identifier: GPL-3.0-or-later
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyState } from '../../../src/state/migrations';
import { STORAGE_KEY } from '../../../src/state/storage';
import { createStore } from '../../../src/state/store';
import { FIXED_AS_OF, FIXED_NOW, memoryStorage } from '../helpers';

function setup(initial: Record<string, string> = {}) {
  const storage = memoryStorage(initial);
  const store = createStore({ storage, now: () => FIXED_NOW, saveDelayMs: 10 });
  return { storage, store };
}

const saved = (storage: ReturnType<typeof memoryStorage>) =>
  JSON.parse(storage.data.get(STORAGE_KEY) ?? 'null');

describe('createStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts empty on a first visit and uses today as the as-of date', () => {
    const { store } = setup();
    expect(store.loadStatus).toBe('new');
    expect(store.asOf).toBe(FIXED_AS_OF);
    expect(store.summary.value.cards).toEqual([]);
  });

  it('works without storage', () => {
    const store = createStore({ storage: undefined, now: () => FIXED_NOW });
    store.addCard('amex-gold');
    store.flush();
    expect(store.loadStatus).toBe('unavailable');
    expect(store.summary.value.cards).toHaveLength(1);
  });

  it('adds cards once, at a position, and ignores unknown IDs', () => {
    const { store } = setup();
    store.addCard('amex-gold');
    store.addCard('amex-gold');
    store.addCard('not-a-card');
    store.addCard('amex-platinum', 0);
    expect(store.state.value.wallet).toEqual(['amex-platinum', 'amex-gold']);
  });

  it('removes a card but keeps its values so undo restores them', () => {
    const { store } = setup();
    store.addCard('amex-gold');
    store.addCard('capital-one-venture-x');
    store.setPerkPercent('amex-gold', 'amex-gold.dining', 90);
    const index = store.removeCard('amex-gold');
    expect(index).toBe(0);
    expect(store.removeCard('amex-gold')).toBe(-1);
    expect(store.state.value.wallet).toEqual(['capital-one-venture-x']);
    store.addCard('amex-gold', index);
    expect(store.state.value.wallet).toEqual(['amex-gold', 'capital-one-venture-x']);
    expect(store.state.value.cards['amex-gold']?.perks['amex-gold.dining']).toMatchObject({
      percent: 90,
    });
  });

  it('stores percent values clamped and rounded', () => {
    const { store } = setup();
    store.setPerkPercent('amex-gold', 'amex-gold.dining', 150.4);
    expect(store.state.value.cards['amex-gold']?.perks['amex-gold.dining']).toEqual({
      mode: 'percent',
      percent: 100,
      enabled: true,
    });
    store.setPerkPercent('amex-gold', 'amex-gold.dining', Number.NaN);
    expect(store.state.value.cards['amex-gold']?.perks['amex-gold.dining']).toMatchObject({
      percent: 0,
    });
  });

  it('stores dollar values capped at face value', () => {
    const { store } = setup();
    store.setPerkDollars('amex-gold', 'amex-gold.dining', 99900);
    expect(store.state.value.cards['amex-gold']?.perks['amex-gold.dining']).toEqual({
      mode: 'dollars',
      cents: 12000,
      enabled: true,
    });
    store.setPerkDollars('amex-gold', 'amex-gold.dining', Number.POSITIVE_INFINITY);
    expect(store.state.value.cards['amex-gold']?.perks['amex-gold.dining']).toMatchObject({
      cents: 0,
    });
  });

  it('ignores valuations for unknown cards or perks', () => {
    const { store } = setup();
    store.setPerkPercent('amex-gold', 'amex-gold.nope', 50);
    store.setPerkDollars('nope', 'nope.x', 50);
    store.setPerkEnabled('amex-gold', 'amex-gold.nope', false);
    store.setFeeOverride('nope', 100);
    expect(store.state.value.cards).toEqual({});
  });

  it('toggling a perk off keeps its value; with no value yet it starts from the default', () => {
    const { store } = setup();
    store.addCard('amex-gold');
    store.setPerkEnabled('amex-gold', 'amex-gold.dining', false);
    expect(store.state.value.cards['amex-gold']?.perks['amex-gold.dining']).toEqual({
      mode: 'percent',
      percent: 50,
      enabled: false,
    });
    expect(store.summary.value.cards[0]?.perks[0]?.realizedCents).toBe(0);

    store.setPerkDollars('amex-gold', 'amex-gold.uber-cash', 3000);
    store.setPerkEnabled('amex-gold', 'amex-gold.uber-cash', false);
    store.setPerkEnabled('amex-gold', 'amex-gold.uber-cash', true);
    expect(store.state.value.cards['amex-gold']?.perks['amex-gold.uber-cash']).toEqual({
      mode: 'dollars',
      cents: 3000,
      enabled: true,
    });
  });

  it('sets and clears fee overrides; the standard fee clears it', () => {
    const { store } = setup();
    store.addCard('amex-gold');
    store.setFeeOverride('amex-gold', 25000);
    expect(store.summary.value.cards[0]?.feeCents).toBe(25000);
    expect(store.summary.value.cards[0]?.isFeeOverridden).toBe(true);
    store.setFeeOverride('amex-gold', 32500);
    expect(store.state.value.cards['amex-gold']).not.toHaveProperty('feeOverrideCents');
    store.setFeeOverride('amex-gold', 0);
    expect(store.summary.value.cards[0]?.feeCents).toBe(0);
    store.setFeeOverride('amex-gold', null);
    expect(store.summary.value.cards[0]?.feeCents).toBe(32500);
    store.setFeeOverride('amex-gold', 1e12);
    expect(store.state.value.cards['amex-gold']?.feeOverrideCents).toBe(10_000_000);
  });

  it('resets one card or all cards, keeping the wallet', () => {
    const { store } = setup();
    store.addCard('amex-gold');
    store.addCard('amex-platinum');
    store.setFeeOverride('amex-gold', 0);
    store.setPerkPercent('amex-platinum', 'amex-platinum.resy', 100);
    store.resetCard('amex-gold');
    expect(Object.keys(store.state.value.cards)).toEqual(['amex-platinum']);
    store.resetAll();
    expect(store.state.value.cards).toEqual({});
    expect(store.state.value.wallet).toEqual(['amex-gold', 'amex-platinum']);
  });

  it('saves after a short delay, and immediately on flush', () => {
    const { store, storage } = setup();
    store.addCard('amex-gold');
    expect(saved(storage)).toBeNull();
    vi.advanceTimersByTime(10);
    expect(saved(storage).wallet).toEqual(['amex-gold']);
    store.addCard('amex-platinum');
    store.flush();
    expect(saved(storage).wallet).toEqual(['amex-gold', 'amex-platinum']);
    expect(saved(storage).updatedAt).toBe(FIXED_NOW.toISOString());
  });

  it('reloads exactly what was saved', () => {
    const { store, storage } = setup();
    store.addCard('chase-sapphire-reserve');
    store.setPerkDollars('chase-sapphire-reserve', 'chase-sapphire-reserve.dining', 15000);
    store.flush();
    const again = createStore({ storage, now: () => FIXED_NOW });
    expect(again.loadStatus).toBe('loaded');
    expect(again.state.value).toEqual(store.state.value);
  });

  it('flags when a save fails', () => {
    const storage = memoryStorage();
    const store = createStore({ storage, now: () => FIXED_NOW, saveDelayMs: 10 });
    storage.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    store.addCard('amex-gold');
    store.flush();
    expect(store.saveFailed.value).toBe(true);
  });

  it('replaces state wholesale (import)', () => {
    const { store } = setup();
    store.replaceState({ ...createEmptyState('x'), wallet: ['amex-gold'] });
    expect(store.state.value.wallet).toEqual(['amex-gold']);
    expect(store.state.value.updatedAt).toBe(FIXED_NOW.toISOString());
  });
});
