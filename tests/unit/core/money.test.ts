// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { formatUsd } from '../../../src/core/money';

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
