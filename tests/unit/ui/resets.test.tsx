// SPDX-License-Identifier: GPL-3.0-or-later
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parseImport } from '../../../src/state/import-export';
import { createEmptyState } from '../../../src/state/migrations';
import { createStore } from '../../../src/state/store';
import { App } from '../../../src/ui/App';
import { FIXED_NOW, memoryStorage } from '../helpers';

function setup() {
  const store = createStore({ storage: memoryStorage(), now: () => FIXED_NOW, saveDelayMs: 0 });
  return store;
}

beforeEach(() => {
  history.replaceState(null, '', '/#wallet');
});

afterEach(() => {
  cleanup();
});

describe('store: anniversary month', () => {
  it('sets, validates and clears the month', () => {
    const store = setup();
    store.setAnniversaryMonth('capital-one-venture-x', 12);
    expect(store.state.value.cards['capital-one-venture-x']?.anniversaryMonth).toBe(12);
    store.setAnniversaryMonth('capital-one-venture-x', 13);
    expect(store.state.value.cards['capital-one-venture-x']?.anniversaryMonth).toBeUndefined();
    store.setAnniversaryMonth('capital-one-venture-x', 3);
    store.setAnniversaryMonth('capital-one-venture-x', null);
    expect(store.state.value.cards['capital-one-venture-x']?.anniversaryMonth).toBeUndefined();
    store.setAnniversaryMonth('nope', 1);
    expect(store.state.value.cards.nope).toBeUndefined();
  });

  it('clearing a card keeps the anniversary month (a fact, not a valuation)', () => {
    const store = setup();
    store.addCard('capital-one-venture-x');
    store.setAnniversaryMonth('capital-one-venture-x', 12);
    store.applyPreset('capital-one-venture-x', 'face');
    store.resetCard('capital-one-venture-x');
    expect(store.state.value.cards['capital-one-venture-x']).toEqual({
      perks: {},
      anniversaryMonth: 12,
    });
    store.applyPreset('capital-one-venture-x', 'face');
    store.resetAll();
    expect(store.state.value.cards['capital-one-venture-x']).toEqual({
      perks: {},
      anniversaryMonth: 12,
    });
  });

  it('feeds the upcoming resets list', () => {
    const store = setup();
    store.addCard('capital-one-venture-x');
    store.applyPreset('capital-one-venture-x', 'face');
    expect(store.upcoming.value).toEqual([]);
    store.setAnniversaryMonth('capital-one-venture-x', 12);
    expect(store.upcoming.value.map((r) => r.perkName)).toEqual([
      'Anniversary bonus miles',
      'Capital One Travel credit',
    ]);
  });

  it('validates the month in saved data', () => {
    const base = createEmptyState('x');
    const withMonth = (m: unknown) =>
      parseImport(
        JSON.stringify({ ...base, cards: { 'amex-gold': { perks: {}, anniversaryMonth: m } } }),
      ).ok;
    expect(withMonth(6)).toBe(true);
    expect(withMonth(0)).toBe(false);
    expect(withMonth(13)).toBe(false);
    expect(withMonth(2.5)).toBe(false);
  });
});

describe('reset UI', () => {
  function renderWith(...cards: string[]) {
    const store = setup();
    for (const id of cards) store.addCard(id);
    render(<App store={store} />);
    return store;
  }

  it('shows when each credit resets, and asks for the anniversary month only when needed', () => {
    renderWith('amex-gold', 'capital-one-venture-x');
    // Venture X has cardmember-year credits.
    fireEvent.click(screen.getByRole('tab', { name: /Venture X/ }));
    const travel = screen
      .getByRole('heading', { name: 'Capital One Travel credit' })
      .closest('li') as HTMLElement;
    expect(within(travel).getByText('Resets on your account anniversary')).toBeTruthy();
    const ge = screen
      .getByRole('heading', { name: 'Global Entry / TSA PreCheck credit' })
      .closest('li') as HTMLElement;
    expect(within(ge).queryByText(/Resets/)).toBeNull();

    fireEvent.change(screen.getByLabelText('Account opened in'), { target: { value: '12' } });
    expect(within(travel).getByText('Resets Dec 1, 2026')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Account opened in'), { target: { value: '' } });
    expect(within(travel).getByText('Resets on your account anniversary')).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: /Gold Card/ }));
    expect(screen.queryByLabelText('Account opened in')).toBeNull();
    const dining = screen
      .getByRole('heading', { name: 'Dining credit' })
      .closest('li') as HTMLElement;
    expect(within(dining).getByText('Resets Dec 1, 2026')).toBeTruthy();
  });

  it('lists credits about to reset, and jumps to their card', () => {
    const store = renderWith('amex-gold', 'capital-one-venture-x');
    expect(screen.queryByRole('region', { name: 'Use it before it resets' })).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: /Gold Card/ }));
    fireEvent.input(screen.getByRole('slider', { name: /^Dining credit/ }), {
      target: { value: '100' },
    });
    act(() => {
      store.setAnniversaryMonth('capital-one-venture-x', 12);
      store.applyPreset('capital-one-venture-x', 'face');
    });
    const list = screen.getByRole('region', { name: 'Use it before it resets' });
    const items = within(list)
      .getAllByRole('listitem')
      .map((li) => li.textContent);
    expect(items[0]).toBe(
      'Anniversary bonus miles (Venture X): $100 resets in 23 days (Dec 1, 2026)',
    );
    expect(items).toContain('Dining credit (Gold Card): $10 resets in 23 days (Dec 1, 2026)');
    fireEvent.click(within(list).getByRole('button', { name: 'Capital One Travel credit' }));
    expect(screen.getByRole('tab', { name: /Venture X/ }).getAttribute('aria-selected')).toBe(
      'true',
    );
  });

  it('says when a credit ends for good, and handles today and tomorrow', () => {
    const late = new Date('2026-12-30T12:00:00');
    const store = createStore({ storage: undefined, now: () => late });
    store.addCard('chase-sapphire-reserve');
    store.applyPreset('chase-sapphire-reserve', 'face');
    render(<App store={store} />);
    const list = screen.getByRole('region', { name: 'Use it before it resets' });
    expect(list.textContent).toContain(
      'Select hotels credit (2026) (Sapphire Reserve): ends for good tomorrow',
    );
    cleanup();

    const lastDay = createStore({ storage: undefined, now: () => new Date('2026-12-31T12:00:00') });
    lastDay.addCard('chase-sapphire-reserve');
    lastDay.applyPreset('chase-sapphire-reserve', 'face');
    render(<App store={lastDay} />);
    expect(screen.getByRole('region', { name: 'Use it before it resets' }).textContent).toContain(
      'ends for good today',
    );
  });
});
