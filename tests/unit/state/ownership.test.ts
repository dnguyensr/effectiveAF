// SPDX-License-Identifier: GPL-3.0-or-later
/** "I have it" vs "Considering it": state, totals, reminders and the forum summary. */
import { describe, expect, it } from 'vitest';
import { CATALOG } from '../../../src/catalog';
import { walletMarkdown } from '../../../src/core/share';
import { summarizeWallet } from '../../../src/core/wallet-math';
import { parseImport } from '../../../src/state/import-export';
import { createEmptyState } from '../../../src/state/migrations';
import { createStore } from '../../../src/state/store';
import { FIXED_NOW } from '../helpers';

const setup = () => createStore({ storage: undefined, now: () => FIXED_NOW });

describe('wallet totals', () => {
  it('count only cards you have; considered cards are totaled separately', () => {
    const w = summarizeWallet(
      CATALOG,
      ['amex-gold', 'capital-one-venture-x', 'chase-sapphire-preferred'],
      {
        'capital-one-venture-x': { perks: {}, ownership: 'considering' },
        'chase-sapphire-preferred': { perks: {}, ownership: 'considering' },
      },
      '2026-11-08',
    );
    expect(w.cards.map((c) => [c.card.id, c.ownership])).toEqual([
      ['amex-gold', 'have'],
      ['capital-one-venture-x', 'considering'],
      ['chase-sapphire-preferred', 'considering'],
    ]);
    expect(w).toMatchObject({ feeCents: 32500, effectiveCents: 32500, verdict: 'costs' });
    expect(w.considering).toEqual({
      count: 2,
      feeCents: 39500 + 9500,
      realizedCents: 0,
      effectiveCents: 49000,
      verdict: 'costs',
    });
  });
});

describe('store: ownership', () => {
  it('adds a card as considering, switches it, and stores only the non-default', () => {
    const store = setup();
    store.addCard('capital-one-venture-x', undefined, 'considering');
    expect(store.state.value.cards['capital-one-venture-x']).toEqual({
      perks: {},
      ownership: 'considering',
    });
    expect(store.summary.value.considering.count).toBe(1);
    store.setOwnership('capital-one-venture-x', 'have');
    expect(store.state.value.cards['capital-one-venture-x']).toEqual({ perks: {} });
    expect(store.summary.value.feeCents).toBe(39500);
    store.setOwnership('nope', 'considering');
    expect(store.state.value.cards.nope).toBeUndefined();
  });

  it('keeps the status through remove/undo and clearing the card', () => {
    const store = setup();
    store.addCard('amex-gold', undefined, 'considering');
    store.applyPreset('amex-gold', 'face');
    store.resetCard('amex-gold');
    expect(store.state.value.cards['amex-gold']).toEqual({ perks: {}, ownership: 'considering' });
    const index = store.removeCard('amex-gold');
    store.addCard('amex-gold', index);
    expect(store.summary.value.cards[0]?.ownership).toBe('considering');
  });

  it('leaves considered cards out of "use it before it resets"', () => {
    const store = setup();
    store.addCard('amex-gold', undefined, 'considering');
    store.applyPreset('amex-gold', 'face');
    expect(store.upcoming.value).toEqual([]);
    store.setOwnership('amex-gold', 'have');
    expect(store.upcoming.value.length).toBeGreaterThan(0);
  });

  it('validates the status in saved data', () => {
    const withStatus = (ownership: unknown) =>
      parseImport(
        JSON.stringify({
          ...createEmptyState('x'),
          cards: { 'amex-gold': { perks: {}, ownership } },
        }),
      ).ok;
    expect(withStatus('considering')).toBe(true);
    expect(withStatus('have')).toBe(true);
    expect(withStatus('maybe')).toBe(false);
  });
});

describe('forum summary', () => {
  it('marks considered cards and totals only the cards you have', () => {
    const w = summarizeWallet(
      CATALOG,
      ['amex-gold', 'capital-one-venture-x'],
      { 'capital-one-venture-x': { perks: {}, ownership: 'considering' } },
      '2026-11-08',
    );
    const md = walletMarkdown(w, '2026-11-08');
    expect(md).toContain(
      '| Capital One Venture X _(considering)_ | $395 | $0 of $430 | Would cost $395/yr\\* |',
    );
    expect(md).toContain('| **Total, cards I have** | **$325** | **$0** | **Costs $325/yr**\\* |');
    expect(md).toContain('**Venture X (considering):** using no credits; 3 not valued yet.');
  });

  it('says a considered card would pay for itself', () => {
    const w = summarizeWallet(
      CATALOG,
      ['amex-gold'],
      {
        'amex-gold': {
          ownership: 'considering',
          perks: { 'amex-gold.dining': { mode: 'percent', percent: 100, enabled: true } },
          feeOverrideCents: 0,
        },
      },
      '2026-11-08',
    );
    expect(walletMarkdown(w, '2026-11-08')).toContain('Would pay for itself (+$120)');
  });
});
