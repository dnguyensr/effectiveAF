// SPDX-License-Identifier: GPL-3.0-or-later

/** The local calendar date as ISO yyyy-mm-dd (not UTC, so "today" matches the user's clock). */
export function localIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const longDate = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

/** "2026-11-08" -> "Nov 8, 2026". */
export function formatIsoDate(iso: string): string {
  return longDate.format(new Date(`${iso}T00:00:00Z`));
}
