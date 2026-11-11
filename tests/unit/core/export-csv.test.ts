// SPDX-License-Identifier: GPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { csvCell, csvFileName, walletCsv } from '../../../src/core/export-csv';
import { createStore } from '../../../src/state/store';
import { FIXED_NOW, memoryStorage } from '../helpers';

describe('csvCell', () => {
  it('leaves plain text and numbers alone', () => {
    expect(csvCell('Gold Card')).toBe('Gold Card');
    expect(csvCell(-325)).toBe('-325');
    expect(csvCell(0)).toBe('0');
  });

  it('quotes commas, quotes and line breaks (RFC 4180)', () => {
    expect(csvCell('a, b')).toBe('"a, b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('two\nlines')).toBe('"two\nlines"');
  });

  it('defuses text that a spreadsheet would run as a formula', () => {
    for (const lead of ['=', '+', '-', '@', '\t', '\r']) {
      expect(csvCell(`${lead}1+1`).replace(/^"/, '')).toMatch(/^'/);
    }
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
  });
});

describe('walletCsv', () => {
  function csvLines() {
    let n = 0;
    const store = createStore({
      storage: memoryStorage(),
      now: () => FIXED_NOW,
      saveDelayMs: 0,
      randomId: () => `t${++n}`,
    });
    store.addCard('amex-gold');
    store.setPerkPercent('amex-gold', 'amex-gold.dining', 50);
    store.skipPerk('amex-gold', 'amex-gold.uber-cash');
    store.addCustomPerk('amex-gold', {
      name: '=SUM(A1), "x"',
      cadence: 'annual',
      amountPerPeriodCents: 10000,
    });
    store.addCard('capital-one-venture-x', undefined, 'considering');
    const csv = walletCsv(store.summary.value.cards);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv.endsWith('\r\n')).toBe(true);
    expect(csv).not.toMatch(/[^\r]\n/);
    return csv.slice(1).trimEnd().split('\r\n');
  }

  it('has a header, a negative fee row per card and a row per perk (hand-computed)', () => {
    const lines = csvLines();
    expect(lines[0]).toBe(
      'Card,Issuer,Have or considering,Item,Cadence,Face value per year,Your value per year,Status',
    );
    expect(lines[1]).toBe('Gold Card,American Express,Have,Annual fee,Yearly,-325,-325,');
    // $10/month = $120 a year; at 50% that's $60.
    expect(lines).toContain(
      'Gold Card,American Express,Have,Dining credit,$10 / month,120,60,Using',
    );
    expect(lines).toContain(
      "Gold Card,American Express,Have,Uber Cash,$10 / month,120,0,Won't use",
    );
    expect(lines).toContain(
      'Gold Card,American Express,Have,Resy dining credit,$50 / half-year,100,0,Not set',
    );
    // A custom perk is counted at 100% and its formula-like name is defused and quoted.
    const custom = lines.find((l) => l.includes('SUM(A1)'));
    expect(custom).toMatch(
      /^Gold Card,American Express,Have,"'=SUM\(A1\), ""x""",.*,100,100,Using$/,
    );
    expect(lines).toContain('Venture X,Capital One,Considering,Annual fee,Yearly,-395,-395,');
  });

  it('is just the header with no cards, and names the file by date', () => {
    expect(walletCsv([]).trimEnd()).toBe(
      '\uFEFFCard,Issuer,Have or considering,Item,Cadence,Face value per year,Your value per year,Status',
    );
    expect(csvFileName('2026-11-09')).toBe('effectiveaf-2026-11-09.csv');
  });
});
