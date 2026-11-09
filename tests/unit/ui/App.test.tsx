// SPDX-License-Identifier: GPL-3.0-or-later
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exportState } from '../../../src/state/import-export';
import { createEmptyState } from '../../../src/state/migrations';
import { STORAGE_KEY } from '../../../src/state/storage';
import { createStore } from '../../../src/state/store';
import { App } from '../../../src/ui/App';
import { FIXED_NOW, memoryStorage } from '../helpers';

function renderApp(initial: Record<string, string> = {}, storageAvailable = true) {
  const storage = memoryStorage(initial);
  let n = 0;
  const store = createStore({
    storage: storageAvailable ? storage : undefined,
    now: () => FIXED_NOW,
    saveDelayMs: 0,
    randomId: () => `t${++n}`,
  });
  const utils = render(<App store={store} />);
  return { ...utils, store, storage };
}

const click = (name: string | RegExp, root: HTMLElement = document.body) =>
  fireEvent.click(within(root).getByRole('button', { name }));
const clickTab = (name: string, root: HTMLElement) =>
  fireEvent.click(within(root).getByRole('tab', { name }));
const verdict = (cardId: string) => screen.getByTestId(`verdict-${cardId}`).textContent;
const dialog = (name: string | RegExp) => screen.getByRole('dialog', { name });

/** Wallet view with the given cards added through the picker, picker closed. */
function walletWith(...cards: RegExp[]) {
  const r = renderApp();
  click(/^Value the cards I have/);
  const picker = dialog('Add a card');
  for (const c of cards) click(c, picker);
  click('Close', picker);
  return r;
}

beforeEach(() => {
  history.replaceState(null, '', '/');
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  vi.restoreAllMocks();
});

describe('first visit', () => {
  it('offers a choice between valuing my cards and comparing', () => {
    renderApp();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('effectiveAF');
    expect(screen.getByRole('heading', { name: 'What would you like to do?' })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Views' })).toBeTruthy();
  });

  it('"Value the cards I have" goes to the wallet and opens the card picker', () => {
    renderApp();
    click(/^Value the cards I have/);
    expect(location.hash).toBe('#wallet');
    const picker = dialog('Add a card');
    expect(
      within(picker)
        .getAllByRole('tab')
        .map((t) => t.textContent),
    ).toEqual([
      'All',
      'American Express',
      'Chase',
      'Capital One',
      'Citi',
      'Bank of America',
      'Bilt',
      'Your cards',
    ]);
    expect(within(picker).getAllByRole('button', { name: /^Add / })).toHaveLength(11);
  });

  it('"Compare cards" goes to the comparison and opens the picker there', () => {
    renderApp();
    click(/^Compare cards/);
    expect(location.hash).toBe('#compare');
    expect(within(dialog('Choose cards to compare')).getByText(/0 of 5 selected/)).toBeTruthy();
  });

  it('follows the URL hash', () => {
    renderApp();
    act(() => {
      location.hash = 'compare';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(screen.getByRole('heading', { name: 'Compare cards' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Compare' }).getAttribute('aria-current')).toBe('page');
  });
});

describe('card picker', () => {
  it('filters by issuer tab and search, with arrow-key tab navigation', () => {
    renderApp();
    click(/^Value the cards I have/);
    const picker = dialog('Add a card');
    clickTab('Chase', picker);
    expect(within(picker).getAllByRole('button', { name: /^Add / })).toHaveLength(3);
    const chase = within(picker).getByRole('tab', { name: 'Chase' });
    fireEvent.keyDown(chase, { key: 'ArrowRight' });
    expect(
      within(picker).getByRole('tab', { name: 'Capital One' }).getAttribute('aria-selected'),
    ).toBe('true');
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Home' });
    expect(within(picker).getByRole('tab', { name: 'All' }).getAttribute('aria-selected')).toBe(
      'true',
    );
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'ArrowLeft' });
    expect(
      within(picker).getByRole('tab', { name: 'Your cards' }).getAttribute('aria-selected'),
    ).toBe('true');
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'End' });
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'a' });
    clickTab('All', picker);
    fireEvent.input(within(picker).getByLabelText('Search cards'), { target: { value: 'sapph' } });
    expect(within(picker).getAllByRole('button', { name: /^Add / })).toHaveLength(3);
    fireEvent.input(within(picker).getByLabelText('Search cards'), { target: { value: 'zzz' } });
    expect(within(picker).getByText('No cards match.')).toBeTruthy();
  });

  it('marks cards already in the wallet and selects the new card tab', () => {
    renderApp();
    click(/^Value the cards I have/);
    const picker = dialog('Add a card');
    click(/Add American Express Gold Card/, picker);
    expect(within(picker).getByText('In wallet')).toBeTruthy();
    click('Close', picker);
    expect(screen.getByRole('tab', { name: /Gold Card/ }).getAttribute('aria-selected')).toBe(
      'true',
    );
  });
});

