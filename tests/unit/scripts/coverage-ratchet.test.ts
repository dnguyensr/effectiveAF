// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';
// @ts-expect-error -- plain .mjs script without type declarations
import { compare, readCurrent } from '../../../scripts/coverage-ratchet.mjs';

const full = { lines: 100, branches: 100, functions: 100, statements: 100 };

describe('coverage ratchet', () => {
  it('reads vitest json-summary into repo-relative paths, skipping the total', () => {
    const pct = (n: number) => ({ pct: n });
    const current = readCurrent(
      {
        total: { lines: pct(1), branches: pct(1), functions: pct(1), statements: pct(1) },
        '/repo/src/a.ts': {
          lines: pct(90),
          branches: pct(80),
          functions: pct(70),
          statements: pct(60),
        },
      },
      '/repo',
    );
    expect(current).toEqual({
      'src/a.ts': { lines: 90, branches: 80, functions: 70, statements: 60 },
    });
  });

  it('holds when coverage stays within tolerance or rises', () => {
    const base = { 'src/a.ts': { ...full, branches: 90 } };
    expect(compare({ 'src/a.ts': { ...full, branches: 89.6 } }, base)).toEqual([]);
    expect(compare({ 'src/a.ts': full }, base)).toEqual([]);
  });

  it('fails when a known file drops', () => {
    const problems = compare({ 'src/a.ts': { ...full, lines: 95 } }, { 'src/a.ts': full });
    expect(problems).toEqual(['src/a.ts: lines fell from 100% to 95%']);
  });

  it('holds new files to the floor', () => {
    expect(compare({ 'src/new.ts': full }, {})).toEqual([]);
    expect(compare({ 'src/new.ts': { ...full, branches: 70 } }, {})).toEqual([
      'src/new.ts (new): branches is 70%, new files need 85%',
    ]);
  });
});
