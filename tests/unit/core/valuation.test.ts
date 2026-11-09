// SPDX-License-Identifier: GPL-3.0-or-later
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Cadence } from '../../../src/catalog/types';
import {
  annualNominalCents,
  isPerkAvailable,
  percentOfNominal,
  perkStatus,
  realizedCents,
  type PerkValuation,
} from '../../../src/core/valuation';

describe('annualNominalCents', () => {
  it.each<[Cadence, number, number | undefined, number]>([
    ['monthly', 2500, undefined, 30000],
    ['monthly', 1500, 2000, 20000], // Uber Cash: $15/mo + $20 December bonus
    ['monthly', 1295, undefined, 15500], // Walmart+: $155.40 -> $155
    ['quarterly', 10000, undefined, 40000],
    ['semiannual', 30000, undefined, 60000],
    ['annual', 21900, undefined, 21900],
    ['every-4-years', 12000, undefined, 3000],
    ['every-4-years', 8500, undefined, 2100], // $21.25 -> $21
    ['every-4-years', 21900, undefined, 5500], // $54.75 -> $55
  ])('%s of %d (+%s extra) = %d / year', (cadence, amount, extra, expected) => {
    expect(
      annualNominalCents({
        cadence,
        amountPerPeriodCents: amount,
        ...(extra === undefined ? {} : { annualExtraCents: extra }),
      }),
    ).toBe(expected);
  });
});

describe('isPerkAvailable', () => {
  it('is available when there is no end date', () => {
    expect(isPerkAvailable({}, '2099-01-01')).toBe(true);
  });

  it('is available up to and including the end date', () => {
    expect(isPerkAvailable({ endsOn: '2026-12-31' }, '2026-12-30')).toBe(true);
    expect(isPerkAvailable({ endsOn: '2026-12-31' }, '2026-12-31')).toBe(true);
    expect(isPerkAvailable({ endsOn: '2026-12-31' }, '2027-01-01')).toBe(false);
  });
});

describe('realizedCents', () => {
  const nominal = 20000;

  it('assumes nothing: a perk the user has not valued counts as zero', () => {
    expect(realizedCents(nominal, undefined)).toBe(0);
  });

  it("values a won't-use perk at zero whatever was entered", () => {
    expect(realizedCents(nominal, { mode: 'percent', percent: 80, enabled: false })).toBe(0);
    expect(realizedCents(nominal, { mode: 'dollars', cents: 5000, enabled: false })).toBe(0);
  });

  it.each<[PerkValuation, number]>([
    [{ mode: 'percent', percent: 50, enabled: true }, 10000],
    [{ mode: 'percent', percent: 33, enabled: true }, 6600],
    [{ mode: 'percent', percent: 150, enabled: true }, 20000],
    [{ mode: 'percent', percent: -10, enabled: true }, 0],
    [{ mode: 'percent', percent: Number.NaN, enabled: true }, 0],
    [{ mode: 'dollars', cents: 15000, enabled: true }, 15000],
    [{ mode: 'dollars', cents: 99900, enabled: true }, 20000],
    [{ mode: 'dollars', cents: -5, enabled: true }, 0],
    [{ mode: 'dollars', cents: Number.POSITIVE_INFINITY, enabled: true }, 0],
  ])('%o -> %d', (valuation, expected) => {
    expect(realizedCents(nominal, valuation)).toBe(expected);
  });

  it('rounds values to whole dollars', () => {
    // 33% of $155 = $51.15 -> $51; 50% of $219 = $109.50 -> $110
    expect(realizedCents(15500, { mode: 'percent', percent: 33, enabled: true })).toBe(5100);
    expect(realizedCents(21900, { mode: 'percent', percent: 50, enabled: true })).toBe(11000);
    expect(realizedCents(21900, { mode: 'dollars', cents: 4949, enabled: true })).toBe(4900);
  });

  it('keeps a typed dollar amount when the face value grows, and caps it when it shrinks', () => {
    const typed: PerkValuation = { mode: 'dollars', cents: 15000, enabled: true };
    expect(realizedCents(30000, typed)).toBe(15000);
    expect(realizedCents(10000, typed)).toBe(10000);
  });

  it('scales a percentage with the face value', () => {
    const pct: PerkValuation = { mode: 'percent', percent: 50, enabled: true };
    expect(realizedCents(30000, pct)).toBe(15000);
    expect(realizedCents(10000, pct)).toBe(5000);
  });

  describe('properties', () => {
    const valuation = fc.oneof(
      fc.record({
        mode: fc.constant('percent' as const),
        percent: fc.double({ min: -1000, max: 1000, noNaN: false }),
        enabled: fc.boolean(),
      }),
      fc.record({
        mode: fc.constant('dollars' as const),
        cents: fc.integer({ min: -1e9, max: 1e9 }),
        enabled: fc.boolean(),
      }),
    );

    it('is always whole dollars between 0 and the (whole-dollar) face value', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100_000 }).map((d) => d * 100),
          fc.option(valuation, { nil: undefined }),
          (nom, val) => {
            const r = realizedCents(nom, val);
            expect(r % 100).toBe(0);
            expect(r).toBeGreaterThanOrEqual(0);
            expect(r).toBeLessThanOrEqual(nom);
          },
        ),
      );
    });

    it('percent -> dollars -> percent round-trips within 1 point', () => {
      fc.assert(
        fc.property(
          // From $100 up, whole-dollar rounding moves the percentage by at most 1 point.
          fc.integer({ min: 100, max: 100_000 }).map((d) => d * 100),
          fc.integer({ min: 0, max: 100 }),
          (nom, pct) => {
            const r = realizedCents(nom, { mode: 'percent', percent: pct, enabled: true });
            expect(Math.abs(percentOfNominal(r, nom) - pct)).toBeLessThanOrEqual(1);
          },
        ),
      );
    });
  });
});

describe('perkStatus', () => {
  it("distinguishes not set, using and won't use", () => {
    expect(perkStatus(undefined)).toBe('unset');
    expect(perkStatus({ mode: 'dollars', cents: 0, enabled: true })).toBe('using');
    expect(perkStatus({ mode: 'percent', percent: 50, enabled: false })).toBe('skipped');
  });
});

describe('percentOfNominal', () => {
  it.each([
    [10000, 20000, 50],
    [0, 20000, 0],
    [20000, 20000, 100],
    [30000, 20000, 100],
    [5, 0, 0],
    [3885, 15540, 25],
  ])('%d of %d = %d%%', (realized, nominal, pct) => {
    expect(percentOfNominal(realized, nominal)).toBe(pct);
  });
});