describe('wallet', () => {
  it('starts every card at its full fee with every credit not set', () => {
    walletWith(/Add American Express Gold Card/);
    expect(verdict('amex-gold')).toBe('Costs $325/yr');
    expect(screen.getByText(/5 of 5 not set yet/)).toBeTruthy();
    expect(screen.getByTestId('realized-amex-gold.dining').textContent).toContain('Not set');
    expect(screen.getByRole('tab', { name: /Gold Card/ }).textContent).toContain('5 not set');
  });

  it('shows one card at a time in tabs, switchable by click and arrow keys', () => {
    walletWith(/Add American Express Gold Card/, /Add Capital One Venture X$/);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['false', 'true']);
    expect(screen.getByRole('tabpanel').textContent).toContain('Venture X');
    fireEvent.click(tabs[0] as HTMLElement);
    expect(screen.getByRole('tabpanel').textContent).toContain('Gold Card');
    fireEvent.keyDown(tabs[0] as HTMLElement, { key: 'ArrowRight' });
    expect(screen.getByRole('tabpanel').textContent).toContain('Venture X');
    expect(screen.getByTestId('summary-fees').textContent).toBe('$720');
  });

  it('a perk moves from not set to using to won’t use and back', () => {
    walletWith(/Add American Express Gold Card/);
    const slider = screen.getByRole('slider', { name: /^Dining credit/ }) as HTMLInputElement;
    const dollars = screen.getByRole('textbox', { name: /^Dining credit/ }) as HTMLInputElement;
    expect(slider.getAttribute('aria-valuetext')).toBe('Not set');

    fireEvent.input(slider, { target: { value: '100' } });
    expect(dollars.value).toBe('120');
    expect(screen.getByTestId('realized-amex-gold.dining').textContent).toContain('$120');
    expect(verdict('amex-gold')).toBe('Costs $205/yr');
    expect(screen.getByText(/4 of 5 not set yet/)).toBeTruthy();

    fireEvent.input(dollars, { target: { value: '30' } });
    expect(slider.value).toBe('25');
    expect(verdict('amex-gold')).toBe('Costs $295/yr');

    const quick = screen.getByRole('group', { name: 'Dining credit: quick values' });
    const half = within(quick).getByRole('button', { name: 'Half ($60)' });
    const full = within(quick).getByRole('button', { name: 'Full ($120)' });
    const wontUse = within(quick).getByRole('button', { name: "Won't use" });
    expect([half, full, wontUse].map((b) => b.getAttribute('aria-pressed'))).toEqual([
      'false',
      'false',
      'false',
    ]);

    fireEvent.click(half);
    expect(dollars.value).toBe('60');
    expect(half.getAttribute('aria-pressed')).toBe('true');
    expect(verdict('amex-gold')).toBe('Costs $265/yr');
    fireEvent.click(full);
    expect(full.getAttribute('aria-pressed')).toBe('true');
    expect(half.getAttribute('aria-pressed')).toBe('false');
    expect(verdict('amex-gold')).toBe('Costs $205/yr');

    // Won't use is an automatic $0.
    fireEvent.click(wontUse);
    expect(wontUse.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('realized-amex-gold.dining').textContent).toContain("Won't use");
    expect(dollars.value).toBe('0');
    expect(verdict('amex-gold')).toBe('Costs $325/yr');
    expect(screen.getByText(/4 of 5 not set yet/)).toBeTruthy();

    // Pressing it again clears the perk back to not set.
    fireEvent.click(wontUse);
    expect(wontUse.getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByText(/5 of 5 not set yet/)).toBeTruthy();

    // Any slider move counts as using it again.
    fireEvent.click(wontUse);
    fireEvent.input(slider, { target: { value: '50' } });
    expect(verdict('amex-gold')).toBe('Costs $265/yr');
  });

  it('lets the dollar field be cleared while typing, and caps it at face value on blur', () => {
    walletWith(/Add American Express Gold Card/);
    const dollars = screen.getByRole('textbox', { name: /^Uber Cash/ }) as HTMLInputElement;
    fireEvent.input(dollars, { target: { value: '' } });
    expect(dollars.value).toBe('');
    // While focused, the field keeps what was typed even though the store capped it...
    dollars.focus();
    fireEvent.input(dollars, { target: { value: '999' } });
    expect(dollars.value).toBe('999');
    // ...and snaps to the capped value on blur.
    fireEvent.blur(dollars);
    dollars.blur();
    expect(dollars.value).toBe('120');
    fireEvent.input(dollars, { target: { value: 'abc' } });
    fireEvent.keyDown(dollars, { key: 'Enter' });
    fireEvent.blur(dollars);
    expect(dollars.value).toBe('120');
  });

  it('overrides the annual fee and restores the standard fee', () => {
    walletWith(/Add American Express Gold Card/);
    const fee = screen.getByRole('textbox', { name: 'Gold Card annual fee' }) as HTMLInputElement;
    expect(fee.readOnly).toBe(true);
    click('Unlock Gold Card annual fee');
    expect(fee.readOnly).toBe(false);
    fireEvent.input(fee, { target: { value: '0' } });
    expect(screen.getByText('Custom')).toBeTruthy();
    expect(verdict('amex-gold')).toBe('Pays for itself (+$0)');
    fireEvent.input(fee, { target: { value: '' } });
    expect(verdict('amex-gold')).toBe('Costs $325/yr');
    fireEvent.input(fee, { target: { value: '100' } });
    click('Use standard $325');
    expect(screen.queryByText('Custom')).toBeNull();
    click('Lock Gold Card annual fee');
    expect(fee.readOnly).toBe(true);
  });

  it('keeps the card summary in a pinned header above its perks', () => {
    walletWith(/Add American Express Platinum Card/);
    const header = screen.getByTestId('card-header-amex-platinum');
    expect(header.className).toBe('card-sticky');
    expect(header.textContent).toContain('Platinum Card');
    expect(header.textContent).toContain('$895 fee');
    expect(within(header).getByTestId('verdict-amex-platinum')).toBeTruthy();
    expect(header.querySelector('.perk-list')).toBeNull();
  });

  it('quick-sets a card and every card at once', () => {
    walletWith(/Add American Express Platinum Card/, /Add Capital One Venture X$/);
    fireEvent.click(screen.getByRole('tab', { name: /Platinum Card/ }));
    const bar = screen.getByRole('group', { name: 'Quick-set Platinum Card credits' });
    click('Full value', bar);
    expect(verdict('amex-platinum')).toBe('Pays for itself (+$2,129)');
    click('Half value', bar);
    expect(verdict('amex-platinum')).toBe('Pays for itself (+$618)');
    click('Travel & dining at full value', bar);
    expect(verdict('amex-platinum')).toBe('Pays for itself (+$754)');
    expect(
      within(screen.getByRole('group', { name: 'lululemon credit: quick values' }))
        .getByRole('button', { name: "Won't use" })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    click('Clear all (no value)', bar);
    expect(verdict('amex-platinum')).toBe('Costs $895/yr');

    fireEvent.change(screen.getByLabelText('Set every card to'), { target: { value: 'face' } });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
    click('Apply');
    expect(verdict('amex-platinum')).toBe('Costs $895/yr');
    confirmSpy.mockReturnValueOnce(true);
    click('Apply');
    expect(screen.getByTestId('summary-effective').textContent).toBe('Pays for itself (+$2,164)');
  });

  it('removes a card with undo, and lets the undo toast expire', () => {
    vi.useFakeTimers();
    try {
      walletWith(/Add American Express Gold Card/, /Add Capital One Venture X$/);
      click('Remove from wallet');
      expect(screen.queryByRole('tab', { name: /Venture X/ })).toBeNull();
      expect(screen.getByRole('status').textContent).toContain('Removed Venture X.');
      click('Undo');
      expect(screen.getByRole('tab', { name: /Venture X/ }).getAttribute('aria-selected')).toBe(
        'true',
      );
      click('Remove from wallet');
      act(() => {
        vi.advanceTimersByTime(8000);
      });
      expect(screen.queryByText(/Removed/)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows an empty state with an add button once every card is removed', () => {
    walletWith(/Add American Express Gold Card/);
    click('Remove from wallet');
    expect(screen.getByText(/Your wallet is empty/)).toBeTruthy();
    click('Add a card');
    expect(dialog('Add a card')).toBeTruthy();
  });

  it('clears one card, and all cards after confirming', () => {
    walletWith(/Add American Express Gold Card/);
    const slider = screen.getByRole('slider', { name: /^Dining credit/ });
    fireEvent.input(slider, { target: { value: '100' } });
    click('Clear this card');
    expect(verdict('amex-gold')).toBe('Costs $325/yr');
    fireEvent.input(slider, { target: { value: '100' } });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
    click('Clear all values');
    expect(verdict('amex-gold')).toBe('Costs $205/yr');
    confirmSpy.mockReturnValueOnce(true);
    click('Clear all values');
    expect(verdict('amex-gold')).toBe('Costs $325/yr');
  });

  it('tells users to confirm terms, and flags card data older than 90 days', () => {
    walletWith(/Add Capital One Venture X$/);
    const source = screen.getByText(/Card data checked/);
    expect(source.textContent).toContain(
      'confirm them on the Capital One card page before you apply',
    );
    expect(screen.queryByText('May be out of date')).toBeNull();
    cleanup();

    // The same card viewed more than 90 days after it was checked.
    const later = createStore({ storage: undefined, now: () => new Date('2027-03-01T12:00:00') });
    later.addCard('capital-one-venture-x');
    history.replaceState(null, '', '/#wallet');
    render(<App store={later} />);
    expect(screen.getByText('May be out of date')).toBeTruthy();
  });

  it("shows a card's good-to-know notes", () => {
    walletWith(/Add Bilt Palladium Card/);
    const notes = screen.getByText('Good to know').closest('details') as HTMLElement;
    expect(within(notes).getAllByRole('listitem').length).toBeGreaterThan(1);
    expect(notes.textContent).toContain('only one Bilt card');
  });

  it('shows source, verification date, end dates and enrollment', () => {
    walletWith(/Add Chase Sapphire Reserve$/);
    const link = screen.getByRole('link', { name: 'Chase card page' });
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(screen.getByText(/Card data checked Nov 8, 2026/)).toBeTruthy();
    const perk = screen
      .getByRole('heading', { name: 'Select hotels credit (2026)' })
      .closest('li') as HTMLElement;
    expect(within(perk).getByText('Ends Dec 31, 2026')).toBeTruthy();
    expect(screen.getAllByText('Enrollment required').length).toBeGreaterThan(0);
  });
});

describe('compare', () => {
  function compareWith(...cards: RegExp[]) {
    const r = renderApp();
    click(/^Compare cards/);
    const picker = dialog('Choose cards to compare');
    for (const c of cards) fireEvent.click(within(picker).getByRole('checkbox', { name: c }));
    click('Close', picker);
    return r;
  }

  it('shows an empty state until cards are chosen', () => {
    history.replaceState(null, '', '/#compare');
    renderApp();
    expect(screen.getByText(/Pick 2 to 5 cards/)).toBeTruthy();
    click('Choose cards');
    expect(dialog('Choose cards to compare')).toBeTruthy();
  });

  it('limits the comparison to five cards', () => {
    const { store } = renderApp();
    store.addCustomCard({ issuer: '', name: 'Sixth', annualFeeCents: 0 });
    click(/^Compare cards/);
    const picker = dialog('Choose cards to compare');
    for (const box of within(picker).getAllByRole('checkbox').slice(0, 5)) fireEvent.click(box);
    expect(within(picker).getByText(/5 of 5 selected/)).toBeTruthy();
    clickTab('Your cards', picker);
    expect(
      (within(picker).getByRole('checkbox', { name: 'Compare Sixth' }) as HTMLInputElement)
        .disabled,
    ).toBe(true);
  });

  it('lines up credits by kind with "not offered" gaps and per-card totals', () => {
    compareWith(/Compare American Express Platinum Card/, /Compare Capital One Venture X$/);
    const table = screen.getByRole('table');
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((h) => h.textContent);
    expect(headers[1]).toContain('Platinum Card');
    expect(headers[2]).toContain('Venture X');
    const row = (label: string) =>
      within(table).getByRole('rowheader', { name: label }).closest('tr') as HTMLElement;
    expect(row('Travel credit').textContent).toContain('Not offered');
    expect(row('Travel credit').textContent).toContain('$300/yr');
    expect(row('Global Entry / TSA PreCheck').textContent).not.toContain('Not offered');
    expect(row('Annual fee').textContent).toContain('$895');
    expect(row('Face value of credits').textContent).toContain('$3,024');
    expect(screen.getByTestId('compare-value-amex-platinum').textContent).toContain('13 not set');
    expect(screen.getByTestId('compare-verdict-capital-one-venture-x').textContent).toBe(
      'Costs $395/yr',
    );
    expect(screen.getByRole('region', { name: 'Comparison table' }).tabIndex).toBe(0);
  });

  it('values a compared card in a dialog and adds it to the wallet', () => {
    compareWith(/Compare Capital One Venture X$/);
    expect(screen.getByText(/Add at least one more card/)).toBeTruthy();
    click('Set my values for Venture X');
    const editor = dialog('Your values: Venture X');
    click('Full value', editor);
    click('Close', editor);
    expect(screen.getByTestId('compare-verdict-capital-one-venture-x').textContent).toBe(
      'Pays for itself (+$35)',
    );
    click('Add to wallet as considering: Venture X');
    expect(screen.getByText('Considering')).toBeTruthy();
    expect(screen.getByTestId('compare-verdict-capital-one-venture-x').textContent).toBe(
      'Would pay for itself (+$35)',
    );
    click('Remove Venture X from comparison');
    expect(screen.getByText(/Pick 2 to 5 cards/)).toBeTruthy();
  });
});

describe('notices and theme', () => {
  it('warns when the browser will not save data', () => {
    renderApp({}, false);
    expect(screen.getByRole('status').textContent).toContain("isn't letting effectiveAF save");
  });

  it('explains when saved data could not be read', () => {
    renderApp({ [STORAGE_KEY]: '{broken' });
    expect(screen.getByRole('status').textContent).toContain("couldn't be read");
  });

  it('explains when saving fails', async () => {
    const { storage, store } = renderApp();
    storage.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    act(() => {
      store.addCard('amex-gold');
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(await screen.findByText(/couldn't be saved/)).toBeTruthy();
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

describe('backup dialog', () => {
  const openDialog = () => click('Back up or restore');

  it('rejects invalid backups with a message and changes nothing', () => {
    const { store } = renderApp();
    openDialog();
    fireEvent.input(screen.getByLabelText('Or paste backup text'), {
      target: { value: '{"cards": {}}' },
    });
    click('Check backup');
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
    click('Check backup');
    expect(screen.getByText(/This backup has 2 cards and 0 saved values/)).toBeTruthy();
    expect(store.state.value.wallet).toEqual([]);
    click('Replace my data');
    expect(screen.getByText('Backup restored.')).toBeTruthy();
    expect(store.state.value.wallet).toEqual(['amex-gold', 'amex-platinum']);
    click('Close');
    expect(screen.getByRole('tab', { name: /Gold Card/ })).toBeTruthy();
  });

  it('reads a chosen backup file', async () => {
    renderApp();
    openDialog();
    const file = new File(
      [exportState({ ...createEmptyState('x'), wallet: ['amex-gold'] })],
      'b.json',
      { type: 'application/json' },
    );
    fireEvent.change(screen.getByLabelText('Choose a backup file'), { target: { files: [file] } });
    expect(await screen.findByText(/This backup has 1 card and 0 saved values/)).toBeTruthy();
  });

  it('clears the restore form on close, not on open', () => {
    renderApp();
    openDialog();
    fireEvent.input(screen.getByLabelText('Or paste backup text'), { target: { value: 'nope' } });
    click('Check backup');
    expect(screen.getByRole('alert')).toBeTruthy();
    click('Close');
    openDialog();
    expect((screen.getByLabelText('Or paste backup text') as HTMLTextAreaElement).value).toBe('');
    expect(screen.queryByRole('alert')).toBeNull();
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
    act(() => {
      store.addCard('amex-gold');
    });
    const createUrl = vi.fn(() => 'blob:x');
    Object.assign(URL, { createObjectURL: createUrl, revokeObjectURL: vi.fn() });
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    openDialog();
    click('Download backup file');
    expect(createUrl).toHaveBeenCalledTimes(1);
    const anchor = anchorClick.mock.instances[0] as unknown as HTMLAnchorElement;
    expect(anchor.download).toBe('effectiveaf-backup-2026-11-08.json');
  });
});
