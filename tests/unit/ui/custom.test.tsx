// SPDX-License-Identifier: GPL-3.0-or-later
import { cleanup, fireEvent, render, screen, within } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore } from '../../../src/state/store';
import { App } from '../../../src/ui/App';
import { FIXED_NOW, memoryStorage } from '../helpers';

function renderApp() {
  let n = 0;
  const store = createStore({
    storage: memoryStorage(),
    now: () => FIXED_NOW,
    saveDelayMs: 0,
    randomId: () => `t${++n}`,
  });
  render(<App store={store} />);
  return store;
}

const click = (name: string | RegExp, root: HTMLElement = document.body) =>
  fireEvent.click(within(root).getByRole('button', { name }));
const type = (label: string | RegExp, value: string, root: HTMLElement = document.body) =>
  fireEvent.input(within(root).getByLabelText(label), { target: { value } });
const verdict = (cardId: string) => screen.getByTestId(`verdict-${cardId}`).textContent;

/** Opens the wallet picker on its "Your cards" tab. */
function openYours(mode: 'wallet' | 'compare' = 'wallet') {
  click(mode === 'wallet' ? /^Value the cards I have/ : /^Compare cards/);
  const picker = screen.getByRole('dialog', {
    name: mode === 'wallet' ? 'Add a card' : 'Choose cards to compare',
  });
  fireEvent.click(within(picker).getByRole('tab', { name: 'Your cards' }));
  return picker;
}

beforeEach(() => {
  history.replaceState(null, '', '/');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('custom perks', () => {
  function withVentureX() {
    const store = renderApp();
    click(/^Value the cards I have/);
    const picker = screen.getByRole('dialog', { name: 'Add a card' });
    click(/Add Capital One Venture X$/, picker);
    click('Close', picker);
    return store;
  }

  it('adds a benefit to a catalog card; it starts fully used and counts', () => {
    withVentureX();
    click('+ Add your own perk or benefit');
    type('Name', 'Lounge access');
    type('Worth to you', '200');
    fireEvent.change(screen.getByLabelText('How often'), { target: { value: 'annual' } });
    click('Add');
    expect(screen.getByRole('heading', { name: 'Lounge access' })).toBeTruthy();
    expect(screen.getByText('Yours')).toBeTruthy();
    expect(verdict('capital-one-venture-x')).toBe('Costs $195/yr');

    click('Delete Lounge access');
    expect(screen.queryByRole('heading', { name: 'Lounge access' })).toBeNull();
    expect(verdict('capital-one-venture-x')).toBe('Costs $395/yr');
  });

  it('validates the form and can be cancelled', () => {
    withVentureX();
    click('+ Add your own perk or benefit');
    click('Add');
    expect(screen.getByRole('alert').textContent).toBe('Give it a name.');
    type('Name', 'X');
    type('Worth to you', 'abc');
    click('Add');
    expect(screen.getByRole('alert').textContent).toContain('dollar amount');
    type('Worth to you', '0');
    click('Add');
    expect(screen.getByRole('alert').textContent).toContain('above $0');
    click('Cancel');
    expect(screen.queryByLabelText('Name')).toBeNull();
  });

  it('reports when the per-card limit is reached', () => {
    const store = withVentureX();
    for (let i = 0; i < 30; i++) {
      store.addCustomPerk('capital-one-venture-x', {
        name: `p${i}`,
        cadence: 'annual',
        amountPerPeriodCents: 100,
      });
    }
    click('+ Add your own perk or benefit');
    type('Name', 'One more');
    type('Worth to you', '5');
    click('Add');
    expect(screen.getByRole('alert').textContent).toContain('maximum');
  });
});

describe('custom cards', () => {
  it('creates a card from the picker, adds it to the wallet and values its perks', () => {
    renderApp();
    const picker = openYours();
    expect(within(picker).getByText("You haven't created any cards yet.")).toBeTruthy();
    click("+ Create a card that isn't listed", picker);
    type('Issuer (optional)', 'Citi', picker);
    type('Card name', 'Strata Premier', picker);
    type('Annual fee', '95', picker);
    click('Create card', picker);
    expect(within(picker).getByText('In wallet')).toBeTruthy();
    click('Close', picker);

    const panel = screen.getByRole('region', { name: 'Strata Premier' });
    expect(within(panel).getByText('Citi')).toBeTruthy();
    expect(within(panel).getByText(/No perks yet/)).toBeTruthy();
    expect(within(panel).getByText('A card you created.')).toBeTruthy();
    expect(within(panel).queryByRole('group', { name: /Quick-set/ })).toBeNull();
    expect(verdict('custom-t1')).toBe('Costs $95/yr');

    click('+ Add your own perk or benefit', panel);
    type('Name', 'Hotel benefit', panel);
    type('Worth to you', '100', panel);
    click('Add', panel);
    expect(verdict('custom-t1')).toBe('Pays for itself (+$5)');

    fireEvent.input(within(panel).getByRole('textbox', { name: 'Strata Premier annual fee' }), {
      target: { value: '' },
    });
    expect(verdict('custom-t1')).toBe('Pays for itself (+$100)');
    expect(within(panel).queryByText('Custom')).toBeNull();
  });

  it('a card created from the comparison picker goes into the comparison', () => {
    const store = renderApp();
    const picker = openYours('compare');
    click("+ Create a card that isn't listed", picker);
    type('Card name', 'Store card', picker);
    click('Create card', picker);
    expect(store.state.value.compare).toEqual(['custom-t1']);
    expect(store.state.value.wallet).toEqual([]);
    expect(
      (within(picker).getByRole('checkbox', { name: 'Compare Store card' }) as HTMLInputElement)
        .checked,
    ).toBe(true);
  });

  it('validates the card form', () => {
    renderApp();
    const picker = openYours();
    click("+ Create a card that isn't listed", picker);
    click('Create card', picker);
    expect(within(picker).getByRole('alert').textContent).toBe('Give the card a name.');
    type('Card name', 'X', picker);
    type('Annual fee', 'lots', picker);
    click('Create card', picker);
    expect(within(picker).getByRole('alert').textContent).toContain('annual fee');
    click('Cancel', picker);
    expect(within(picker).queryByLabelText('Card name')).toBeNull();
  });

  it('reports when the custom card limit is reached', () => {
    const store = renderApp();
    for (let i = 0; i < 20; i++)
      store.addCustomCard({ issuer: '', name: `c${i}`, annualFeeCents: 0 });
    click(/^Value the cards I have/);
    const picker = screen.getByRole('dialog', { name: 'Add a card' });
    fireEvent.click(within(picker).getByRole('tab', { name: 'Your cards' }));
    click("+ Create a card that isn't listed", picker);
    type('Card name', 'One more', picker);
    click('Create card', picker);
    expect(within(picker).getByRole('alert').textContent).toContain('maximum');
  });
});
