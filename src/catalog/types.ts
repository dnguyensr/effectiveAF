// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * Catalog types: the bundled, read-only card and perk definitions.
 * IDs are stable forever: user data is keyed by them.
 */

/** How often a credit's allowance resets. */
export const CADENCES = ['monthly', 'quarterly', 'semiannual', 'annual', 'every-4-years'] as const;
export type Cadence = (typeof CADENCES)[number];

/** Whether the reset follows the calendar (Jan 1) or the account anniversary. */
export type ResetBasis = 'calendar-year' | 'cardmember-year';

export type PerkCategory =
  | 'travel'
  | 'dining'
  | 'entertainment'
  | 'retail'
  | 'rideshare'
  | 'wellness'
  | 'membership'
  /** Added by the user: their own credit or a non-credit benefit (lounge access, insurance...). */
  | 'custom';

export interface PerkDef {
  /** Stable ID, `<card-id>.<perk-slug>`. */
  id: string;
  name: string;
  /** One line on what it covers and how to trigger it. */
  description: string;
  category: PerkCategory;
  cadence: Cadence;
  /** Allowance for one period, in cents (e.g. 2500 for "$25 per month"). */
  amountPerPeriodCents: number;
  /** One-off yearly extra on top of the periodic amount (e.g. Uber's $20 December bonus). */
  annualExtraCents?: number;
  resetBasis: ResetBasis;
  /** Short human cadence, e.g. "$25 / month". */
  cadenceLabel: string;
  /** Typical share of the face value a regular cardholder actually uses, 0..1. */
  defaultRatio: number;
  requiresEnrollment: boolean;
  /** ISO date (inclusive). After this date the perk is treated as gone. */
  endsOn?: string;
  /** True for perks the user created. */
  custom?: boolean;
}

export interface CardDef {
  /** Stable ID, e.g. "amex-platinum". */
  id: string;
  issuer: string;
  name: string;
  annualFeeCents: number;
  perks: readonly PerkDef[];
  /** ISO date the data was last checked against the issuer's page (catalog cards only). */
  lastVerified?: string;
  sourceUrl?: string;
  /** True for cards the user created. */
  custom?: boolean;
}

/** A perk or benefit the user adds, to a catalog card or their own card. Stored in user state. */
export interface CustomPerkInput {
  id: string;
  name: string;
  cadence: Cadence;
  amountPerPeriodCents: number;
}

/** A card the user defines themselves. Its perks are CustomPerkInputs. Stored in user state. */
export interface CustomCardInput {
  id: string;
  issuer: string;
  name: string;
  annualFeeCents: number;
}
