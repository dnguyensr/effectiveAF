// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';
// @ts-expect-error -- plain .mjs script without type declarations
import { isAllowed } from '../../../scripts/licenses.mjs';

describe('isAllowed (SPDX expression check)', () => {
  it.each([
    ['MIT', true],
    ['Apache-2.0', true],
    ['MPL-2.0', true],
    ['(MIT OR Apache-2.0)', true],
    ['MIT OR GPL-2.0-only', true],
    ['MIT AND ISC', true],
    ['MIT AND GPL-2.0-only', false],
    ['GPL-2.0-only', false],
    ['SSPL-1.0', false],
    ['UNLICENSED', false],
    ['', false],
    [undefined, false],
    ['(MIT OR (Apache-2.0 AND ISC))', false],
  ])('%s -> %s', (expr, expected) => {
    expect(isAllowed(expr)).toBe(expected);
  });
});
