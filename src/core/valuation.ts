// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * How much of a perk's face value a user actually gets.
 *
 * The user values a perk either as a percentage of face value or as a dollar amount. Which
 * one they used is remembered: a percentage scales if the catalog's face value is corrected
 * later, while a typed dollar amount stays put (capped at the new face value).
 */
import type { Cadence, PerkDef } from '../catalog/types';
import { clamp } from './money';

export type PerkValuation =
  | { mode: 'percent'; percent: number; enabled: boolean }
  | { mode: 'dollars'; cents: number; enabled: boolean };

const PERIODS_PER_YEAR: Record<Exclude<Cadence, 'every-4-years'>, number> = {
  monthly: 12,
  quarterly: 4,
  semiannual: 2,
  annual: 1,
};

/** Face value per year, in cents. Every-4-years credits are spread evenly over 4 years. */
export function annualNominalCents(
  perk: Pick<PerkDef, 'cadence' | 'amountPerPeriodCents' | 'annualExtraCents'>,
): number {
  const extra = perk.annualExtraCents ?? 0;
  if (perk.cadence === 'every-4-years') {
    return Math.round(perk.amountPerPeriodCents / 4) + extra;
  }
  return perk.amountPerPeriodCents * PERIODS_PER_YEAR[perk.cadence] + extra;
}

/** True while the perk is offered on `asOf` (ISO yyyy-mm-dd; string compare is safe). */
export function isPerkAvailable(perk: Pick<PerkDef, 'endsOn'>, asOf: string): boolean {
  return perk.endsOn === undefined || asOf <= perk.endsOn;
}

function finiteOr0(n: number): number {
  return Number.isFinite(n) ? n : 0;
}

/**
 * Realized value in cents for one perk.
 * - no valuation yet: the catalog's typical ratio
 * - disabled: 0
 * - percent: clamped to 0–100%
 * - dollars: clamped to 0..face value
 */
export function realizedCents(
  nominalCents: number,
  valuation: PerkValuation | undefined,
  defaultRatio: number,
): number {
  if (valuation === undefined) {
    return Math.round(nominalCents * clamp(finiteOr0(defaultRatio), 0, 1));
  }
  if (!valuation.enabled) return 0;
  if (valuation.mode === 'percent') {
    return Math.round((nominalCents * clamp(finiteOr0(valuation.percent), 0, 100)) / 100);
  }
  return Math.round(clamp(finiteOr0(valuation.cents), 0, nominalCents));
}

/** Whole-number percentage of face value, for positioning the slider. */
export function percentOfNominal(realized: number, nominalCents: number): number {
  if (nominalCents <= 0) return 0;
  return clamp(Math.round((realized / nominalCents) * 100), 0, 100);
}
