// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * Break-even spend: for a card that still costs money after credits, how much you'd need to
 * spend each month in one of its bonus categories to make up the difference, compared with
 * simply using a 2% cash-back card for that spending instead.
 *
 *   extra value per $1 = multiplier × point value − 2¢
 *   monthly spend      = effective cost ÷ extra value per $1 ÷ 12   (rounded up to whole $)
 */
import type { EarnRate } from '../catalog/types';

/** The no-fee alternative every card is measured against: 2% cash back. */
export const BASELINE_CENTS_PER_DOLLAR = 2;
export const DEFAULT_POINT_VALUE_CENTS = 1;
export const MIN_POINT_VALUE_CENTS = 0.1;
export const MAX_POINT_VALUE_CENTS = 5;

export interface BreakEvenRow {
  category: string;
  multiplier: number;
  note?: string;
  /** Cents earned per $1 beyond what the 2% card would earn. */
  extraCentsPerDollar: number;
  /** Whole dollars per month to break even, or null if this category doesn't beat 2%. */
  monthlySpendDollars: number | null;
}

/** Null when there's nothing to make up (the card already pays for itself). */
export function breakEven(
  effectiveCents: number,
  earnRates: readonly EarnRate[],
  pointValueCents: number,
): BreakEvenRow[] | null {
  if (effectiveCents <= 0) return null;
  return earnRates.map((rate) => {
    // Round to 1/1000 of a cent so 3 × 1.1 − 2 doesn't become 1.3000000000000003.
    const extra =
      Math.round((rate.multiplier * pointValueCents - BASELINE_CENTS_PER_DOLLAR) * 1000) / 1000;
    return {
      category: rate.category,
      multiplier: rate.multiplier,
      ...(rate.note ? { note: rate.note } : {}),
      extraCentsPerDollar: extra,
      monthlySpendDollars: extra > 0 ? Math.ceil(effectiveCents / extra / 12 - 1e-9) : null,
    };
  });
}
