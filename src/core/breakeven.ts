// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * Break-even spend: for a card that still costs money after credits, how much you'd need to
 * spend each month in one of its bonus categories to make up the difference, compared with
 * putting that spending on the user's everyday card instead (2% cash back by default).
 *
 *   extra value per $1 = multiplier × point value − baseline (e.g. 2¢)
 *   monthly spend      = effective cost ÷ extra value per $1 ÷ 12   (rounded up to whole $)
 */
import type { EarnRate } from '../catalog/types';

/**
 * What the user's everyday card earns, in % cash back (= cents per $1). Plenty of no-fee cards
 * earn 2%; a few earn 3% but need a paid membership (e.g. Robinhood Gold).
 */
export const DEFAULT_BASELINE_PERCENT = 2;
export const BASELINE_OPTIONS = [1, 1.5, 2, 2.5, 3] as const;
export const MIN_BASELINE_PERCENT = 1;
export const MAX_BASELINE_PERCENT = 3;
export const DEFAULT_POINT_VALUE_CENTS = 1;
export const MIN_POINT_VALUE_CENTS = 0.1;
export const MAX_POINT_VALUE_CENTS = 5;

export interface BreakEvenRow {
  category: string;
  multiplier: number;
  note?: string;
  /** Cents earned per $1 beyond what the everyday (baseline) card would earn. */
  extraCentsPerDollar: number;
  /** Whole dollars per month to break even, or null if this category doesn't beat the baseline. */
  monthlySpendDollars: number | null;
}

/** Null when there's nothing to make up (the card already pays for itself). */
export function breakEven(
  effectiveCents: number,
  earnRates: readonly EarnRate[],
  pointValueCents: number,
  baselinePercent: number = DEFAULT_BASELINE_PERCENT,
): BreakEvenRow[] | null {
  if (effectiveCents <= 0) return null;
  return earnRates.map((rate) => {
    // Round to 1/1000 of a cent so 3 × 1.1 − 2 doesn't become 1.3000000000000003.
    const extra = Math.round((rate.multiplier * pointValueCents - baselinePercent) * 1000) / 1000;
    return {
      category: rate.category,
      multiplier: rate.multiplier,
      ...(rate.note ? { note: rate.note } : {}),
      extraCentsPerDollar: extra,
      monthlySpendDollars: extra > 0 ? Math.ceil(effectiveCents / extra / 12 - 1e-9) : null,
    };
  });
}
