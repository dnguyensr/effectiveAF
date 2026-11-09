// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * Money helpers. All amounts in the app are integer cents to avoid floating-point drift.
 */

const wholeDollars = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const withCents = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formats integer cents as USD: whole dollars when there are no cents ("$895"), else "$12.95". */
export function formatUsd(cents: number): string {
  if (!Number.isSafeInteger(cents)) {
    throw new RangeError(`formatUsd expects integer cents, got ${cents}`);
  }
  // Normalise -0 so it never renders as "-$0".
  const value = cents === 0 ? 0 : cents / 100;
  return cents % 100 === 0 ? wholeDollars.format(value) : withCents.format(value);
}

/**
 * Parses what a user typed into a dollar field ("150", "$1,250.5", " 12.95 ") into cents.
 * Returns null for anything that isn't a plain non-negative amount.
 */
export function parseDollarsToCents(text: string): number | null {
  const cleaned = text.trim().replace(/^\$/, '').replace(/,/g, '');
  if (!/^\d+(\.\d*)?$|^\.\d+$/.test(cleaned)) return null;
  const cents = Math.round(Number(cleaned) * 100);
  return Number.isSafeInteger(cents) ? cents : null;
}

/** Cents as a plain number string for an input field: 15000 -> "150", 1295 -> "12.95". */
export function centsToInputValue(cents: number): string {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
