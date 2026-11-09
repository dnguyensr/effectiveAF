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
