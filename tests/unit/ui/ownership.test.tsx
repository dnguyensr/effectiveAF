// SPDX-License-Identifier: GPL-3.0-or-later
import { cleanup, fireEvent, render, screen, within } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createStore } from '../../../src/state/store';
import { App } from '../../../src/ui/App';
import { FIXED_NOW, memoryStorage } from '../helpers';

const click = (name: string | RegExp, root: HTMLElement = document.body) =>
  fireEvent.click(within(root).getByRole('button', { name }));

beforeEach(() => {
  history.replaceState(null, '', '/');
});

afterEach(() => {
  cleanup();
});

describe('have vs. considering', () => {
  it('adds a card as considering from the picker and keeps it out of the totals', () => {
    const store = createStore({ storage: memoryStorage(), now: () => FIXED_NOW, saveDelayMs: 0 });
    render(<App store={store} />);
    click(/^Value the cards I have/);
    const picker = screen.getByRole('dialog', { name: 'Add a card' });
    click(/^Add American Express Gold Card/, picker);
    click('Considering: add Capital One Venture X', picker);
    expect(within(picker).getByText('In wallet')).toBeTruthy();
    expect(within(picker).getByText('Considering', { selector: '.tag' })).toBeTruthy();
    click('Close', picker);

    // Venture X (added last) is selected.
    expect(screen.getByTestId('verdict-capital-one-venture-x').textContent).toBe(
      'Would cost $395/yr',
    );
    expect(screen.getByRole('tab', { name: /Venture X/ }).textContent).toContain('Considering');
    expect(screen.getByText(/Not counted in your wallet totals/)).toBeTruthy();
    expect(screen.getByTestId('summary-fees').textContent).toBe('$325');
    expect(screen.getByTestId('summary-considering').textContent).toBe(
      'Not counted above: considering 1 card, which would cost $395/yr after credits.',
    );

    const status = screen.getByRole('group', { name: 'Do you have the Venture X?' });
    expect(
      within(status).getByRole('button', { name: 'Considering it' }).getAttribute('aria-pressed'),
    ).toBe('true');
    click('I have this card', status);
    expect(screen.getByTestId('verdict-capital-one-venture-x').textContent).toBe('Costs $395/yr');
    expect(screen.getByTestId('summary-fees').textContent).toBe('$720');
    expect(screen.queryByTestId('summary-considering')).toBeNull();
    click('Considering it', status);
    expect(screen.getByTestId('summary-fees').textContent).toBe('$325');
  });

  it('describes a wallet of only considered cards, which would pay for themselves', () => {
    const store = createStore({ storage: undefined, now: () => FIXED_NOW });
    store.addCard('amex-gold', undefined, 'considering');
    store.addCard('capital-one-venture-x', undefined, 'considering');
    store.applyPreset('amex-gold', 'face');
    store.applyPreset('capital-one-venture-x', 'face');
    history.replaceState(null, '', '/#wallet');
    render(<App store={store} />);
    expect(screen.getByTestId('summary-considering').textContent).toBe(
      'Considering 2 cards, which would pay for themselves (+$134/yr).',
    );
  });

  it('a single considered card that would pay for itself', () => {
    const store = createStore({ storage: undefined, now: () => FIXED_NOW });
    store.addCard('amex-gold', undefined, 'considering');
    store.applyPreset('amex-gold', 'face');
    history.replaceState(null, '', '/#wallet');
    render(<App store={store} />);
    expect(screen.getByTestId('summary-considering').textContent).toBe(
      'Considering 1 card, which would pay for itself (+$99/yr).',
    );
    expect(screen.getByTestId('verdict-amex-gold').textContent).toBe('Would pay for itself (+$99)');
  });

  it('Compare shows whether a compared card is held or considered', () => {
    const store = createStore({ storage: undefined, now: () => FIXED_NOW });
    store.addCard('amex-gold');
    store.addCard('capital-one-venture-x', undefined, 'considering');
    store.toggleCompare('amex-gold');
    store.toggleCompare('capital-one-venture-x');
    history.replaceState(null, '', '/#compare');
    render(<App store={store} />);
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent);
    expect(headers[1]).toContain('You have it');
    expect(headers[2]).toContain('Considering');
    expect(screen.getByTestId('compare-verdict-amex-gold').textContent).toBe('Costs $325/yr');
    expect(screen.getByTestId('compare-verdict-capital-one-venture-x').textContent).toBe(
      'Would cost $395/yr',
    );
  });

  it('the value editor opened from Compare has no status toggle for cards not in the wallet', () => {
    const store = createStore({ storage: undefined, now: () => FIXED_NOW });
    store.toggleCompare('amex-gold');
    history.replaceState(null, '', '/#compare');
    render(<App store={store} />);
    click('Set my values for Gold Card');
    const editor = screen.getByRole('dialog', { name: 'Your values: Gold Card' });
    expect(within(editor).queryByRole('group', { name: /Do you have/ })).toBeNull();
  });
});
