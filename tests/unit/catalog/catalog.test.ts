// SPDX-License-Identifier: GPL-3.0-or-later
/** Integrity rules every catalog card must satisfy. */
import { describe, expect, it } from 'vitest';
import { CATALOG, CATALOG_VERSION, findCard } from '../../../src/catalog';
import { MAX_POINT_VALUE_CENTS, MIN_POINT_VALUE_CENTS } from '../../../src/core/breakeven';
import { annualNominalCents } from '../../../src/core/valuation';
import { ID_PATTERN } from '../../../src/state/schema';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const isRealDate = (iso: string) =>
  ISO_DATE.test(iso) && new Date(`${iso}T00:00:00Z`).toISOString().startsWith(iso);

describe('catalog', () => {
  it('contains the Phase 1, Tier 1–3 and co-brand cards, grouped by issuer', () => {
    expect(CATALOG.map((c) => c.id)).toEqual([
      'amex-platinum',
      'amex-gold',
      'amex-business-platinum',
      'amex-blue-cash-preferred',
      'amex-hilton-aspire',
      'amex-hilton-surpass',
      'amex-hilton-business',
      'amex-marriott-brilliant',
      'amex-delta-reserve',
      'amex-delta-platinum',
      'amex-delta-gold',
      'chase-sapphire-preferred',
      'chase-sapphire-reserve',
      'chase-sapphire-reserve-business',
      'chase-ink-business-preferred',
      'chase-ink-business-premier',
      'chase-united-club',
      'chase-united-quest',
      'chase-united-explorer',
      'chase-marriott-boundless',
      'chase-ihg-premier-select',
      'chase-ihg-premier',
      'chase-ihg-business',
      'capital-one-venture-x',
      'capital-one-venture-x-business',
      'capital-one-venture',
      'citi-strata-elite',
      'citi-strata-premier',
      'citi-aadvantage-executive',
      'bofa-premium-rewards-elite',
      'bofa-premium-rewards',
      'wells-fargo-autograph-journey',
      'bilt-palladium',
      'bilt-obsidian',
    ]);
  });

  it('has a valid version date', () => {
    expect(isRealDate(CATALOG_VERSION)).toBe(true);
  });

  it('finds cards by id', () => {
    expect(findCard('amex-gold')?.name).toBe('Gold Card');
    expect(findCard('nope')).toBeUndefined();
  });

  it('uses unique, well-formed card and perk IDs', () => {
    const ids = CATALOG.flatMap((c) => [c.id, ...c.perks.map((p) => p.id)]);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(ID_PATTERN);
  });

  describe.each(CATALOG.map((c) => [c.id, c] as const))('%s', (_id, card) => {
    it('has sane card fields', () => {
      expect(Number.isSafeInteger(card.annualFeeCents)).toBe(true);
      expect(card.annualFeeCents).toBeGreaterThanOrEqual(0);
      expect(card.custom).toBeUndefined();
      expect(isRealDate(card.lastVerified ?? '')).toBe(true);
      expect(card.sourceUrl ?? '').toMatch(/^https:\/\//);
      // Rewards-only cards may have no credits, but then earning has to carry the answer.
      if (card.perks.length === 0) expect(card.earnRates?.length ?? 0).toBeGreaterThan(1);
      if (card.defaultPointValueCents !== undefined) {
        expect(card.cashBack).toBeUndefined();
        expect(card.defaultPointValueCents).toBeGreaterThanOrEqual(MIN_POINT_VALUE_CENTS);
        expect(card.defaultPointValueCents).toBeLessThanOrEqual(MAX_POINT_VALUE_CENTS);
      }
    });

    it.each(card.perks.map((p) => [p.id, p] as const))('perk %s is well-formed', (_pid, perk) => {
      expect(perk.id.startsWith(`${card.id}.`)).toBe(true);
      expect(perk.name.trim()).not.toBe('');
      expect(perk.description.trim()).not.toBe('');
      expect(perk.cadenceLabel.trim()).not.toBe('');
      expect(Number.isSafeInteger(perk.amountPerPeriodCents)).toBe(true);
      expect(perk.amountPerPeriodCents).toBeGreaterThan(0);
      if (perk.annualExtraCents !== undefined) {
        expect(Number.isSafeInteger(perk.annualExtraCents)).toBe(true);
        expect(perk.annualExtraCents).toBeGreaterThan(0);
      }
      expect(annualNominalCents(perk)).toBeGreaterThan(0);
      if (perk.endsOn !== undefined) expect(isRealDate(perk.endsOn)).toBe(true);
      if (perk.startsOn !== undefined) expect(isRealDate(perk.startsOn)).toBe(true);
      if (perk.startsOn && perk.endsOn) expect(perk.startsOn <= perk.endsOn).toBe(true);
    });
  });

  it('flags cards not re-verified in the last 180 days (warning only)', () => {
    const now = Date.now();
    const stale = CATALOG.filter(
      (c) => now - new Date(`${c.lastVerified}T00:00:00Z`).getTime() > 180 * 86_400_000,
    );
    if (stale.length > 0) {
      console.warn(
        `Catalog data older than 180 days, re-verify: ${stale.map((c) => c.id).join(', ')}`,
      );
    }
    expect(true).toBe(true);
  });
});
