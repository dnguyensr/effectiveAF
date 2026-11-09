// SPDX-License-Identifier: GPL-3.0-or-later
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { exportState } from '../../../src/state/import-export';
import { createEmptyState } from '../../../src/state/migrations';
import { STORAGE_KEY } from '../../../src/state/storage';
import { createStore } from '../../../src/state/store';
import { App } from '../../../src/ui/App';
import { FIXED_NOW, memoryStorage } from '../helpers';

function renderApp(initial: Record<string, string> = {}, storageAvailable = true) {
  const storage = memoryStorage(initial);
  const store = createStore({
    storage: storageAvailable ? storage : undefined,
    now: () => FIXED_NOW,
    saveDelayMs: 0,
  });
  const utils = render(<App store={store} />);
  return { ...utils, store, storage };
}

const addCard = (name: RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const verdict = (cardId: string) => screen.getByTestId(`verdict-${cardId}`).textContent;

afterEach(() => {
  cleanup();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe('App', () => {
  it('starts with an empty wallet offering all five cards', () => {
    renderApp();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('effectiveAF');
    expect(screen.getByRole('heading', { name: 'Add the cards you have' })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /^Add / })).toHaveLength(5);
    expect(screen.queryByTestId('summary-fees')).toBeNull();
  });

  it('adds a card, opens it and shows default numbers', () => {
    renderApp();
    addCard(/Add American Express Gold Card/);
    // Gold defaults: 60 dining + 84 Uber + 50 Resy + 21 Dunkin' = 215 of 424; 325 − 215 = 110
    expect(verdict('amex-gold')).toBe('Costs $110/yr');
    expect(screen.getByTestId('summary-fees').textContent).toBe('$325');
    expect(screen.getByTestId('summary-realized').textContent).toBe('$215');
    expect(screen.getByRole('button', { name: /Gold Card/, expanded: true })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /^Add / })).toHaveLength(4);
  });

  it('collapses and expands a card', () => {
    renderApp();
    addCard(/Add American Express Gold Card/);
    const toggle = screen.getByRole('button', { name: /Gold Card/, expanded: true });
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('slider', { name: /Dining credit/ })).toBeNull();
  });

  it('slider and dollar field stay in sync and update every total', () => {
    renderApp();
    addCard(/Add American Express Gold Card/);
    const slider = screen.getByRole('slider', { name: /^Dining credit/ });
    const dollars = screen.getByRole('textbox', { name: /^Dining credit/ }) as HTMLInputElement;

    fireEvent.input(slider, { target: { value: '100' } });
    expect(dollars.value).toBe('120');
    expect(screen.getByTestId('realized-amex-gold.dining').textContent).toContain('$120');
    expect(verdict('amex-gold')).toBe('Costs $50/yr');

    fireEvent.input(dollars, { target: { value: '30' } });
    expect((slider as HTMLInputElement).value).toBe('25');
    expect(verdict('amex-gold')).toBe('Costs $140/yr');
  });

  it('lets the dollar field be cleared while typing, and caps it at face value on blur', () => {
    renderApp();
    addCard(/Add American Express Gold Card/);
    const dollars = screen.getByRole('textbox', { name: /^Uber Cash/ }) as HTMLInputElement;

    fireEvent.input(dollars, { target: { value: '' } });
    expect(dollars.value).toBe('');
    expect(screen.getByTestId('realized-amex-gold.uber-cash').textContent).toContain('$0');

    fireEvent.input(dollars, { target: { value: '999' } });
    expect(dollars.value).toBe('999');
    fireEvent.blur(dollars);
    expect(dollars.value).toBe('120');

    fireEvent.input(dollars, { target: { value: 'abc' } });
    fireEvent.keyDown(dollars, { key: 'Enter' });
    fireEvent.blur(dollars);
    expect(dollars.value).toBe('120');
  });

  it('switching a perk off zeroes it but remembers the value', () => {
    renderApp();
    addCard(/Add American Express Gold Card/);
    const toggle = screen.getByRole('checkbox', { name: "Use Dunkin' credit" });
    fireEvent.click(toggle);
    expect(screen.getByTestId('realized-amex-gold.dunkin').textContent).toContain('$0');
    const dollars = screen.getByRole('textbox', { name: /^Dunkin/ }) as HTMLInputElement;
    expect(dollars.disabled).toBe(true);
    expect(dollars.value).toBe('21');
    expect(verdict('amex-gold')).toBe('Costs $131/yr');
    fireEvent.click(toggle);
    expect(verdict('amex-gold')).toBe('Costs $110/yr');
  });

  it('overrides the annual fee and restores the standard fee', () => {
    renderApp();
    addCard(/Add American Express Gold Card/);
    const fee = screen.getByRole('textbox', { name: 'Gold Card annual fee' });
    fireEvent.input(fee, { target: { value: '0' } });
    expect(screen.getByText('Custom')).toBeTruthy();
    expect(verdict('amex-gold')).toBe('Pays for itself (+$215)');
    fireEvent.input(fee, { target: { value: '' } });
    expect(verdict('amex-gold')).toBe('Costs $110/yr');
    fireEvent.input(fee, { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'Use standard $325' }));
    expect(screen.queryByText('Custom')).toBeNull();
    expect(verdict('amex-gold')).toBe('Costs $110/yr');
  });

  it('removes a card with undo', () => {
    renderApp();
    addCard(/Add American Express Gold Card/);
    addCard(/Add Capital One Venture X/);
    // Gold is still expanded from when it was added; Venture X opened too.
    const gold = screen.getByRole('region', { name: 'Gold Card' });
    fireEvent.click(within(gold).getByRole('button', { name: 'Remove card' }));
    expect(screen.queryByTestId('verdict-amex-gold')).toBeNull();
    expect(screen.getByRole('status').textContent).toContain('Removed Gold Card.');
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(verdict('amex-gold')).toBe('Costs $110/yr');
    expect(screen.queryByText(/Removed/)).toBeNull();
  });

  it('dismisses the undo toast after a while', () => {
    vi.useFakeTimers();
    try {
      renderApp();
      addCard(/Add American Express Gold Card/);
      fireEvent.click(screen.getByRole('button', { name: 'Remove card' }));
      expect(screen.getByText(/Removed Gold Card/)).toBeTruthy();
      // act() flushes the re-render that the timer's state update schedules.
      act(() => {
        vi.advanceTimersByTime(8000);
      });
      expect(screen.queryByText(/Removed Gold Card/)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('resets one card, and all cards after confirming', () => {
    renderApp();
    addCard(/Add American Express Gold Card/);
    const slider = screen.getByRole('slider', { name: /^Dining credit/ });
    fireEvent.input(slider, { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reset this card' }));
    expect(verdict('amex-gold')).toBe('Costs $110/yr');

    fireEvent.input(slider, { target: { value: '100' } });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
    fireEvent.click(screen.getByRole('button', { name: 'Reset all values' }));
    expect(verdict('amex-gold')).toBe('Costs $50/yr');
    confirmSpy.mockReturnValueOnce(true);
    fireEvent.click(screen.getByRole('button', { name: 'Reset all values' }));
    expect(verdict('amex-gold')).toBe('Costs $110/yr');
  });

  it('shows source and verification date for each card', () => {
    renderApp();
    addCard(/Add Capital One Venture X/);
    const link = screen.getByRole('link', { name: 'Capital One card page' });
    expect(link.getAttribute('href')).toBe('https://www.capitalone.com/credit-cards/venture-x/');
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(screen.getByText(/Card data checked Nov 8, 2026/)).toBeTruthy();
  });

  it('shows end dates and enrollment tags on perks', () => {
    renderApp();
    addCard(/Add Chase Sapphire Reserve/);
    const perk = screen
      .getByRole('heading', { name: 'Select hotels credit (2026)' })
      .closest('li') as HTMLElement;
    expect(within(perk).getByText('Ends Dec 31, 2026')).toBeTruthy();
    expect(screen.getAllByText('Enrollment required').length).toBeGreaterThan(0);
  });

  it('warns when the browser will not save data', () => {
    renderApp({}, false);
    expect(screen.getByRole('status').textContent).toContain("isn't letting effectiveAF save");
  });

  it('explains when saved data could not be read', () => {
    renderApp({ [STORAGE_KEY]: '{broken' });
    expect(screen.getByRole('status').textContent).toContain("couldn't be read");
  });

  it('explains when saving fails', () => {
    const { storage } = renderApp();
    storage.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    addCard(/Add American Express Gold Card/);
    return new Promise<void>((resolve) =>
      setTimeout(() => {
        expect(screen.getByText(/couldn't be saved/)).toBeTruthy();
        resolve();
      }, 20),
    );
  });

  it('cycles the theme and remembers it', () => {
    renderApp();
    const button = screen.getByRole('button', { name: /^Theme: System/ });
    fireEvent.click(button);
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem('effectiveaf:theme')).toBe('light');
    fireEvent.click(button);
    expect(document.documentElement.dataset.theme).toBe('dark');
    fireEvent.click(button);
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(localStorage.getItem('effectiveaf:theme')).toBeNull();
  });
});

describe('Backup dialog', () => {
  const openDialog = () =>
    fireEvent.click(screen.getByRole('button', { name: 'Back up or restore' }));

  it('rejects invalid backups with a message and changes nothing', () => {
    const { store } = renderApp();
    openDialog();
    const paste = screen.getByLabelText('Or paste backup text');
    fireEvent.input(paste, { target: { value: '{"cards": {}}' } });
    fireEvent.click(screen.getByRole('button', { name: 'Check backup' }));
    expect(screen.getByRole('alert').textContent).toContain("doesn't look like");
    expect(store.state.value.wallet).toEqual([]);
  });

  it('previews a valid backup and replaces data only after confirming', () => {
    const { store } = renderApp();
    const backup = exportState({
      ...createEmptyState('x'),
      wallet: ['amex-gold', 'amex-platinum'],
      cards: { 'amex-gold': { perks: {}, feeOverrideCents: 0 } },
    });
    openDialog();
    fireEvent.input(screen.getByLabelText('Or paste backup text'), { target: { value: backup } });
    fireEvent.click(screen.getByRole('button', { name: 'Check backup' }));
    expect(screen.getByText(/This backup has 2 cards and 0 saved values/)).toBeTruthy();
    expect(store.state.value.wallet).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Replace my data' }));
    expect(screen.getByText('Backup restored.')).toBeTruthy();
    expect(store.state.value.wallet).toEqual(['amex-gold', 'amex-platinum']);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(verdict('amex-gold')).toBe('Pays for itself (+$215)');
  });

  it('reads a chosen backup file', async () => {
    renderApp();
    openDialog();
    const file = new File(
      [exportState({ ...createEmptyState('x'), wallet: ['amex-gold'] })],
      'b.json',
      {
        type: 'application/json',
      },
    );
    fireEvent.change(screen.getByLabelText('Choose a backup file'), { target: { files: [file] } });
    expect(await screen.findByText(/This backup has 1 card and 0 saved values/)).toBeTruthy();
  });

  it('refuses an oversized file without reading it', async () => {
    renderApp();
    openDialog();
    const big = new File(['x'], 'big.json');
    Object.defineProperty(big, 'size', { value: 5_000_000 });
    fireEvent.change(screen.getByLabelText('Choose a backup file'), { target: { files: [big] } });
    expect((await screen.findByRole('alert')).textContent).toContain('too large');
  });

  it('downloads the current data as a dated JSON file', () => {
    const { store } = renderApp();
    store.addCard('amex-gold');
    const createUrl = vi.fn(() => 'blob:x');
    const revoke = vi.fn();
    Object.assign(URL, { createObjectURL: createUrl, revokeObjectURL: revoke });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    openDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Download backup file' }));
    expect(createUrl).toHaveBeenCalledTimes(1);
    const anchor = click.mock.instances[0] as unknown as HTMLAnchorElement;
    expect(anchor.download).toBe('effectiveaf-backup-2026-11-08.json');
  });
});
