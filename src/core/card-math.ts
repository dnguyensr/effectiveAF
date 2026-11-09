// SPDX-License-Identifier: GPL-3.0-or-later
import type { CardDef, CustomPerkInput, PerkDef } from '../catalog/types';
import {
  annualNominalCents,
  isPerkAvailable,
  perkStatus,
  realizedCents,
  type PerkStatus,
  type PerkValuation,
} from './valuation';
import { toWholeDollars } from './money';

/** What the user has changed for one card. Everything else comes from the catalog. */
export interface CardUserState {
  feeOverrideCents?: number | undefined;
  perks: Record<string, PerkValuation>;
  /** Month (1-12) the account was opened; anchors cardmember-year resets. */
  anniversaryMonth?: number | undefined;
  /** What the user thinks one point or mile is worth, in cents (for break-even). */
  pointValueCents?: number | undefined;
  /** Perks or benefits the user added to this card. */
  customPerks?: CustomPerkInput[] | undefined;
}

export type Verdict = 'pays-for-itself' | 'costs';

export interface PerkSummary {
  perk: PerkDef;
  nominalCents: number;
  realizedCents: number;
  valuation: PerkValuation | undefined;
  status: PerkStatus;
}

export interface CardSummary {
  card: CardDef;
  feeCents: number;
  isFeeOverridden: boolean;
  nominalCents: number;
  realizedCents: number;
  /** fee − realized. Zero or below means the card pays for itself. */
  effectiveCents: number;
  verdict: Verdict;
  /** Perks still offered on `asOf`; expired ones are left out of every total. */
  perks: PerkSummary[];
  /** How many of `perks` the user hasn't valued yet. */
  unsetCount: number;
}

export function verdictFor(effectiveCents: number): Verdict {
  return effectiveCents <= 0 ? 'pays-for-itself' : 'costs';
}

export function summarizeCard(
  card: CardDef,
  userState: CardUserState | undefined,
  asOf: string,
): CardSummary {
  const perks = card.perks
    .filter((perk) => isPerkAvailable(perk, asOf))
    .map((perk): PerkSummary => {
      const nominal = annualNominalCents(perk);
      const valuation = userState?.perks[perk.id];
      return {
        perk,
        nominalCents: nominal,
        realizedCents: realizedCents(nominal, valuation),
        valuation,
        status: perkStatus(valuation),
      };
    });

  const override = userState?.feeOverrideCents;
  const feeCents = toWholeDollars(override ?? card.annualFeeCents);
  const nominalCents = perks.reduce((sum, p) => sum + p.nominalCents, 0);
  const realized = perks.reduce((sum, p) => sum + p.realizedCents, 0);
  const effectiveCents = feeCents - realized;

  return {
    card,
    feeCents,
    isFeeOverridden: override !== undefined && override !== card.annualFeeCents,
    nominalCents,
    realizedCents: realized,
    effectiveCents,
    verdict: verdictFor(effectiveCents),
    perks,
    unsetCount: perks.filter((p) => p.status === 'unset').length,
  };
}
