// SPDX-License-Identifier: GPL-3.0-or-later
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { CardDef } from '../../../src/catalog/types';
import { summarizeCard, verdictFor } from '../../../src/core/card-math';
import { summarizeWallet } from '../../../src/core/wallet-math';

const testCard: CardDef = {
  id: 'test-card',
  issuer: 'Test Bank',
  name: 'Test Card',
  annualFeeCents: 25000,
  lastVerified: '2026-11-08',
  sourceUrl: 'https://example.com',
  perks: [
    {
      id: 'test-card.monthly',
      name: 'Monthly',
      description: '',
      category: 'dining',
      cadence: 'monthly',
      amountPerPeriodCents: 1000,
      resetBasis: 'calendar-year',
      cadenceLabel: '$10 / month',
      defaultRatio: 0.5,
      requiresEnrollment: false,
    },
    {
      id: 'test-card.expiring',
      name: 'Expiring',
      description: '',
      category: 'travel',
      cadence: 'annual',
      amountPerPeriodCents: 10000,
      resetBasis: 'calendar-year',
      cadenceLabel: '$100 / year',
      defaultRatio: 1,
      requiresEnrollment: false,
      endsOn: '2026-12-31',
    },
  ],
};

const otherCard: CardDef = { ...testCard, id: 'other-card', annualFeeCents: 10000, perks: [] };

describe('verdictFor', () => {
  it('treats zero and below as paying for itself', () => {
    expect(verdictFor(-1)).toBe('pays-for-itself');
    expect(verdictFor(0)).toBe('pays-for-itself');
    expect(verdictFor(1)).toBe('costs');
  });
});

describe('summarizeCard', () => {
  it('uses catalog defaults when the user has changed nothing', () => {
    const s = summarizeCard(testCard, undefined, '2026-11-08');
    expect(s.feeCents).toBe(25000);
    expect(s.isFeeOverridden).toBe(false);
    expect(s.nominalCents).toBe(22000);
    expect(s.realizedCents).toBe(6000 + 10000);
    expect(s.effectiveCents).toBe(9000);
    expect(s.verdict).toBe('costs');
    expect(s.perks.map((p) => p.enabled)).toEqual([true, true]);
  });

  it('drops expired perks from the list and every total', () => {
    const s = summarizeCard(testCard, undefined, '2027-01-01');
    expect(s.perks.map((p) => p.perk.id)).toEqual(['test-card.monthly']);
    expect(s.nominalCents).toBe(12000);
    expect(s.realizedCents).toBe(6000);
  });

  it('applies a fee override and user valuations', () => {
    const s = summarizeCard(
      testCard,
      {
        feeOverrideCents: 5000,
        perks: {
          'test-card.monthly': { mode: 'dollars', cents: 12000, enabled: true },
          'test-card.expiring': { mode: 'percent', percent: 100, enabled: false },
        },
      },
      '2026-11-08',
    );
    expect(s.feeCents).toBe(5000);
    expect(s.isFeeOverridden).toBe(true);
    expect(s.realizedCents).toBe(12000);
    expect(s.effectiveCents).toBe(-7000);
    expect(s.verdict).toBe('pays-for-itself');
    expect(s.perks[1]?.enabled).toBe(false);
  });

  it('does not flag an override equal to the catalog fee', () => {
    const s = summarizeCard(testCard, { feeOverrideCents: 25000, perks: {} }, '2026-11-08');
    expect(s.isFeeOverridden).toBe(false);
  });

  it('ignores valuations for perks that no longer exist', () => {
    const s = summarizeCard(
      testCard,
      { perks: { 'test-card.retired': { mode: 'dollars', cents: 99999, enabled: true } } },
      '2026-11-08',
    );
    expect(s.realizedCents).toBe(16000);
  });
});

describe('summarizeWallet', () => {
  const catalog = [testCard, otherCard];

  it('totals only cards in the wallet, ignoring duplicates and unknown IDs', () => {
    const w = summarizeWallet(
      catalog,
      ['test-card', 'retired-card', 'test-card'],
      {},
      '2026-11-08',
    );
    expect(w.cards.map((c) => c.card.id)).toEqual(['test-card']);
    expect(w.unknownCardIds).toEqual(['retired-card']);
    expect(w.feeCents).toBe(25000);
    expect(w.realizedCents).toBe(16000);
    expect(w.effectiveCents).toBe(9000);
    expect(w.verdict).toBe('costs');
  });

  it('is an empty, zero wallet with no cards', () => {
    const w = summarizeWallet(catalog, [], {}, '2026-11-08');
    expect(w).toMatchObject({ feeCents: 0, realizedCents: 0, effectiveCents: 0, cards: [] });
    expect(w.verdict).toBe('pays-for-itself');
  });

  it('property: wallet totals equal the sum of card totals, and effective = fee - realized', () => {
    fc.assert(
      fc.property(
        fc.subarray(['test-card', 'other-card']),
        fc.option(fc.integer({ min: 0, max: 1_000_000 }), { nil: undefined }),
        fc.integer({ min: 0, max: 100 }),
        (wallet, fee, pct) => {
          const w = summarizeWallet(
            catalog,
            wallet,
            {
              'test-card': {
                feeOverrideCents: fee,
                perks: { 'test-card.monthly': { mode: 'percent', percent: pct, enabled: true } },
              },
            },
            '2026-11-08',
          );
          const sumFee = w.cards.reduce((s, c) => s + c.feeCents, 0);
          const sumRealized = w.cards.reduce((s, c) => s + c.realizedCents, 0);
          expect(w.feeCents).toBe(sumFee);
          expect(w.realizedCents).toBe(sumRealized);
          expect(w.effectiveCents).toBe(w.feeCents - w.realizedCents);
          for (const c of w.cards) {
            const perkSum = c.perks.reduce((s, p) => s + p.realizedCents, 0);
            expect(c.realizedCents).toBe(perkSum);
            expect(c.effectiveCents).toBe(c.feeCents - perkSum);
          }
        },
      ),
    );
  });
});
