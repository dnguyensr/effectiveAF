// SPDX-License-Identifier: GPL-3.0-or-later
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { findCard } from '../../../src/catalog';
import type { CADENCES } from '../../../src/catalog/types';
import { type CardDef } from '../../../src/catalog/types';
import { summarizeCard } from '../../../src/core/card-math';
import { applyPreset } from '../../../src/core/presets';
import { daysBetween, nextResetDate, upcomingResets } from '../../../src/core/resets';

const cal = (cadence: (typeof CADENCES)[number]) => ({
  cadence,
  resetBasis: 'calendar-year' as const,
});
const member = (cadence: (typeof CADENCES)[number]) => ({
  cadence,
  resetBasis: 'cardmember-year' as const,
});

describe('daysBetween', () => {
  it.each([
    ['2026-11-08', '2026-12-01', 23],
    ['2026-12-31', '2027-01-01', 1],
    ['2026-03-07', '2026-03-09', 2], // across a US DST change
    ['2026-11-08', '2026-11-08', 0],
  ])('%s -> %s = %d', (a, b, d) => {
    expect(daysBetween(a, b)).toBe(d);
  });
});

describe('nextResetDate (hand-checked)', () => {
  it.each([
    // calendar-year
    [cal('monthly'), '2026-11-08', undefined, '2026-12-01'],
    [cal('monthly'), '2026-12-31', undefined, '2027-01-01'],
    [cal('monthly'), '2026-11-01', undefined, '2026-12-01'], // reset today -> next one
    [cal('quarterly'), '2026-11-08', undefined, '2027-01-01'],
    [cal('quarterly'), '2026-02-15', undefined, '2026-04-01'],
    [cal('quarterly'), '2026-04-01', undefined, '2026-07-01'],
    [cal('semiannual'), '2026-03-10', undefined, '2026-07-01'],
    [cal('semiannual'), '2026-07-01', undefined, '2027-01-01'],
    [cal('annual'), '2026-11-08', undefined, '2027-01-01'],
    // cardmember-year: anchored to the anniversary month
    [member('annual'), '2026-11-08', 3, '2027-03-01'],
    [member('annual'), '2026-11-08', 12, '2026-12-01'],
    [member('annual'), '2026-11-08', 11, '2027-11-01'], // anniversary already passed this month
    [member('semiannual'), '2026-11-08', 2, '2027-02-01'],
  ] as const)('%o on %s (anniversary %s) -> %s', (perk, asOf, month, expected) => {
    expect(nextResetDate(perk, asOf, month)).toBe(expected);
  });

  it('is unknown for every-4-years credits and for cardmember-year without a month', () => {
    expect(nextResetDate(cal('every-4-years'), '2026-11-08', undefined)).toBeNull();
    expect(nextResetDate(member('annual'), '2026-11-08', undefined)).toBeNull();
  });

  it('property: always the 1st of a month, strictly after asOf, within a year', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('monthly', 'quarterly', 'semiannual', 'annual' as const),
        fc.constantFrom('calendar-year', 'cardmember-year' as const),
        fc.date({ min: new Date('2020-01-01'), max: new Date('2035-12-31'), noInvalidDate: true }),
        fc.integer({ min: 1, max: 12 }),
        (cadence, resetBasis, date, month) => {
          const asOf = date.toISOString().slice(0, 10);
          const next = nextResetDate({ cadence, resetBasis }, asOf, month) as string;
          expect(next.endsWith('-01')).toBe(true);
          const days = daysBetween(asOf, next);
          expect(days).toBeGreaterThan(0);
          expect(days).toBeLessThanOrEqual(366);
        },
      ),
    );
  });
});

describe('upcomingResets', () => {
  const card = (id: string) => findCard(id) as CardDef;
  const atFace = (id: string, asOf = '2026-11-08') =>
    summarizeCard(card(id), { perks: applyPreset(card(id), {}, 'face') }, asOf);

  it('lists credits in use that reset within 30 days, soonest first', () => {
    // On Nov 8: Gold's monthly credits reset Dec 1 (23 days); Resy (semiannual) Jan 1 (54 days).
    const list = upcomingResets([atFace('amex-gold')], '2026-11-08', {});
    expect(list.map((r) => [r.perkName, r.date, r.days, r.periodCents])).toEqual([
      ['Dining credit', '2026-12-01', 23, 1000],
      ["Dunkin' credit", '2026-12-01', 23, 700],
      ['Uber Cash', '2026-12-01', 23, 1000],
    ]);
  });

  it('skips credits not set or marked won’t use', () => {
    const gold = card('amex-gold');
    const s = summarizeCard(
      gold,
      { perks: { 'amex-gold.dining': { mode: 'percent', percent: 50, enabled: false } } },
      '2026-11-08',
    );
    expect(upcomingResets([s], '2026-11-08', {})).toEqual([]);
  });

  it('uses the anniversary month for cardmember-year credits', () => {
    const vx = atFace('capital-one-venture-x');
    expect(upcomingResets([vx], '2026-11-08', {})).toEqual([]);
    const withMonth = upcomingResets([vx], '2026-11-08', { 'capital-one-venture-x': 12 });
    expect(withMonth.map((r) => r.perkId)).toEqual([
      'capital-one-venture-x.anniversary-miles',
      'capital-one-venture-x.travel',
    ]);
    expect(withMonth[0]?.date).toBe('2026-12-01');
  });

  it('reports a credit that ends for good before it would reset', () => {
    // Reserve's 2026-only select-hotels credit ends Dec 31; its annual reset would be Jan 1.
    const list = upcomingResets([atFace('chase-sapphire-reserve', '2026-12-10')], '2026-12-10', {});
    const select = list.find((r) => r.perkId === 'chase-sapphire-reserve.select-hotels-2026');
    expect(select).toMatchObject({ kind: 'ends', date: '2026-12-31', days: 21 });
    const lyft = list.find((r) => r.perkId === 'chase-sapphire-reserve.lyft');
    expect(lyft).toMatchObject({ kind: 'resets', date: '2027-01-01' });
  });

  it('respects a custom window', () => {
    expect(upcomingResets([atFace('amex-gold')], '2026-11-08', {}, 7)).toEqual([]);
  });
});
