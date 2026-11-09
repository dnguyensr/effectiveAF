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
  /** Credits for running a business: software, hiring, wireless, equipment. */
  | 'business'
  /** Added by the user: their own credit or a non-credit benefit (lounge access, insurance...). */
  | 'custom';

/**
 * What a perk is, independent of the card: used to line up similar credits across cards in
 * the comparison view. Ordered and grouped by KINDS.
 */
export const KINDS = [
  { id: 'travel-general', label: 'Travel credit', group: 'Travel' },
  { id: 'hotel', label: 'Hotel credits', group: 'Travel' },
  { id: 'airline-fees', label: 'Airline fee credit', group: 'Travel' },
  { id: 'trusted-traveler', label: 'Global Entry / TSA PreCheck', group: 'Travel' },
  { id: 'airport-security', label: 'CLEAR+', group: 'Travel' },
  { id: 'bonus-miles', label: 'Anniversary bonus', group: 'Travel' },
  { id: 'car-service', label: 'Car service', group: 'Travel' },
  { id: 'dining', label: 'Dining credits', group: 'Dining' },
  { id: 'food-delivery', label: 'Delivery promos', group: 'Dining' },
  { id: 'delivery-membership', label: 'Delivery membership', group: 'Dining' },
  { id: 'rideshare', label: 'Rideshare credits', group: 'Rideshare' },
  { id: 'rideshare-membership', label: 'Rideshare membership', group: 'Rideshare' },
  { id: 'streaming', label: 'Streaming & digital', group: 'Entertainment' },
  { id: 'events', label: 'Event tickets', group: 'Entertainment' },
  { id: 'retail', label: 'Retail credits', group: 'Shopping' },
  { id: 'shopping-membership', label: 'Shopping membership', group: 'Shopping' },
  { id: 'flexible', label: 'Choose-your-own credits', group: 'Shopping' },
  { id: 'business-software', label: 'Business software', group: 'Business' },
  { id: 'hiring', label: 'Hiring', group: 'Business' },
  { id: 'wireless', label: 'Wireless bill', group: 'Business' },
  { id: 'electronics', label: 'Computers & electronics', group: 'Business' },
  { id: 'fitness', label: 'Fitness', group: 'Wellness' },
  { id: 'wearables', label: 'Wearables', group: 'Wellness' },
  { id: 'custom', label: 'Your perks', group: 'Yours' },
] as const;

export type PerkKind = (typeof KINDS)[number]['id'];

export interface PerkDef {
  /** Stable ID, `<card-id>.<perk-slug>`. */
  id: string;
  name: string;
  /** One line on what it covers and how to trigger it. */
  description: string;
  category: PerkCategory;
  kind: PerkKind;
  cadence: Cadence;
  /** Allowance for one period, in cents (e.g. 2500 for "$25 per month"). */
  amountPerPeriodCents: number;
  /** One-off yearly extra on top of the periodic amount (e.g. Uber's $20 December bonus). */
  annualExtraCents?: number;
  resetBasis: ResetBasis;
  /** Short human cadence, e.g. "$25 / month". */
  cadenceLabel: string;
  requiresEnrollment: boolean;
  /** ISO date (inclusive). Before this date the perk isn't offered yet (e.g. an announced increase). */
  startsOn?: string;
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
  /** Short "good to know" notes: quirks and conditions that affect the card's value. */
  notes?: readonly string[];
  /** Rewards currency, e.g. "Membership Rewards points" (catalog cards only). */
  rewardsCurrency?: string;
  /** Points or miles per dollar by spending category, highest first (catalog cards only). */
  earnRates?: readonly EarnRate[];
}

export interface EarnRate {
  category: string;
  /** Points or miles per dollar. */
  multiplier: number;
  note?: string;
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
