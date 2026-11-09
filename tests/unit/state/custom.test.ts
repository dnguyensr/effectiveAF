// SPDX-License-Identifier: GPL-3.0-or-later
/** Phase 2 state: schema v2, the v1→v2 migration, presets and custom cards/perks in the store. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseImport } from '../../../src/state/import-export';
import { createEmptyState, migrate, parseState } from '../../../src/state/migrations';
import {
  MAX_CUSTOM_CARDS,
  MAX_CUSTOM_PERKS_PER_CARD,
  type UserState,
} from '../../../src/state/schema';
import { createStore } from '../../../src/state/store';
import { FIXED_NOW, memoryStorage } from '../helpers';

const fixture = (p: string) => readFileSync(join(__dirname, '../../fixtures', p), 'utf8');

function setup() {
  let n = 0;
  return createStore({
    storage: memoryStorage(),
    now: () => FIXED_NOW,
    randomId: () => `id${++n}`,
  });
}

describe('v1 → v2 migration', () => {
  it('adds an empty custom card list and keeps everything else', () => {
    const v1 = JSON.parse(fixture('state-v1/full.json'));
    const v2 = parseState(v1);
    expect(v2.schemaVersion).toBe(2);
    expect(v2.customCards).toEqual([]);
    expect(v2.wallet).toEqual(v1.wallet);
    expect(v2.cards).toEqual(v1.cards);
  });

  it('is applied by migrate directly', () => {
    expect(migrate({ schemaVersion: 1, wallet: [] })).toEqual({
      schemaVersion: 2,
      wallet: [],
      customCards: [],
    });
  });
});

describe('schema v2 validation of custom data', () => {
  const base: UserState = createEmptyState('x');
  const perk = { id: 'amex-gold.my-a', name: 'A', cadence: 'annual', amountPerPeriodCents: 100 };
  const card = { id: 'custom-a', issuer: '', name: 'A', annualFeeCents: 0 };
  const rejects = (state: unknown) => expect(parseImport(JSON.stringify(state)).ok).toBe(false);

  it('accepts the v2 fixture', () => {
    const r = parseImport(fixture('state-v2/custom.json'));
    expect(r.ok && r.state.customCards).toHaveLength(2);
  });

  it.each([
    ['an empty name', { ...perk, name: '' }],
    ['an untrimmed name', { ...perk, name: ' A ' }],
    ['an over-long name', { ...perk, name: 'x'.repeat(61) }],
    ['a zero amount', { ...perk, amountPerPeriodCents: 0 }],
    ['an unknown cadence', { ...perk, cadence: 'weekly' }],
    ['a bad id', { ...perk, id: 'Amex Gold!' }],
  ])('rejects a custom perk with %s', (_name, bad) => {
    rejects({ ...base, cards: { 'amex-gold': { perks: {}, customPerks: [bad] } } });
  });

  it('rejects duplicate custom perk IDs and too many perks', () => {
    rejects({ ...base, cards: { 'amex-gold': { perks: {}, customPerks: [perk, perk] } } });
    const many = Array.from({ length: MAX_CUSTOM_PERKS_PER_CARD + 1 }, (_, i) => ({
      ...perk,
      id: `amex-gold.my-${i}`,
    }));
    rejects({ ...base, cards: { 'amex-gold': { perks: {}, customPerks: many } } });
  });

  it('rejects bad custom cards', () => {
    rejects({ ...base, customCards: [{ ...card, name: '' }] });
    rejects({ ...base, customCards: [card, card] });
    rejects({ ...base, customCards: [{ ...card, annualFeeCents: -1 }] });
    rejects({
      ...base,
      customCards: Array.from({ length: MAX_CUSTOM_CARDS + 1 }, (_, i) => ({
        ...card,
        id: `custom-${i}`,
      })),
    });
  });

  it('rejects HTML-looking text only if it breaks the rules; Preact escapes the rest', () => {
    const r = parseImport(
      JSON.stringify({ ...base, customCards: [{ ...card, name: '<b>x</b>' }] }),
    );
    expect(r.ok).toBe(true);
  });
});

describe('store: presets', () => {
  it('applies a preset to one card', () => {
    const store = setup();
    store.addCard('amex-platinum');
    store.applyPreset('amex-platinum', 'none');
    expect(store.summary.value.cards[0]?.realizedCents).toBe(0);
    store.applyPreset('amex-platinum', 'estimates');
    expect(store.summary.value.cards[0]?.realizedCents).toBe(99055);
    store.applyPreset('nope', 'face');
  });

  it('applies a preset to every card in the wallet, leaving other cards alone', () => {
    const store = setup();
    store.addCard('amex-gold');
    store.addCard('capital-one-venture-x');
    store.setFeeOverride('amex-gold', 0);
    store.applyPresetToWallet('face');
    const [gold, vx] = store.summary.value.cards;
    expect(gold?.realizedCents).toBe(42400);
    expect(gold?.feeCents).toBe(0);
    expect(vx?.realizedCents).toBe(30000 + 10000 + 3000);
    expect(store.state.value.cards['amex-platinum']).toBeUndefined();
  });
});

describe('store: custom cards', () => {
  it('creates a custom card, adds it to the wallet and summarizes it', () => {
    const store = setup();
    const id = store.addCustomCard({
      issuer: '  Citi ',
      name: ' Strata   Premier ',
      annualFeeCents: 9500,
    });
    expect(id).toBe('custom-id1');
    expect(store.state.value.customCards[0]).toEqual({
      id: 'custom-id1',
      issuer: 'Citi',
      name: 'Strata Premier',
      annualFeeCents: 9500,
    });
    expect(store.state.value.wallet).toEqual(['custom-id1']);
    expect(store.summary.value.effectiveCents).toBe(9500);
  });

  it('refuses a blank name and enforces the limit', () => {
    const store = setup();
    expect(store.addCustomCard({ issuer: '', name: '   ', annualFeeCents: 0 })).toBeNull();
    for (let i = 0; i < MAX_CUSTOM_CARDS; i++) {
      expect(
        store.addCustomCard({ issuer: '', name: `Card ${i}`, annualFeeCents: 0 }),
      ).not.toBeNull();
    }
    expect(store.addCustomCard({ issuer: '', name: 'One more', annualFeeCents: 0 })).toBeNull();
  });

  it('retries ID generation on collision', () => {
    const ids = ['dup', 'dup', 'other'];
    const store = createStore({
      storage: undefined,
      now: () => FIXED_NOW,
      randomId: () => ids.shift() ?? 'z',
    });
    expect(store.addCustomCard({ issuer: '', name: 'A', annualFeeCents: 0 })).toBe('custom-dup');
    expect(store.addCustomCard({ issuer: '', name: 'B', annualFeeCents: 0 })).toBe(
      'custom-other-2',
    );
  });

  it('edits a custom card fee directly; clearing it means $0', () => {
    const store = setup();
    const id = store.addCustomCard({ issuer: '', name: 'A', annualFeeCents: 9500 }) as string;
    store.setFeeOverride(id, 12000);
    expect(store.state.value.customCards[0]?.annualFeeCents).toBe(12000);
    expect(store.state.value.cards[id]).toBeUndefined();
    store.setFeeOverride(id, null);
    expect(store.summary.value.cards[0]?.feeCents).toBe(0);
  });

  it('removing keeps it available to re-add; deleting erases it everywhere', () => {
    const store = setup();
    const id = store.addCustomCard({ issuer: '', name: 'A', annualFeeCents: 0 }) as string;
    store.addCustomPerk(id, { name: 'P', cadence: 'annual', amountPerPeriodCents: 100 });
    store.removeCard(id);
    expect(store.cards.value.some((c) => c.id === id)).toBe(true);
    store.addCard(id);
    expect(store.summary.value.cards[0]?.perks).toHaveLength(1);
    store.deleteCustomCard(id);
    expect(store.state.value.customCards).toEqual([]);
    expect(store.state.value.wallet).toEqual([]);
    expect(store.state.value.cards[id]).toBeUndefined();
    store.deleteCustomCard('amex-gold');
    store.deleteCustomCard(id);
  });
});

describe('store: custom perks', () => {
  it('adds a perk to a catalog card, values it and includes it in totals', () => {
    const store = setup();
    store.addCard('capital-one-venture-x');
    const id = store.addCustomPerk('capital-one-venture-x', {
      name: 'Lounge access',
      cadence: 'annual',
      amountPerPeriodCents: 20000,
    });
    expect(id).toBe('capital-one-venture-x.my-id1');
    // Defaults 385 + lounge 200 at 100% = 585; 395 − 585 = −190
    expect(store.summary.value.effectiveCents).toBe(-19000);
    store.setPerkDollars('capital-one-venture-x', id as string, 50000);
    expect(store.summary.value.cards[0]?.perks.at(-1)?.realizedCents).toBe(20000);
  });

  it('cleans input and rejects blank names, unknown cards and going over the limit', () => {
    const store = setup();
    expect(
      store.addCustomPerk('nope', { name: 'x', cadence: 'annual', amountPerPeriodCents: 1 }),
    ).toBeNull();
    expect(
      store.addCustomPerk('amex-gold', { name: ' ', cadence: 'annual', amountPerPeriodCents: 1 }),
    ).toBeNull();
    store.addCustomPerk('amex-gold', { name: 'x', cadence: 'monthly', amountPerPeriodCents: -5 });
    expect(store.state.value.cards['amex-gold']?.customPerks?.[0]?.amountPerPeriodCents).toBe(1);
    for (let i = 1; i < MAX_CUSTOM_PERKS_PER_CARD; i++) {
      store.addCustomPerk('amex-gold', {
        name: `p${i}`,
        cadence: 'annual',
        amountPerPeriodCents: 1,
      });
    }
    expect(
      store.addCustomPerk('amex-gold', {
        name: 'over',
        cadence: 'annual',
        amountPerPeriodCents: 1,
      }),
    ).toBeNull();
  });

  it('removes a custom perk and its valuation', () => {
    const store = setup();
    const id = store.addCustomPerk('amex-gold', {
      name: 'x',
      cadence: 'annual',
      amountPerPeriodCents: 100,
    }) as string;
    store.setPerkPercent('amex-gold', id, 50);
    store.removeCustomPerk('amex-gold', id);
    expect(store.state.value.cards['amex-gold']).toEqual({ perks: {}, customPerks: [] });
    store.removeCustomPerk('amex-gold', id);
    store.removeCustomPerk('amex-platinum', 'x');
  });

  it('reset keeps custom perks but clears their values; reset all does the same', () => {
    const store = setup();
    store.addCard('amex-gold');
    const id = store.addCustomPerk('amex-gold', {
      name: 'x',
      cadence: 'annual',
      amountPerPeriodCents: 100,
    }) as string;
    store.setPerkPercent('amex-gold', id, 10);
    store.setFeeOverride('amex-gold', 0);
    store.resetCard('amex-gold');
    expect(store.state.value.cards['amex-gold']).toEqual({
      perks: {},
      customPerks: [expect.objectContaining({ id })],
    });
    store.setPerkPercent('amex-gold', id, 10);
    store.setFeeOverride('amex-platinum', 0);
    store.resetAll();
    expect(Object.keys(store.state.value.cards)).toEqual(['amex-gold']);
    expect(store.state.value.cards['amex-gold']?.perks).toEqual({});
  });
});
