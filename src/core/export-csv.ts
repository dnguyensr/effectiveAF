// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * Spreadsheet export: one row per perk plus one "Annual fee" row per card (as a negative
 * amount), so summing a card's rows in a spreadsheet gives its net value. Amounts are whole
 * dollars with no "$", so spreadsheets read them as numbers.
 */
import type { PerkStatus } from './valuation';
import type { CardSummary } from './card-math';
import { toWholeDollars } from './money';

/** Cents to a whole-dollar number (0 for -0, so a $0 fee never shows as -0). */
const dollars = (cents: number) => toWholeDollars(cents) / 100 || 0;

export const CSV_COLUMNS = [
  'Card',
  'Issuer',
  'Have or considering',
  'Item',
  'Cadence',
  'Face value per year',
  'Your value per year',
  'Status',
] as const;

const STATUS_LABEL: Record<PerkStatus, string> = {
  unset: 'Not set',
  using: 'Using',
  skipped: "Won't use",
};

/**
 * Quotes a cell per RFC 4180, and defuses spreadsheet formulas: a cell starting with =, +, -,
 * @, tab or carriage return gets a leading apostrophe, so a perk named "=HYPERLINK(...)" stays
 * text. Numbers are passed as numbers and never touched, so -895 stays a number.
 */
export function csvCell(value: string | number): string {
  if (typeof value === 'number') return String(value);
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function walletCsv(cards: readonly CardSummary[]): string {
  const rows: (string | number)[][] = [[...CSV_COLUMNS]];
  for (const c of cards) {
    const card = [c.card.name, c.card.issuer, c.ownership === 'have' ? 'Have' : 'Considering'];
    const fee = dollars(-c.feeCents);
    rows.push([...card, 'Annual fee', 'Yearly', fee, fee, '']);
    for (const p of c.perks) {
      rows.push([
        ...card,
        p.perk.name,
        p.perk.cadenceLabel,
        dollars(p.nominalCents),
        dollars(p.realizedCents),
        STATUS_LABEL[p.status],
      ]);
    }
  }
  // A byte-order mark so Excel reads it as UTF-8 (¢, –, ’); CRLF line endings per RFC 4180.
  return `\uFEFF${rows.map((r) => r.map(csvCell).join(',')).join('\r\n')}\r\n`;
}

export function csvFileName(isoDate: string): string {
  return `effectiveaf-${isoDate}.csv`;
}
