// SPDX-License-Identifier: GPL-3.0-or-later
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { CATALOG, findCard } from '../../../src/catalog';
import type { CardDef } from '../../../src/catalog/types';
import { breakEven } from '../../../src/core/breakeven';
import { summarizeCard } from '../../../src/core/card-math';
import { applyPreset } from '../../../src/core/presets';
import { customCardDef } from '../../../src/core/resolve';
import { PAY_IN_FULL_FOOTNOTE, walletMarkdown } from '../../../src/core/share';
import { summarizeWallet } from '../../../src/core/wallet-math';

const rates = (id: string) => (findCard(id) as CardDef).earnRates ?? [];

describe('catalog earn rates', () => {
  it('every catalog card lists earn rates, highest first, ending with everything else', () => {
    for (const card of CATALOG) {
      const r = card.earnRates ?? [];
      expect(r.length, card.id).toBeGreaterThan(1);
      expect(card.rewardsCurrency, card.id).toBeTruthy();
      for (const rate of r) expect(rate.multiplier).toBeGreaterThan(0);
      const m = r.map((x) => x.multiplier);
      expect([...m].sort((a, b) => b - a)).toEqual(m);
      expect(r.at(-1)?.category).toBe('Everything else');
    }
  });
});

describe('breakEven (hand-computed)', () => {
  it('Venture X costing $395 at 1¢ a mile', () => {
    const rows = breakEven(39500, rates('capital-one-venture-x'), 1);
    // 10x: 10¢ − 2¢ = 8¢ per $ → $395 / 0.08 = $4,937.50 a year → $411.46 → $412 a month
    // 5x: 3¢ per $ → $13,166.67 a year → $1,097.22 → $1,098 a month
    // 2x: 2¢ − 2¢ = 0 → never beats a 2% card
    expect(rows?.map((r) => [r.multiplier, r.extraCentsPerDollar, r.monthlySpendDollars])).toEqual([
      [10, 8, 412],
      [5, 3, 1098],
      [2, 0, null],
    ]);
  });

  it('Gold costing $325 at 1.5¢ a point', () => {
    // 4x × 1.5¢ = 6¢ − 2¢ = 4¢ → $325 / 0.04 = $8,125 a year → $677.08 → $678 a month
    const rows = breakEven(32500, rates('amex-gold'), 1.5);
    expect(rows?.[0]).toMatchObject({ extraCentsPerDollar: 4, monthlySpendDollars: 678 });
    expect(rows?.[0]?.note).toBe('up to $50,000 a year');
    // 1x × 1.5¢ = 1.5¢ < 2¢
    expect(rows?.at(-1)?.monthlySpendDollars).toBeNull();
  });

  it('avoids floating-point noise in the extra value', () => {
    const rows = breakEven(10000, [{ category: 'X', multiplier: 3 }], 1.1);
    expect(rows?.[0]?.extraCentsPerDollar).toBe(1.3);
  });

  it('measures against the everyday card the user chooses (hand-computed)', () => {
    // Venture X costing $395 at 1¢ a mile:
    // 1.5% baseline: 10x -> 8.5¢ extra per $ -> $4,647.06/yr -> $387.25 -> $388/mo;
    //   5x -> 3.5¢ -> $11,285.71/yr -> $940.48 -> $941/mo;
    //   2x -> 0.5¢ -> $79,000/yr -> $6,583.33 -> $6,584/mo
    // 3% baseline: 5x -> 2¢ extra -> $19,750/yr -> $1,645.83 -> $1,646/mo; 2x never beats 3%
    const vx = rates('capital-one-venture-x');
    expect(breakEven(39500, vx, 1, 1.5)?.map((r) => r.monthlySpendDollars)).toEqual([
      388, 941, 6584,
    ]);
    expect(breakEven(39500, vx, 1, 3)?.map((r) => r.monthlySpendDollars)).toEqual([
      471,
      1646,
      null,
    ]);
  });

  it('is null when the card already pays for itself', () => {
    expect(breakEven(0, rates('amex-gold'), 1)).toBeNull();
    expect(breakEven(-500, rates('amex-gold'), 1)).toBeNull();
  });

  it('property: spending the monthly amount for a year always covers the cost', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 2_000_000 }),
        fc.integer({ min: 1, max: 20 }),
        fc.double({ min: 0.1, max: 5, noNaN: true }),
        (cost, multiplier, cpp) => {
          const row = breakEven(cost, [{ category: 'X', multiplier }], cpp)?.[0];
          if (row?.monthlySpendDollars == null) return;
          expect(row.monthlySpendDollars * 12 * row.extraCentsPerDollar).toBeGreaterThanOrEqual(
            cost - 1e-6,
          );
        },
      ),
    );
  });
});

