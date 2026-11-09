// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { CATALOG, findCard } from '../../../src/catalog';
import { KINDS, type CardDef } from '../../../src/catalog/types';
import { summarizeCard } from '../../../src/core/card-math';
import { buildComparison } from '../../../src/core/compare';
import { resolveCards } from '../../../src/core/resolve';
import { createStore } from '../../../src/state/store';
import { FIXED_NOW } from '../helpers';

const AS_OF = '2026-11-08';
const col = (id: string) => summarizeCard(findCard(id) as CardDef, undefined, AS_OF);

describe('catalog kinds', () => {
  it('every catalog perk has a known kind (custom is reserved for user perks)', () => {
    const known = new Set<string>(KINDS.map((k) => k.id));
    for (const card of CATALOG) {
      for (const perk of card.perks) {
        expect(known.has(perk.kind), perk.id).toBe(true);
        expect(perk.kind).not.toBe('custom');
      }
    }
  });
});

describe('buildComparison', () => {
  it('lines up similar credits across cards, in kind order, grouped', () => {
    const groups = buildComparison([
      col('amex-platinum'),
      col('chase-sapphire-reserve'),
      col('capital-one-venture-x'),
    ]);
    expect(groups.map((g) => g.group)).toEqual([
      'Travel',
      'Dining',
      'Rideshare',
      'Entertainment',
      'Shopping',
      'Wellness',
    ]);
    const travel = groups[0]?.rows.map((r) => r.kind);
    expect(travel).toEqual([
      'travel-general',
      'hotel',
      'airline-fees',
      'trusted-traveler',
      'airport-security',
      'bonus-miles',
    ]);
    const hotel = groups[0]?.rows.find((r) => r.kind === 'hotel');
    // Platinum: one hotel credit; Reserve: two (The Edit + select hotels); Venture X: none.
    expect(hotel?.cells.map((c) => c.map((p) => p.id))).toEqual([
      ['amex-platinum.hotel'],
      ['chase-sapphire-reserve.the-edit', 'chase-sapphire-reserve.select-hotels-2026'],
      [],
    ]);
    // Every card has a Global Entry credit: one row, three filled cells.
    const ge = groups[0]?.rows.find((r) => r.kind === 'trusted-traveler');
    expect(ge?.cells.every((c) => c.length === 1)).toBe(true);
  });

  it('leaves out kinds none of the compared cards have', () => {
    const groups = buildComparison([col('capital-one-venture-x')]);
    expect(groups.flatMap((g) => g.rows.map((r) => r.kind))).toEqual([
      'travel-general',
      'trusted-traveler',
      'bonus-miles',
    ]);
  });

  it('puts custom perks in their own "Yours" group, last', () => {
    const cards = resolveCards(CATALOG, [], {
      'amex-gold': {
        perks: {},
        customPerks: [
          { id: 'amex-gold.my-x', name: 'Lounge', cadence: 'annual', amountPerPeriodCents: 100 },
        ],
      },
    });
    const gold = cards.find((c) => c.id === 'amex-gold') as CardDef;
    const groups = buildComparison([summarizeCard(gold, undefined, AS_OF)]);
    expect(groups.at(-1)).toMatchObject({ group: 'Yours', rows: [{ kind: 'custom' }] });
  });

  it('drops expired perks with the card summary', () => {
    const groups = buildComparison([
      summarizeCard(findCard('chase-sapphire-reserve') as CardDef, undefined, '2027-01-01'),
    ]);
    const hotel = groups[0]?.rows.find((r) => r.kind === 'hotel');
    expect(hotel?.cells[0]?.map((p) => p.id)).toEqual(['chase-sapphire-reserve.the-edit']);
  });

  it('is empty with no cards', () => {
    expect(buildComparison([])).toEqual([]);
  });
});

describe('store: comparison list', () => {
  const setup = () => createStore({ storage: undefined, now: () => FIXED_NOW });

  it('toggles cards in and out, up to five, ignoring unknown IDs', () => {
    const store = setup();
    for (const id of CATALOG.map((c) => c.id)) store.toggleCompare(id);
    expect(store.state.value.compare).toHaveLength(5);
    const id = store.addCustomCard({ issuer: '', name: 'Sixth', annualFeeCents: 0 }) as string;
    store.toggleCompare(id);
    expect(store.state.value.compare).not.toContain(id);
    store.toggleCompare('amex-gold');
    expect(store.state.value.compare).not.toContain('amex-gold');
    store.toggleCompare(id);
    expect(store.state.value.compare.at(-1)).toBe(id);
    store.toggleCompare('not-a-card');
    expect(store.state.value.compare).toHaveLength(5);
  });

  it('summarizes compared cards in column order, using values set anywhere', () => {
    const store = setup();
    store.toggleCompare('capital-one-venture-x');
    store.toggleCompare('amex-gold');
    store.applyPreset('amex-gold', 'face');
    expect(store.compareSummaries.value.map((c) => [c.card.id, c.realizedCents])).toEqual([
      ['capital-one-venture-x', 0],
      ['amex-gold', 42400],
    ]);
    expect(store.summaryFor('amex-gold')?.realizedCents).toBe(42400);
    expect(store.summaryFor('nope')).toBeUndefined();
  });

  it('deleting a custom card removes it from the comparison too', () => {
    const store = setup();
    const id = store.addCustomCard({ issuer: '', name: 'Mine', annualFeeCents: 0 }) as string;
    store.toggleCompare(id);
    store.deleteCustomCard(id);
    expect(store.state.value.compare).toEqual([]);
    expect(store.compareSummaries.value).toEqual([]);
  });
});
