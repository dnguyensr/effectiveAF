// SPDX-License-Identifier: GPL-3.0-or-later
import { cleanup, fireEvent, render, screen, within } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

const verdict = (cardId: string) => screen.getByTestId(`verdict-${cardId}`).textContent;
const click = (name: string | RegExp, root: HTMLElement = document.body) =>
  fireEvent.click(within(root).getByRole('button', { name }));
const type = (label: string | RegExp, value: string) =>
  fireEvent.input(screen.getByLabelText(label), { target: { value } });

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('presets', () => {
  it('quick-sets one card', () => {
    renderApp();
    click(/Add American Express Platinum Card/);
    const bar = screen.getByRole('group', { name: 'Quick-set Platinum Card credits' });
    click('Face value', bar);
    expect(verdict('amex-platinum')).toBe('Pays for itself (+$2,129.40)');
    click('Only what I already spend on', bar);
    expect(verdict('amex-platinum')).toBe('Costs $224.30/yr');
    expect(
      (screen.getByRole('checkbox', { name: 'Use lululemon credit' }) as HTMLInputElement).checked,
    ).toBe(false);
    click('Nothing', bar);
    expect(verdict('amex-platinum')).toBe('Costs $895/yr');
    click('Starting estimates', bar);
    expect(verdict('amex-platinum')).toBe('Pays for itself (+$95.55)');
  });

  it('sets every card at once after confirming', () => {
    renderApp();
    click(/Add American Express Gold Card/);
    click(/Add Capital One Venture X/);
    fireEvent.change(screen.getByLabelText('Set every card to'), { target: { value: 'face' } });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
    click('Apply');
    expect(verdict('amex-gold')).toBe('Costs $110/yr');
    confirmSpy.mockReturnValueOnce(true);
    click('Apply');
    expect(verdict('amex-gold')).toBe('Pays for itself (+$99)');
    expect(verdict('capital-one-venture-x')).toBe('Pays for itself (+$35)');
  });

  it('only offers "set every card" with two or more cards', () => {
    renderApp();
    click(/Add American Express Gold Card/);
    expect(screen.queryByLabelText('Set every card to')).toBeNull();
  });
});

describe('custom perks', () => {
  it('adds a benefit to a catalog card and counts it', () => {
    renderApp();
    click(/Add Capital One Venture X/);
    click('+ Add your own perk or benefit');
    type('Name', 'Lounge access');
    type('Worth to you', '200');
    fireEvent.change(screen.getByLabelText('How often'), { target: { value: 'annual' } });
    click('Add');
    expect(screen.getByRole('heading', { name: 'Lounge access' })).toBeTruthy();
    expect(screen.getByText('Yours')).toBeTruthy();
    expect(verdict('capital-one-venture-x')).toBe('Pays for itself (+$190)');

    click('Delete Lounge access');
    expect(screen.queryByRole('heading', { name: 'Lounge access' })).toBeNull();
    expect(verdict('capital-one-venture-x')).toBe('Costs $10/yr');
  });

  it('validates the form and can be cancelled', () => {
    renderApp();
    click(/Add Capital One Venture X/);
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
    const store = renderApp();
    click(/Add Capital One Venture X/);
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
  it('creates a card, adds perks to it, and shows it in the summary', () => {
    renderApp();
    click("+ Create a card that isn't listed");
    type('Issuer (optional)', 'Citi');
    type('Card name', 'Strata Premier');
    type('Annual fee', '95');
    click('Create card');

    const panel = screen.getByRole('region', { name: 'Strata Premier' });
    expect(within(panel).getByText('Citi')).toBeTruthy();
    expect(within(panel).getByText(/No perks yet/)).toBeTruthy();
    expect(within(panel).getByText('A card you created.')).toBeTruthy();
    expect(within(panel).queryByRole('group', { name: /Quick-set/ })).toBeNull();
    expect(verdict('custom-t1')).toBe('Costs $95/yr');

    click('+ Add your own perk or benefit', panel);
    type('Name', 'Hotel benefit');
    type('Worth to you', '100');
    click('Add', panel);
    expect(verdict('custom-t1')).toBe('Pays for itself (+$5)');

    fireEvent.input(within(panel).getByRole('textbox', { name: 'Strata Premier annual fee' }), {
      target: { value: '' },
    });
    expect(verdict('custom-t1')).toBe('Pays for itself (+$100)');
    expect(within(panel).queryByText('Custom')).toBeNull();
  });

  it('validates the card form', () => {
    renderApp();
    click("+ Create a card that isn't listed");
    click('Create card');
    expect(screen.getByRole('alert').textContent).toBe('Give the card a name.');
    type('Card name', 'X');
    type('Annual fee', 'lots');
    click('Create card');
    expect(screen.getByRole('alert').textContent).toContain('annual fee');
    click('Cancel');
    expect(screen.queryByLabelText('Card name')).toBeNull();
  });

  it('allows a blank fee and issuer', () => {
    renderApp();
    click("+ Create a card that isn't listed");
    type('Card name', 'Store card');
    click('Create card');
    expect(verdict('custom-t1')).toBe('Pays for itself (+$0)');
  });

  it('reports when the custom card limit is reached', () => {
    const store = renderApp();
    for (let i = 0; i < 20; i++)
      store.addCustomCard({ issuer: '', name: `c${i}`, annualFeeCents: 0 });
    click("+ Create a card that isn't listed");
    type('Card name', 'One more');
    click('Create card');
    expect(screen.getByRole('alert').textContent).toContain('maximum');
  });

  it('a removed custom card can be re-added or deleted permanently', () => {
    const store = renderApp();
    click("+ Create a card that isn't listed");
    type('Card name', 'Store card');
    click('Create card');
    click('Remove card');
    expect(screen.getByRole('button', { name: /Add Store card \$0 fee/ })).toBeTruthy();

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
    click('Delete Store card permanently');
    expect(store.state.value.customCards).toHaveLength(1);
    confirmSpy.mockReturnValueOnce(true);
    click('Delete Store card permanently');
    expect(store.state.value.customCards).toHaveLength(0);
    expect(screen.queryByRole('button', { name: /Store card/ })).toBeNull();
  });
});
