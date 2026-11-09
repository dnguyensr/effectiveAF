// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { formatIsoDate, localIsoDate } from '../../../src/core/dates';

describe('localIsoDate', () => {
  it('uses the local calendar date with zero padding', () => {
    expect(localIsoDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(localIsoDate(new Date(2026, 10, 8, 0, 0))).toBe('2026-11-08');
  });
});

describe('formatIsoDate', () => {
  it('formats without shifting the day in any time zone', () => {
    expect(formatIsoDate('2026-12-31')).toBe('Dec 31, 2026');
    expect(formatIsoDate('2027-01-01')).toBe('Jan 1, 2027');
  });
});