describe('walletMarkdown', () => {
  it('produces a forum-ready table plus a line per card', () => {
    const plat = findCard('amex-platinum') as CardDef;
    const gold = findCard('amex-gold') as CardDef;
    const odd = customCardDef({
      id: 'custom-x',
      issuer: '',
      name: 'Pipe | Card',
      annualFeeCents: 0,
    });
    const cards = [plat, gold, odd];
    const wallet = summarizeWallet(
      cards,
      ['amex-platinum', 'amex-gold', 'custom-x'],
      {
        'amex-platinum': {
          perks: {
            ...applyPreset(plat, {}, 'clear'),
            'amex-platinum.resy': { mode: 'percent', percent: 50, enabled: true },
            'amex-platinum.equinox': { mode: 'percent', percent: 0, enabled: false },
          },
          paysInFull: false,
        },
        'amex-gold': { perks: applyPreset(gold, {}, 'face'), paysInFull: true },
      },
      '2026-11-08',
    );
    expect(walletMarkdown(wallet, '2026-11-08')).toBe(
      [
        '**My credit card wallet** (values as of Nov 8, 2026)',
        '',
        '| Card | Annual fee | Credits I actually use | Effective cost |',
        '|---|--:|--:|---|',
        '| American Express Platinum Card | $895 | $200 of $3,024 | Costs $695/yr\\* |',
        '| American Express Gold Card | $325 | $424 of $424 | Pays for itself (+$99) |',
        '| Pipe \\| Card | $0 | $0 of $0 | Pays for itself (+$0)\\* |',
        '| **Total** | **$1,220** | **$624** | **Costs $596/yr**\\* |',
        '',
        "**Platinum Card:** using Resy dining credit ($200); won't use Equinox credit; 10 not valued yet; I don't always pay it in full.",
        "**Gold Card:** using Dining credit ($120), Uber Cash ($120), Resy dining credit ($100), Dunkin' credit ($84).",
        '**Pipe \\| Card:** using no credits.',
        '',
        PAY_IN_FULL_FOOTNOTE,
        '',
        "_Calculated with effectiveAF: https://dnguyensr.github.io/effectiveAF/. Credit amounts come from issuers' public pages and change often; check current terms._",
        '',
      ].join('\n'),
    );
  });

  it('handles an empty wallet', () => {
    const md = walletMarkdown(summarizeWallet(CATALOG, [], {}, '2026-11-08'), '2026-11-08');
    expect(md).toContain('| **Total** | **$0** | **$0** | **Pays for itself (+$0)** |');
  });

  it('summarizes a single card the same way as summarizeCard', () => {
    const vx = findCard('capital-one-venture-x') as CardDef;
    const s = summarizeCard(vx, undefined, '2026-11-08');
    const md = walletMarkdown(summarizeWallet([vx], [vx.id], {}, '2026-11-08'), '2026-11-08');
    expect(md).toContain(`| Capital One Venture X | $395 | $0 of ${'$430'} | Costs $395/yr\\* |`);
    expect(s.unsetCount).toBe(4);
    expect(md).toContain('**Venture X:** using no credits; 3 not valued yet.');
  });
});
