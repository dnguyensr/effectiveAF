// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { CATALOG, findCard } from '../../../src/catalog';
import type { CardDef } from '../../../src/catalog/types';
import { summarizeCard } from '../../../src/core/card-math';
import { applyPreset, PRESETS } from '../../../src/core/presets';
import { cadenceLabelFor, customPerkDef, resolveCards } from '../../../src/core/resolve';

const platinum = findCard('amex-platinum') as CardDef;
const AS_OF = '2026-11-08';

describe('cadenceLabelFor', () => {
  it.each([
    ['monthly', 1000, '$10 / month'],
    ['quarterly', 7500, '$75 / quarter'],
    ['semiannual', 5000, '$50 / half-year'],
    ['annual', 12995, '$129.95 / year'],
    ['every-4-years', 12000, '$120 / 4 years'],
  ] as const)('%s %d -> %s', (cadence, cents, label) => {
    expect(cadenceLabelFor(cadence, cents)).toBe(label);
  });
});

describe('resolveCards', () => {
  const lounge = {
    id: 'amex-gold.my-lounge',
    name: 'Lounge',
    cadence: 'annual',
    amountPerPeriodCents: 5000,
  } as const;

  it('returns catalog cards untouched when there is nothing custom', () => {
    const cards = resolveCards(CATALOG, [], {});
    expect(cards).toHaveLength(CATALOG.length);
    expect(cards[0]).toBe(CATALOG[0]);
  });

  it('appends custom perks to a catalog card, marked custom', () => {
    const gold = resolveCards(CATALOG, [], {
      'amex-gold': { perks: {}, customPerks: [lounge] },
    }).find((c) => c.id === 'amex-gold') as CardDef;
    const added = gold.perks.at(-1);
    expect(added).toMatchObject({
      id: lounge.id,
      custom: true,
      category: 'custom',
    });
    expect(added?.cadenceLabel).toBe('$50 / year');
    expect(summarizeCard(gold, undefined, AS_OF).nominalCents).toBe(42400 + 5000);
  });

  it('adds custom cards after the catalog, with their perks', () => {
    const cards = resolveCards(
      CATALOG,
      [{ id: 'custom-a', issuer: '', name: 'Mine', annualFeeCents: 9500 }],
      { 'custom-a': { perks: {}, customPerks: [{ ...lounge, id: 'custom-a.my-x' }] } },
    );
    const mine = cards.at(-1) as CardDef;
    expect(mine).toMatchObject({
      id: 'custom-a',
      name: 'Mine',
      custom: true,
      annualFeeCents: 9500,
    });
    expect(mine.perks.map((p) => p.id)).toEqual(['custom-a.my-x']);
  });

  it('never lets a custom card or perk shadow a catalog one', () => {
    const cards = resolveCards(
      CATALOG,
      [{ id: 'amex-gold', issuer: 'x', name: 'Fake', annualFeeCents: 0 }],
      { 'amex-gold': { perks: {}, customPerks: [{ ...lounge, id: 'amex-gold.dining' }] } },
    );
    const golds = cards.filter((c) => c.id === 'amex-gold');
    expect(golds).toHaveLength(1);
    expect(golds[0]?.name).toBe('Gold Card');
    expect(golds[0]?.perks.filter((p) => p.id === 'amex-gold.dining')).toHaveLength(1);
  });

  it('customPerkDef carries the user input', () => {
    expect(customPerkDef(lounge)).toMatchObject({
      name: 'Lounge',
      cadence: 'annual',
      requiresEnrollment: false,
    });
  });
});

describe('presets', () => {
  it('lists the three presets with labels and descriptions', () => {
    expect(PRESETS.map((p) => p.id)).toEqual(['face', 'travel-dining', 'clear']);
    for (const p of PRESETS) expect(p.description.length).toBeGreaterThan(10);
  });

  const total = (preset: Parameters<typeof applyPreset>[2]) =>
    summarizeCard(platinum, { perks: applyPreset(platinum, {}, preset) }, AS_OF);

  // Hand-computed from the catalog figures:
  it('face value: Platinum realizes all $3,024.40 and pays for itself by $2,129.40', () => {
    const s = total('face');
    expect(s.realizedCents).toBe(302440);
    expect(s.effectiveCents).toBe(-212940);
    expect(s.unsetCount).toBe(0);
  });

  it("travel & dining: $1,649 at face value, the rest won't use, pays for itself by $754", () => {
    // hotel 600 + Resy 400 + Uber Cash 200 + airline 200 + CLEAR+ 219 + Global Entry 30
    const s = total('travel-dining');
    expect(s.realizedCents).toBe(164900);
    expect(s.effectiveCents).toBe(-75400);
    const skipped = s.perks.filter((p) => p.status === 'skipped').map((p) => p.perk.category);
    expect(new Set(skipped)).toEqual(
      new Set(['entertainment', 'retail', 'membership', 'wellness']),
    );
    expect(s.unsetCount).toBe(0);
  });

  it('clear: everything back to not set, the full fee is the cost', () => {
    const s = summarizeCard(
      platinum,
      { perks: applyPreset(platinum, applyPreset(platinum, {}, 'face'), 'clear') },
      AS_OF,
    );
    expect(s.realizedCents).toBe(0);
    expect(s.effectiveCents).toBe(89500);
    expect(s.unsetCount).toBe(platinum.perks.length);
  });

  it('never touches custom perks or entries for other perks', () => {
    const custom = customPerkDef({
      id: 'amex-platinum.my-x',
      name: 'X',
      cadence: 'annual',
      amountPerPeriodCents: 100,
    });
    const card: CardDef = { ...platinum, perks: [...platinum.perks, custom] };
    const mine = { mode: 'dollars', cents: 50, enabled: true } as const;
    const current = {
      'amex-platinum.resy': { mode: 'dollars', cents: 1, enabled: true },
      'amex-platinum.my-x': mine,
    } as const;
    expect(applyPreset(card, current, 'clear')).toEqual({ 'amex-platinum.my-x': mine });
    expect(applyPreset(card, current, 'face')['amex-platinum.my-x']).toEqual(mine);
    expect(applyPreset(card, current, 'travel-dining')['amex-platinum.my-x']).toEqual(mine);
  });
});
