// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * Money helpers. Amounts are stored as integer cents (the saved-data format), but every value
 * the app computes or shows is a whole dollar: credits, fees and totals are rounded to the
 * nearest dollar so the numbers stay simple to read and add up.
 */

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Rounds cents to whole dollars (half away from zero), still in cents: 15540 -> 15500. */
export function toWholeDollars(cents: number): number {
  const rounded = Math.sign(cents) * Math.round(Math.abs(cents) / 100) * 100;
  // Normalise -0 so it never renders as "-$0".
  return rounded === 0 ? 0 : rounded;
}

/** Formats cents as whole US dollars: 89500 -> "$895", 1295 -> "$13", -27500 -> "-$275". */
export function formatUsd(cents: number): string {
  if (!Number.isFinite(cents) || Math.abs(cents) > Number.MAX_SAFE_INTEGER) {
    throw new RangeError(`formatUsd expects a finite amount in cents, got ${cents}`);
  }
  return usd.format(toWholeDollars(cents) / 100);
}

/**
 * Parses what a user typed into a dollar field ("150", "$1,250", " 12.95 ") into cents,
 * rounded to whole dollars. Returns null for anything that isn't a plain non-negative amount.
 */
export function parseDollarsToCents(text: string): number | null {
  const cleaned = text.trim().replace(/^\$/, '').replace(/,/g, '');
  if (!/^\d+(\.\d*)?$|^\.\d+$/.test(cleaned)) return null;
  const cents = Math.round(Number(cleaned)) * 100;
  return Number.isSafeInteger(cents) ? cents : null;
}

/** Cents as a whole-dollar string for an input field: 15000 -> "150", 1295 -> "13". */
export function centsToInputValue(cents: number): string {
  return String(toWholeDollars(cents) / 100);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
