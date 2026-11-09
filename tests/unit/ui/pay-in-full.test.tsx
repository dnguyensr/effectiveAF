// SPDX-License-Identifier: GPL-3.0-or-later
/** "Will you pay this card in full every month?" — state, counts and the asterisk. */
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parseImport } from '../../../src/state/import-export';
import { createEmptyState } from '../../../src/state/migrations';
import { createStore } from '../../../src/state/store';
import { App } from '../../../src/ui/App';
import { FIXED_NOW } from '../helpers';

const setup = (...cards: string[]) => {
  const store = createStore({ storage: undefined, now: () => FIXED_NOW });
  for (const id of cards) store.addCard(id);
  return store;
};

const click = (name: string | RegExp, root: HTMLElement = document.body) =>
  fireEvent.click(within(root).getByRole('button', { name }));

beforeEach(() => {
  history.replaceState(null, '', '/#wallet');
});

afterEach(() => {
  cleanup();
});

describe('store: pays in full', () => {
  it('sets, clears and applies the answer to every wallet card', () => {
    const store = setup('amex-gold', 'capital-one-venture-x');
    expect(store.summary.value.cards[0]?.paysInFull).toBeUndefined();
    store.setPaysInFull('amex-gold', false);
    expect(store.state.value.cards['amex-gold']?.paysInFull).toBe(false);
    store.applyPaysInFullToWallet(true);
    expect(store.summary.value.cards.map((c) => c.paysInFull)).toEqual([true, true]);
    store.setPaysInFull('amex-gold', null);
    expect(store.state.value.cards['amex-gold']?.paysInFull).toBeUndefined();
    store.setPaysInFull('nope', true);
    expect(store.state.value.cards.nope).toBeUndefined();
  });

  it('counts the unanswered question as one more thing not set yet', () => {
    const store = setup('capital-one-venture-x');
    store.applyPreset('capital-one-venture-x', 'face');
    expect(store.summary.value.cards[0]).toMatchObject({ unsetCount: 1, itemCount: 4 });
    store.setPaysInFull('capital-one-venture-x', false);
    expect(store.summary.value.cards[0]?.unsetCount).toBe(0);
  });

  it('keeps the answer when the card is cleared, and validates saved data', () => {
    const store = setup('amex-gold');
    store.setPaysInFull('amex-gold', true);
    store.applyPreset('amex-gold', 'face');
    store.resetCard('amex-gold');
    expect(store.state.value.cards['amex-gold']).toEqual({ perks: {}, paysInFull: true });
    const withAnswer = (v: unknown) =>
      parseImport(
        JSON.stringify({
          ...createEmptyState('x'),
          cards: { 'amex-gold': { perks: {}, paysInFull: v } },
        }),
      ).ok;
    expect(withAnswer(false)).toBe(true);
    expect(withAnswer('yes')).toBe(false);
  });
});

describe('pay-in-full question and asterisk', () => {
  it('asks at the bottom of the card; the asterisk explains and disappears once answered yes', () => {
    render(<App store={setup('amex-gold', 'capital-one-venture-x')} />);
    expect(screen.getByText(/5 of 5 not set yet/)).toBeTruthy();
    // The asterisk on the card's result: tap opens, tap again or Escape closes.
    const header = screen.getByTestId('card-header-amex-gold');
    const star = within(header).getByRole('button', { name: 'Why the asterisk?' });
    expect(star.getAttribute('title')).toContain('pay the statement balance in full');
    click('Why the asterisk?', header);
    expect(star.getAttribute('aria-expanded')).toBe('true');
    expect(within(header).getByRole('note').textContent).toContain(
      'You haven’t confirmed that for this card yet.',
    );
    fireEvent.keyDown(star, { key: 'Escape' });
    expect(within(header).queryByRole('note')).toBeNull();

    // Tile and wallet summary carry the asterisk too.
    expect(screen.getByRole('tab', { name: /Gold Card/ }).textContent).toContain(
      '(assumes paying in full)',
    );
    expect(
      within(screen.getByRole('region', { name: 'Wallet summary' })).getByRole('button', {
        name: 'Why the asterisk?',
      }),
    ).toBeTruthy();

    const question = screen.getByRole('group', {
      name: "Will you pay this card's statement balance in full every month?",
    });
    click('Not always', question);
    expect(screen.getByText(/4 of 5 not set yet/)).toBeTruthy();
    expect(question.textContent).toContain('Paying the balance in full matters more');
    click('Why the asterisk?', header);
    expect(within(header).getByRole('note').textContent).toContain(
      'You said you won’t always pay this card in full.',
    );

    click('Yes', question);
    expect(within(header).queryByRole('button', { name: 'Why the asterisk?' })).toBeNull();
    expect(screen.getByRole('tab', { name: /Gold Card/ }).textContent).not.toContain('assumes');

    // One answer for every card.
    click('Use this answer for all my cards', question);
    expect(
      within(screen.getByRole('region', { name: 'Wallet summary' })).queryByRole('button', {
        name: 'Why the asterisk?',
      }),
    ).toBeNull();
  });

  it('the wallet summary note mentions "not always" when any card carries a balance', () => {
    const store = setup('amex-gold', 'capital-one-venture-x');
    store.setPaysInFull('amex-gold', false);
    render(<App store={store} />);
    const summary = screen.getByRole('region', { name: 'Wallet summary' });
    click('Why the asterisk?', summary);
    expect(within(summary).getByRole('note').textContent).toContain(
      'You said you won’t always pay some of your cards in full.',
    );
  });

  it('Compare marks unconfirmed results too', () => {
    const store = setup();
    store.toggleCompare('amex-gold');
    store.toggleCompare('capital-one-venture-x');
    act(() => {
      store.setPaysInFull('amex-gold', true);
    });
    history.replaceState(null, '', '/#compare');
    render(<App store={store} />);
    const row = screen
      .getByRole('rowheader', { name: 'Effective cost' })
      .closest('tr') as HTMLElement;
    expect(within(row).getAllByRole('button', { name: 'Why the asterisk?' })).toHaveLength(1);
  });
});
