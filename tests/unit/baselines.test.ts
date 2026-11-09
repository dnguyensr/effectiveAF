// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * Golden baselines: the numbers the app produces for every catalog card, pinned in
 * tests/baselines/*.json. Any change to card data or the math shows up as a reviewable diff.
 *
 * Regenerate with `npm run baselines:update`, then explain the diff in your PR.
 * The date is fixed so expiring perks don't change the baselines over time.
 */
import { describe, expect, it } from 'vitest';
import { CATALOG } from '../../src/catalog';
import { summarizeCard } from '../../src/core/card-math';
import { formatUsd } from '../../src/core/money';
import { annualNominalCents } from '../../src/core/valuation';
import { summarizeWallet } from '../../src/core/wallet-math';

const AS_OF = '2026-11-08';
const usd = (cents: number) => formatUsd(cents);
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

describe('baselines', () => {
  it('catalog summary', async () => {
    const summary = CATALOG.map((card) => ({
      id: card.id,
      name: `${card.issuer} ${card.name}`,
      annualFee: usd(card.annualFeeCents),
      lastVerified: card.lastVerified,
      perks: card.perks.map((p) => ({
        id: p.id,
        cadence: p.cadence,
        perPeriod: usd(p.amountPerPeriodCents),
        annualNominal: usd(annualNominalCents(p)),
        defaultRatio: p.defaultRatio,
        ...(p.endsOn ? { endsOn: p.endsOn } : {}),
      })),
      totalNominal: usd(card.perks.reduce((s, p) => s + annualNominalCents(p), 0)),
    }));
    await expect(json(summary)).toMatchFileSnapshot('../baselines/catalog-summary.json');
  });

  it('default valuations', async () => {
    const cards = CATALOG.map((card) => {
      const s = summarizeCard(card, undefined, AS_OF);
      return {
        id: card.id,
        fee: usd(s.feeCents),
        perks: Object.fromEntries(s.perks.map((p) => [p.perk.id, usd(p.realizedCents)])),
        nominal: usd(s.nominalCents),
        realized: usd(s.realizedCents),
        effective: usd(s.effectiveCents),
        verdict: s.verdict,
      };
    });
    const wallet = summarizeWallet(
      CATALOG,
      CATALOG.map((c) => c.id),
      {},
      AS_OF,
    );
    await expect(
      json({
        asOf: AS_OF,
        cards,
        allCardsWallet: {
          fees: usd(wallet.feeCents),
          realized: usd(wallet.realizedCents),
          effective: usd(wallet.effectiveCents),
          verdict: wallet.verdict,
        },
      }),
    ).toMatchFileSnapshot('../baselines/default-valuations.json');
  });
});
