// SPDX-License-Identifier: GPL-3.0-or-later
/** Integrity rules every catalog card must satisfy. */
import { describe, expect, it } from 'vitest';
import { CATALOG, CATALOG_VERSION, findCard } from '../../../src/catalog';
import { annualNominalCents } from '../../../src/core/valuation';
import { ID_PATTERN } from '../../../src/state/schema';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const isRealDate = (iso: string) =>
  ISO_DATE.test(iso) && new Date(`${iso}T00:00:00Z`).toISOString().startsWith(iso);

describe('catalog', () => {
  it('contains the five Phase 1 cards', () => {
    expect(CATALOG.map((c) => c.id)).toEqual([
      'amex-platinum',
      'amex-gold',
      'chase-sapphire-preferred',
      'chase-sapphire-reserve',
      'capital-one-venture-x',
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
      expect(isRealDate(card.lastVerified)).toBe(true);
      expect(card.sourceUrl).toMatch(/^https:\/\//);
      expect(card.perks.length).toBeGreaterThan(0);
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
      expect(perk.defaultRatio).toBeGreaterThanOrEqual(0);
      expect(perk.defaultRatio).toBeLessThanOrEqual(1);
      expect(annualNominalCents(perk)).toBeGreaterThan(0);
      if (perk.endsOn !== undefined) expect(isRealDate(perk.endsOn)).toBe(true);
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
