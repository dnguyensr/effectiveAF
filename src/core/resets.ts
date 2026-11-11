// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * When each credit's allowance next resets, so the app can say "use it before it's gone".
 *
 * Periods start on the 1st of a month. Calendar-year credits are anchored to January;
 * cardmember-year credits to the account anniversary month, which the user can enter per card
 * (we don't know it otherwise). Every-4-years credits have no meaningful next reset.
 */
import type { Cadence, PerkDef } from '../catalog/types';
import type { CardSummary } from './card-math';

const STEP_MONTHS: Record<Exclude<Cadence, 'every-4-years'>, number> = {
  monthly: 1,
  quarterly: 3,
  semiannual: 6,
  annual: 12,
};

function iso(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

/** Whole days from `fromIso` to `toIso` (both yyyy-mm-dd). */
export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round(
    (Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000,
  );
}

/**
 * The first day after `asOf` on which the perk's allowance resets, as yyyy-mm-dd, or null when
 * it can't be known (every-4-years credits, or a cardmember-year credit with no anniversary
 * month set).
 */
export function nextResetDate(
  perk: Pick<PerkDef, 'cadence' | 'resetBasis'>,
  asOf: string,
  anniversaryMonth: number | undefined,
): string | null {
  if (perk.cadence === 'every-4-years') return null;
  const anchor = perk.resetBasis === 'calendar-year' ? 1 : anniversaryMonth;
  if (anchor === undefined) return null;
  const step = STEP_MONTHS[perk.cadence];
  const [y, m] = asOf.split('-').map(Number) as [number, number];
  // Walk forward month by month (at most 12) to the next boundary strictly after asOf.
  for (let i = 1; i <= 12; i++) {
    const total = m - 1 + i;
    const month = (total % 12) + 1;
    const year = y + Math.floor(total / 12);
    if ((((month - anchor) % step) + step) % step === 0) return iso(year, month);
  }
  /* v8 ignore next */
  return null;
}

export interface UpcomingReset {
  cardId: string;
  cardName: string;
  perkId: string;
  perkName: string;
  /** yyyy-mm-dd of the reset, or of the end date for a credit that's going away. */
  date: string;
  days: number;
  kind: 'resets' | 'ends';
  /** The allowance for the current period that's about to be lost if unused. */
  periodCents: number;
}

/**
 * Credits the user values ("using") whose current period ends within `withinDays`, soonest
 * first. A credit that ends for good before its next reset is listed as ending.
 */
export function upcomingResets(
  cards: readonly CardSummary[],
  asOf: string,
  anniversaryMonths: Readonly<Record<string, number | undefined>>,
  withinDays = 30,
): UpcomingReset[] {
  const out: UpcomingReset[] = [];
  for (const c of cards) {
    for (const p of c.perks) {
      if (p.status !== 'using') continue;
      const reset = nextResetDate(p.perk, asOf, anniversaryMonths[c.card.id]);
      // endsOn is the last valid day; the credit is gone the day after.
      const ends = p.perk.endsOn;
      const endsFirst = ends !== undefined && (reset === null || ends < reset);
      const date = endsFirst ? ends : reset;
      if (date === null) continue;
      const days = daysBetween(asOf, date);
      if (days < 0 || days > withinDays) continue;
      out.push({
        cardId: c.card.id,
        cardName: c.card.name,
        perkId: p.perk.id,
        perkName: p.perk.name,
        date,
        days,
        kind: endsFirst ? 'ends' : 'resets',
        // A user-valued perk's amount is only a limit; what's at stake is the user's value.
        periodCents: p.perk.userValued ? p.realizedCents : p.perk.amountPerPeriodCents,
      });
    }
  }
  return out.sort((a, b) => a.days - b.days || a.perkName.localeCompare(b.perkName));
}
