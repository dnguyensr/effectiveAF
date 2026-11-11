// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * Perks with no face value (free nights, companion certificates): the user says what they're
 * worth. They count $0 toward face value, presets leave them alone, and they're set in dollars
 * up to a limit.
 */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { findCard } from '../../src/catalog';
import type { CardDef } from '../../src/catalog/types';
import { summarizeCard } from '../../src/core/card-math';
import { walletCsv } from '../../src/core/export-csv';
import { applyPreset } from '../../src/core/presets';
import { upcomingResets } from '../../src/core/resets';
import { createStore } from '../../src/state/store';
import { App } from '../../src/ui/App';
import { FIXED_AS_OF, FIXED_NOW, memoryStorage } from './helpers';

const brilliant = findCard('amex-marriott-brilliant') as CardDef;
const NIGHT = 'amex-marriott-brilliant.free-night';
const DINING = 'amex-marriott-brilliant.dining';

function setup(...cards: string[]) {
  const store = createStore({ storage: memoryStorage(), now: () => FIXED_NOW, saveDelayMs: 0 });
  for (const id of cards) store.addCard(id);
  return store;
}

beforeEach(() => {
  history.replaceState(null, '', '/#wallet');
});

afterEach(() => {
  cleanup();
});

describe('user-valued perks: math', () => {
  it('count nothing toward face value and only what the user sets toward value', () => {
    const empty = summarizeCard(brilliant, undefined, FIXED_AS_OF);
    const night = empty.perks.find((p) => p.perk.id === NIGHT);
    expect(night).toMatchObject({ nominalCents: 0, capCents: 200_000, realizedCents: 0 });
    // $300 dining + $30 Global Entry; the free night adds nothing to face value.
    expect(empty.nominalCents).toBe(33_000);

    const valued = summarizeCard(
      brilliant,
      { perks: { [NIGHT]: { mode: 'dollars', cents: 45_000, enabled: true } } },
      FIXED_AS_OF,
    );
    expect(valued.realizedCents).toBe(45_000);
    // $650 fee − $450 night
    expect(valued.effectiveCents).toBe(20_000);
  });

  it('presets skip them, except clear', () => {
    const mine = { [NIGHT]: { mode: 'dollars' as const, cents: 30_000, enabled: true } };
    for (const preset of ['face', 'half', 'travel-dining'] as const) {
      const next = applyPreset(brilliant, mine, preset);
      expect(next[NIGHT]).toEqual(mine[NIGHT]);
      expect(next[DINING]).toBeDefined();
    }
    expect(applyPreset(brilliant, {}, 'face')[NIGHT]).toBeUndefined();
    expect(applyPreset(brilliant, mine, 'clear')[NIGHT]).toBeUndefined();
  });

  it('the store sets them in dollars up to the limit, and ignores percentages', () => {
    const store = setup('amex-marriott-brilliant');
    store.setPerkPercent('amex-marriott-brilliant', NIGHT, 100);
    expect(store.state.value.cards['amex-marriott-brilliant']?.perks[NIGHT]).toBeUndefined();
    store.setPerkDollars('amex-marriott-brilliant', NIGHT, 999_999);
    expect(store.state.value.cards['amex-marriott-brilliant']?.perks[NIGHT]).toEqual({
      mode: 'dollars',
      cents: 200_000,
      enabled: true,
    });
  });

  it('the resetting-soon list shows the value the user set, not the limit', () => {
    const s = summarizeCard(
      brilliant,
      { perks: { [NIGHT]: { mode: 'dollars', cents: 35_000, enabled: true } } },
      FIXED_AS_OF,
    );
    const [reset] = upcomingResets([s], FIXED_AS_OF, { 'amex-marriott-brilliant': 12 });
    expect(reset).toMatchObject({ perkId: NIGHT, periodCents: 35_000, date: '2026-12-01' });
  });

  it('the spreadsheet says the user sets the value instead of a face value', () => {
    const s = summarizeCard(brilliant, undefined, FIXED_AS_OF);
    const row = walletCsv([s])
      .split('\r\n')
      .find((line) => line.includes('Free Night Award'));
    expect(row).toContain('You set the value');
  });
});

describe('user-valued perks: UI', () => {
  it('a dollar field with a hint, no slider or Half/Full, and Won’t use', () => {
    const store = setup('amex-marriott-brilliant');
    render(<App store={store} />);
    const row = document.querySelector(`[data-perk-id="${NIGHT}"]`) as HTMLElement;
    const r = within(row);
    expect(r.getByText(/What would you pay for a night/).textContent).toContain('Up to $2,000.');
    expect(r.queryByRole('slider')).toBeNull();
    expect(r.queryByRole('button', { name: /^Half/ })).toBeNull();
    expect(r.queryByRole('button', { name: /^Full/ })).toBeNull();
    expect(r.getByText('Not set')).toBeTruthy();
    expect(r.getByText('your value/yr')).toBeTruthy();

    const input = r.getByLabelText(/Free Night Award: what it's worth to you/);
    fireEvent.input(input, { target: { value: '400' } });
    fireEvent.blur(input);
    expect(store.summaryFor('amex-marriott-brilliant')?.realizedCents).toBe(40_000);
    expect(r.getByTestId(`realized-${NIGHT}`).textContent).toContain('$400');

    const wontUse = r.getByRole('button', { name: "Won't use" });
    fireEvent.click(wontUse);
    expect(r.getByTestId(`realized-${NIGHT}`).textContent).toContain("Won't use");
    fireEvent.click(wontUse);
    expect(r.getByTestId(`realized-${NIGHT}`).textContent).toContain('Not set');
  });

  it('Compare says the user sets the value', () => {
    const store = setup();
    store.toggleCompare('amex-marriott-brilliant');
    store.toggleCompare('amex-delta-reserve');
    history.replaceState(null, '', '/#compare');
    render(<App store={store} />);
    expect(screen.getAllByText('You set the value')).toHaveLength(2);
    expect(screen.getByRole('rowheader', { name: 'Free night certificates' })).toBeTruthy();
    expect(screen.getByRole('rowheader', { name: 'Companion certificate' })).toBeTruthy();
  });
});
