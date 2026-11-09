// SPDX-License-Identifier: GPL-3.0-or-later
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseImport } from '../../../src/state/import-export';
import { createEmptyState } from '../../../src/state/migrations';
import { createStore } from '../../../src/state/store';
import { App } from '../../../src/ui/App';
import { FIXED_NOW, memoryStorage } from '../helpers';

function setup(...cards: string[]) {
  let n = 0;
  const store = createStore({
    storage: memoryStorage(),
    now: () => FIXED_NOW,
    saveDelayMs: 0,
    randomId: () => `t${++n}`,
  });
  for (const id of cards) store.addCard(id);
  return store;
}

beforeEach(() => {
  history.replaceState(null, '', '/#wallet');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('store: point value', () => {
  it('sets, rounds, validates and clears; clearing a card keeps it', () => {
    const store = setup('amex-gold');
    store.setPointValue('amex-gold', 1.256);
    expect(store.state.value.cards['amex-gold']?.pointValueCents).toBe(1.26);
    store.setPointValue('amex-gold', 9);
    expect(store.state.value.cards['amex-gold']?.pointValueCents).toBeUndefined();
    store.setPointValue('amex-gold', 1.5);
    store.applyPreset('amex-gold', 'face');
    store.resetCard('amex-gold');
    expect(store.state.value.cards['amex-gold']).toEqual({ perks: {}, pointValueCents: 1.5 });
    store.setPointValue('amex-gold', null);
    expect(store.state.value.cards['amex-gold']).toEqual({ perks: {} });
    store.setPointValue('amex-gold', Number.NaN);
    store.setPointValue('nope', 1);
    expect(store.state.value.cards.nope).toBeUndefined();
  });

  it('validates the point value in saved data', () => {
    const withValue = (v: unknown) =>
      parseImport(
        JSON.stringify({
          ...createEmptyState('x'),
          cards: { 'amex-gold': { perks: {}, pointValueCents: v } },
        }),
      ).ok;
    expect(withValue(1.5)).toBe(true);
    expect(withValue(0.05)).toBe(false);
    expect(withValue(6)).toBe(false);
    expect(withValue('1')).toBe(false);
  });
});

describe('store: everyday card baseline', () => {
  it('defaults to 2%, accepts 1–3%, and ignores anything else', () => {
    const store = setup();
    expect(store.baselinePercent.value).toBe(2);
    store.setBaselinePercent(1.5);
    expect(store.baselinePercent.value).toBe(1.5);
    expect(store.state.value.settings).toEqual({ baselinePercent: 1.5 });
    store.setBaselinePercent(5);
    store.setBaselinePercent(Number.NaN);
    store.setBaselinePercent(0.5);
    expect(store.baselinePercent.value).toBe(1.5);
  });

  it('validates the baseline in saved data', () => {
    const withBaseline = (v: unknown) =>
      parseImport(JSON.stringify({ ...createEmptyState('x'), settings: { baselinePercent: v } }))
        .ok;
    expect(withBaseline(3)).toBe(true);
    expect(withBaseline(0.5)).toBe(false);
    expect(withBaseline(4)).toBe(false);
  });
});

describe('break-even UI', () => {
  it('shows monthly spend per category, updating with the point value', () => {
    render(<App store={setup('capital-one-venture-x')} />);
    const section = screen.getByRole('region', { name: 'Making up the difference with rewards' });
    const row = (name: RegExp) =>
      within(section).getByRole('rowheader', { name }).closest('tr') as HTMLElement;
    expect(row(/^Hotels and rental cars/).textContent).toContain('$412/mo');
    expect(row(/^Everything else/).textContent).toContain('No better than your 2% card');

    const input = within(section).getByLabelText('Capital One miles worth');
    fireEvent.input(input, { target: { value: '' } });
    expect((input as HTMLInputElement).value).toBe('');
    fireEvent.input(input, { target: { value: '1.5' } });
    // 2x × 1.5¢ = 3¢ − 2¢ = 1¢ → $395 / 0.01 / 12 = $3,291.67 → $3,292
    expect(row(/^Everything else/).textContent).toContain('$3,292/mo');
    fireEvent.input(input, { target: { value: '50' } });
    expect(row(/^Everything else/).textContent).toContain('No better than your 2% card');
    fireEvent.blur(input);
    expect((input as HTMLInputElement).value).toBe('1');

    // A 3% everyday card: the 10x row needs more spend, and a membership warning appears.
    expect(within(section).queryByRole('note')).toBeNull();
    fireEvent.change(within(section).getByLabelText('Your everyday card earns'), {
      target: { value: '3' },
    });
    // 10x at 1¢ = 10¢ − 3¢ = 7¢ extra -> $395 / 0.07 / 12 = $470.24 -> $471/mo
    expect(row(/^Hotels and rental cars/).textContent).toContain('$471/mo');
    expect(row(/^Everything else/).textContent).toContain('No better than your 3% card');
    expect(within(section).getByRole('note').textContent).toContain('Robinhood Gold');
  });

  it('shows cash-back cards in % at face value, with no point value to set', () => {
    const store = setup('amex-blue-cash-preferred');
    // Even a stale saved point value is ignored: cash back is always worth 1¢ per 1%.
    store.setPointValue('amex-blue-cash-preferred', 3);
    render(<App store={store} />);
    const section = screen.getByRole('region', { name: 'Making up the difference with rewards' });
    const row = (name: RegExp) =>
      within(section).getByRole('rowheader', { name }).closest('tr') as HTMLElement;
    expect(within(section).queryByLabelText(/worth$/)).toBeNull();
    // 6% − 2% = 4¢ extra -> $95 / 0.04 / 12 = $197.92 -> $198/mo
    expect(row(/^U\.S\. supermarkets/).textContent).toContain('(up to $6,000 a year, then 1%)');
    expect(row(/^U\.S\. supermarkets/).textContent).toContain('6%');
    expect(row(/^U\.S\. supermarkets/).textContent).toContain('$198/mo');
    // 3% − 2% = 1¢ extra -> $95 / 0.01 / 12 = $791.67 -> $792/mo
    expect(row(/^U\.S\. gas stations/).textContent).toContain('$792/mo');
    expect(row(/^Everything else/).textContent).toContain('1%');
    expect(row(/^Everything else/).textContent).toContain('No better than your 2% card');
  });

  it('a rewards-only card explains it has no credits and relies on break-even', () => {
    render(<App store={setup('chase-ink-business-premier')} />);
    const panel = screen.getByRole('region', { name: 'Ink Business Premier' });
    expect(within(panel).getByText(/^No recurring credits/)).toBeTruthy();
    expect(within(panel).queryByRole('group', { name: /^Quick-set/ })).toBeNull();
    // Only the pay-in-full question is left to answer.
    expect(panel.textContent).toContain('1 of 1 not set yet');
    const section = within(panel).getByRole('region', {
      name: 'Making up the difference with rewards',
    });
    const row = (name: RegExp) =>
      within(section).getByRole('rowheader', { name }).closest('tr') as HTMLElement;
    // $195 against 2%: 5% -> 3¢ extra -> $6,500/yr -> $541.67 -> $542/mo;
    // 2.5% -> 0.5¢ -> $39,000/yr -> $3,250/mo; 2% never beats a 2% card.
    expect(row(/^Travel booked through Chase Travel/).textContent).toContain('$542/mo');
    expect(row(/^Single purchases of \$5,000/).textContent).toContain('2.5%');
    expect(row(/^Single purchases of \$5,000/).textContent).toContain('$3,250/mo');
    expect(row(/^Everything else/).textContent).toContain('No better than your 2% card');
  });

  it('says when a capped category would need more spend than its cap', () => {
    const store = setup('amex-gold');
    store.setBaselinePercent(3);
    render(<App store={store} />);
    const section = screen.getByRole('region', { name: 'Making up the difference with rewards' });
    const row = (name: RegExp) =>
      within(section).getByRole('rowheader', { name }).closest('tr') as HTMLElement;
    // Against 3%: 4x at 1¢ = 1¢ extra → $325 / 0.01 = $32,500 a year → $2,708.33 → $2,709/mo.
    // Restaurants (cap $50,000) still works; supermarkets (cap $25,000) can't.
    expect(row(/^Restaurants worldwide/).textContent).toContain('$2,709/mo');
    expect(row(/^U\.S\. supermarkets/).textContent).toContain('(up to $25,000 a year)');
    expect(row(/^U\.S\. supermarkets/).textContent).toContain('More than the $25,000 a year cap');
  });

  it('says the card already pays for itself, and is absent for custom cards', () => {
    const store = setup('amex-gold');
    store.applyPreset('amex-gold', 'face');
    render(<App store={store} />);
    expect(screen.getByText(/already pays for itself from credits alone/)).toBeTruthy();
    cleanup();

    const custom = setup();
    const id = custom.addCustomCard({ issuer: '', name: 'Mine', annualFeeCents: 9500 }) as string;
    custom.addCard(id);
    render(<App store={custom} />);
    expect(
      screen.queryByRole('region', { name: 'Making up the difference with rewards' }),
    ).toBeNull();
  });
});

describe('share dialog', () => {
  it('shows the Markdown summary and copies it', async () => {
    const store = setup('amex-gold');
    act(() => {
      store.applyPreset('amex-gold', 'face');
    });
    render(<App store={store} />);
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    fireEvent.click(screen.getByRole('button', { name: 'Copy summary for forums' }));
    const dialog = screen.getByRole('dialog', { name: 'Share a summary' });
    const text = (within(dialog).getByLabelText('Summary text') as HTMLTextAreaElement).value;
    expect(text).toContain(
      '| American Express Gold Card | $325 | $424 of $424 | Pays for itself (+$99)\\* |',
    );
    fireEvent.focus(within(dialog).getByLabelText('Summary text'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Copy to clipboard' }));
    expect(writeText).toHaveBeenCalledWith(text);
    expect(await within(dialog).findByText('Copied to clipboard.')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog', { name: 'Share a summary' })).toBeNull();
  });

  it('tells the user to copy by hand if the clipboard is refused', async () => {
    render(<App store={setup('amex-gold')} />);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: () => Promise.reject(new Error('denied')) },
      configurable: true,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Copy summary for forums' }));
    fireEvent.click(screen.getByRole('button', { name: 'Copy to clipboard' }));
    expect(await screen.findByText(/select the text and copy it/)).toBeTruthy();
  });
});
