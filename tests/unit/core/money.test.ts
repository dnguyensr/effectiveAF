// SPDX-License-Identifier: GPL-3.0-or-later
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { centsToInputValue, clamp, formatUsd, parseDollarsToCents } from '../../../src/core/money';

describe('formatUsd', () => {
  it.each([
    [0, '$0'],
    [-0, '$0'],
    [100, '$1'],
    [89500, '$895'],
    [1295, '$12.95'],
    [5, '$0.05'],
    [-27500, '-$275'],
    [-1, '-$0.01'],
    [123456700, '$1,234,567'],
  ])('formats %d cents as %s', (cents, expected) => {
    expect(formatUsd(cents)).toBe(expected);
  });

  it.each([1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    'rejects non-integer or unsafe input %d',
    (bad) => {
      expect(() => formatUsd(bad)).toThrow(RangeError);
    },
  );
});

describe('parseDollarsToCents', () => {
  it.each([
    ['150', 15000],
    ['$150', 15000],
    [' 12.95 ', 1295],
    ['1,250.5', 125050],
    ['0', 0],
    ['.5', 50],
    ['12.', 1200],
    ['0.004', 0],
    ['0.005', 1],
  ])('parses %j as %d cents', (text, cents) => {
    expect(parseDollarsToCents(text)).toBe(cents);
  });

  it.each(['', ' ', '-5', 'abc', '1e3', '12.3.4', '$', '١٢', 'Infinity', '9'.repeat(30)])(
    'rejects %j',
    (text) => {
      expect(parseDollarsToCents(text)).toBeNull();
    },
  );

  it('round-trips with centsToInputValue for any whole-cent amount', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10_000_000 }), (cents) => {
        expect(parseDollarsToCents(centsToInputValue(cents))).toBe(cents);
      }),
    );
  });
});

describe('centsToInputValue', () => {
  it.each([
    [15000, '150'],
    [1295, '12.95'],
    [1250, '12.50'],
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
