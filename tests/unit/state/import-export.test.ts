// SPDX-License-Identifier: GPL-3.0-or-later
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createEmptyState } from '../../../src/state/migrations';
import {
  backupFileName,
  exportState,
  MAX_IMPORT_CHARS,
  parseImport,
} from '../../../src/state/import-export';
import type { UserState } from '../../../src/state/schema';

const fixture = (path: string) => readFileSync(join(__dirname, '../../fixtures', path), 'utf8');

const sample: UserState = {
  ...createEmptyState('2026-11-08T12:00:00.000Z'),
  wallet: ['amex-gold', 'capital-one-venture-x'],
  cards: {
    'amex-gold': {
      feeOverrideCents: 25000,
      perks: { 'amex-gold.dining': { mode: 'dollars', cents: 9000, enabled: true } },
    },
  },
};

describe('export / import', () => {
  it('round-trips exactly', () => {
    const result = parseImport(exportState(sample));
    expect(result).toEqual({ ok: true, state: sample, cardCount: 2, valuationCount: 1 });
  });

  it('marks the file as an effectiveAF backup', () => {
    expect(JSON.parse(exportState(sample))).toMatchObject({ app: 'effectiveAF' });
  });

  it('names backup files by date', () => {
    expect(backupFileName('2026-11-08')).toBe('effectiveaf-backup-2026-11-08.json');
  });

  it('accepts a full v1 backup', () => {
    const r = parseImport(fixture('state-v1/full.json'));
    expect(r.ok && r.cardCount).toBe(3);
    expect(r.ok && r.valuationCount).toBe(5);
  });
});

describe('import rejects', () => {
  it.each([
    ['empty text', '', 'invalid-json'],
    ['truncated JSON', exportState(sample).slice(0, 50), 'invalid-json'],
    ['a JSON array', '[]', 'not-an-object'],
    ['a newer version', '{"schemaVersion": 99}', 'newer-version'],
    ['HTML in a number field', fixture('bad-imports/html-in-fee.json'), 'invalid-shape'],
    ['a __proto__ key', fixture('bad-imports/proto-pollution.json'), 'invalid-shape'],
    [
      'the Gemini sample format',
      fixture('bad-imports/gemini-sample-format.json'),
      'unknown-version',
    ],
  ])('%s', (_name, text, code) => {
    const r = parseImport(text);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe(code);
      expect(r.message.length).toBeGreaterThan(10);
    }
  });

  it.each<[string, (s: UserState) => unknown]>([
    [
      'negative cents',
      (s) => ({
        ...s,
        cards: { x: { perks: { 'x.y': { mode: 'dollars', cents: -1, enabled: true } } } },
      }),
    ],
    [
      'percent over 100',
      (s) => ({
        ...s,
        cards: { x: { perks: { 'x.y': { mode: 'percent', percent: 101, enabled: true } } } },
      }),
    ],
    ['fractional cents', (s) => ({ ...s, cards: { x: { feeOverrideCents: 1.5, perks: {} } } })],
    ['an absurd fee', (s) => ({ ...s, cards: { x: { feeOverrideCents: 1e12, perks: {} } } })],
    [
      'an unknown mode',
      (s) => ({ ...s, cards: { x: { perks: { 'x.y': { mode: 'magic', enabled: true } } } } }),
    ],
    ['uppercase IDs', (s) => ({ ...s, wallet: ['AMEX-GOLD'] })],
    ['a 51-card wallet', (s) => ({ ...s, wallet: Array.from({ length: 51 }, (_, i) => `c${i}`) })],
  ])('%s', (_name, mutate) => {
    const r = parseImport(JSON.stringify(mutate(sample)));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('invalid-shape');
  });

  it('anything over the size limit, before parsing', () => {
    const r = parseImport(' '.repeat(MAX_IMPORT_CHARS + 1));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('too-large');
  });

  it('never pollutes Object.prototype', () => {
    parseImport(fixture('bad-imports/proto-pollution.json'));
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});
