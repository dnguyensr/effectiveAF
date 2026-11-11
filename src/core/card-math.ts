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

/** Whether the user holds the card or is deciding whether to sign up. */
export type Ownership = 'have' | 'considering';

/** What the user has changed for one card. Everything else comes from the catalog. */
export interface CardUserState {
  /** Defaults to "have". */
  ownership?: Ownership | undefined;
  /**
   * Whether the user will pay this card's statement balance in full every month. Unanswered
   * (undefined) counts as one more thing not set yet. All results assume paying in full.
   */
  paysInFull?: boolean | undefined;
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
  /** Face value per year; 0 for a user-valued perk, which has none. */
  nominalCents: number;
  /** The most the user can value it at: face value, or a user-valued perk's upper limit. */
  capCents: number;
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
  /**
   * Things still to decide: perks not valued yet, plus the pay-in-full question if unanswered
   * (treated like a credit that can only cost you).
   */
  unsetCount: number;
  /** Total number of things to decide: every perk plus the pay-in-full question. */
  itemCount: number;
  /** true: pays in full; false: not always; undefined: not answered yet. */
  paysInFull: boolean | undefined;
  ownership: Ownership;
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
      const cap = annualNominalCents(perk);
      const valuation = userState?.perks[perk.id];
      return {
        perk,
        nominalCents: perk.userValued ? 0 : cap,
        capCents: cap,
        realizedCents: realizedCents(cap, valuation),
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
    unsetCount:
      perks.filter((p) => p.status === 'unset').length +
      (userState?.paysInFull === undefined ? 1 : 0),
    itemCount: perks.length + 1,
    paysInFull: userState?.paysInFull,
    ownership: userState?.ownership ?? 'have',
  };
}
