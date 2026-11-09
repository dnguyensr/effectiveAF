// SPDX-License-Identifier: GPL-3.0-or-later
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  centsToInputValue,
  clamp,
  formatUsd,
  parseDollarsToCents,
  toWholeDollars,
} from '../../../src/core/money';

describe('toWholeDollars', () => {
  it.each([
    [15540, 15500],
    [1295, 1300],
    [1250, 1300], // half rounds away from zero
    [1249, 1200],
    [-1250, -1300],
    [-49, 0],
    [0, 0],
  ])('%d -> %d', (cents, expected) => {
    expect(toWholeDollars(cents)).toBe(expected);
    expect(Object.is(toWholeDollars(cents), -0)).toBe(false);
  });
});

describe('formatUsd', () => {
  it.each([
    [0, '$0'],
    [-0, '$0'],
    [100, '$1'],
    [89500, '$895'],
    [1295, '$13'],
    [5, '$0'],
    [-27500, '-$275'],
    [-49, '$0'],
    [123456700, '$1,234,567'],
    [302440, '$3,024'],
  ])('formats %d cents as %s', (cents, expected) => {
    expect(formatUsd(cents)).toBe(expected);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER * 2])(
    'rejects %d',
    (bad) => {
      expect(() => formatUsd(bad)).toThrow(RangeError);
    },
  );
});

describe('parseDollarsToCents (whole dollars)', () => {
  it.each([
    ['150', 15000],
    ['$150', 15000],
    [' 12.95 ', 1300],
    ['1,250.4', 125000],
    ['0', 0],
    ['.5', 100],
    ['12.', 1200],
  ])('parses %j as %d cents', (text, cents) => {
    expect(parseDollarsToCents(text)).toBe(cents);
  });

  it.each(['', ' ', '-5', 'abc', '1e3', '12.3.4', '$', '١٢', 'Infinity', '9'.repeat(30)])(
    'rejects %j',
    (text) => {
      expect(parseDollarsToCents(text)).toBeNull();
    },
  );

  it('round-trips with centsToInputValue for any whole-dollar amount', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100_000 }), (dollars) => {
        expect(parseDollarsToCents(centsToInputValue(dollars * 100))).toBe(dollars * 100);
      }),
    );
  });
});

describe('centsToInputValue', () => {
  it.each([
    [15000, '150'],
    [1295, '13'],
    [0, '0'],
  ])('%d -> %s', (cents, text) => {
    expect(centsToInputValue(cents)).toBe(text);
  });
});

describe('clamp', () => {
  it.each([
    [5, 0, 10, 5],
    [-1, 0, 10, 0],
    [11, 0, 10, 10],
  ])('clamp(%d, %d, %d) = %d', (v, lo, hi, expected) => {
    expect(clamp(v, lo, hi)).toBe(expected);
  });
});
