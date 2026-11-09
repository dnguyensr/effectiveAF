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

  it('appends custom perks to a catalog card, marked custom and valued at 100% by default', () => {
    const gold = resolveCards(CATALOG, [], {
      'amex-gold': { perks: {}, customPerks: [lounge] },
    }).find((c) => c.id === 'amex-gold') as CardDef;
    const added = gold.perks.at(-1);
    expect(added).toMatchObject({
      id: lounge.id,
      custom: true,
      category: 'custom',
      defaultRatio: 1,
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
  it('lists four presets with labels and descriptions', () => {
    expect(PRESETS.map((p) => p.id)).toEqual(['estimates', 'face', 'organic', 'none']);
    for (const p of PRESETS) expect(p.description.length).toBeGreaterThan(10);
  });

  const total = (preset: Parameters<typeof applyPreset>[2]) =>
    summarizeCard(platinum, { perks: applyPreset(platinum, {}, preset) }, AS_OF);

  // Hand-computed from the catalog figures:
  it('face value: Platinum realizes all $3,024.40 and pays for itself by $2,129.40', () => {
    const s = total('face');
    expect(s.realizedCents).toBe(302440);
    expect(s.effectiveCents).toBe(-212940);
  });

  it('organic: only travel, dining and rideshare at estimates, $670.70, costs $224.30', () => {
    // hotel 150 + Resy 200 + Uber Cash 140 + airline 100 + CLEAR+ 65.70 + Global Entry 15
    const s = total('organic');
    expect(s.realizedCents).toBe(67070);
    expect(s.effectiveCents).toBe(22430);
    const off = s.perks.filter((p) => !p.enabled).map((p) => p.perk.category);
    expect(new Set(off)).toEqual(new Set(['entertainment', 'retail', 'membership', 'wellness']));
  });

  it('none: everything off, the full fee is the cost', () => {
    const s = total('none');
    expect(s.realizedCents).toBe(0);
    expect(s.effectiveCents).toBe(89500);
  });

  it('switching a preset off and back on keeps the starting estimate', () => {
    const v = applyPreset(platinum, {}, 'none')['amex-platinum.resy'];
    expect(v).toEqual({ mode: 'percent', percent: 50, enabled: false });
  });

  it('estimates clears catalog valuations but keeps custom perks and unrelated entries', () => {
    const custom = customPerkDef({
      id: 'amex-platinum.my-x',
      name: 'X',
      cadence: 'annual',
      amountPerPeriodCents: 100,
    });
    const card: CardDef = { ...platinum, perks: [...platinum.perks, custom] };
    const current = {
      'amex-platinum.resy': { mode: 'dollars', cents: 1, enabled: true },
      'amex-platinum.my-x': { mode: 'dollars', cents: 50, enabled: true },
    } as const;
    expect(applyPreset(card, current, 'estimates')).toEqual({
      'amex-platinum.my-x': current['amex-platinum.my-x'],
    });
    expect(applyPreset(card, current, 'face')['amex-platinum.my-x']).toEqual(
      current['amex-platinum.my-x'],
    );
  });
});
