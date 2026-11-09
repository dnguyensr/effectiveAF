// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * The app's single source of truth: user state in a signal, the computed wallet summary,
 * and every action that changes state. Each change is saved (debounced) to storage.
 */
import { computed, signal } from '@preact/signals';
import { CATALOG, findCard } from '../catalog';
import type { CardUserState } from '../core/card-math';
import { localIsoDate } from '../core/dates';
import { clamp } from '../core/money';
import { annualNominalCents } from '../core/valuation';
import { summarizeWallet } from '../core/wallet-math';
import type { UserState } from './schema';
import {
  createDebouncedSaver,
  loadState,
  saveState,
  type KeyValueStore,
  type LoadStatus,
} from './storage';
import type { StateErrorCode } from './errors';

export interface StoreOptions {
  storage: KeyValueStore | undefined;
  now?: () => Date;
  saveDelayMs?: number;
}

export function createStore({ storage, now = () => new Date(), saveDelayMs = 250 }: StoreOptions) {
  const loaded = loadState(storage, now().toISOString());
  const state = signal<UserState>(loaded.state);
  const asOf = localIsoDate(now());
  const summary = computed(() =>
    summarizeWallet(CATALOG, state.value.wallet, state.value.cards, asOf),
  );
  const saveFailed = signal(false);

  const saver = storage
    ? createDebouncedSaver((s) => {
        saveFailed.value = !saveState(storage, s);
      }, saveDelayMs)
    : undefined;

  function commit(next: Omit<UserState, 'updatedAt'>) {
    const withTime: UserState = { ...next, updatedAt: now().toISOString() };
    state.value = withTime;
    saver?.schedule(withTime);
  }

  function updateCard(cardId: string, fn: (card: CardUserState) => CardUserState | undefined) {
    const current = state.value.cards[cardId] ?? { perks: {} };
    const updated = fn({ ...current, perks: { ...current.perks } });
    const others = Object.entries(state.value.cards).filter(([id]) => id !== cardId);
    const cards = Object.fromEntries(
      updated === undefined ? others : [...others, [cardId, updated] as const],
    );
    commit({ ...state.value, cards });
  }

  function findPerk(cardId: string, perkId: string) {
    return findCard(cardId)?.perks.find((p) => p.id === perkId);
  }

  return {
    state,
    summary,
    asOf,
    loadStatus: loaded.status as LoadStatus,
    loadProblem: loaded.problem as StateErrorCode | undefined,
    /** True when the last write to storage failed (e.g. storage full). */
    saveFailed,

    addCard(cardId: string, index?: number) {
      if (!findCard(cardId) || state.value.wallet.includes(cardId)) return;
      const wallet = [...state.value.wallet];
      wallet.splice(index ?? wallet.length, 0, cardId);
      commit({ ...state.value, wallet });
    },

    /** Removes the card from the wallet but keeps its valuations, so re-adding restores them. */
    removeCard(cardId: string): number {
      const index = state.value.wallet.indexOf(cardId);
      if (index === -1) return -1;
      commit({ ...state.value, wallet: state.value.wallet.filter((id) => id !== cardId) });
      return index;
    },

    setPerkPercent(cardId: string, perkId: string, percent: number) {
      if (!findPerk(cardId, perkId)) return;
      const safe = clamp(Math.round(Number.isFinite(percent) ? percent : 0), 0, 100);
      updateCard(cardId, (card) => {
        card.perks[perkId] = { mode: 'percent', percent: safe, enabled: true };
        return card;
      });
    },

    setPerkDollars(cardId: string, perkId: string, cents: number) {
      const perk = findPerk(cardId, perkId);
      if (!perk) return;
      const nominal = annualNominalCents(perk);
      const safe = clamp(Math.round(Number.isFinite(cents) ? cents : 0), 0, nominal);
      updateCard(cardId, (card) => {
        card.perks[perkId] = { mode: 'dollars', cents: safe, enabled: true };
        return card;
      });
    },

    setPerkEnabled(cardId: string, perkId: string, enabled: boolean) {
      const perk = findPerk(cardId, perkId);
      if (!perk) return;
      updateCard(cardId, (card) => {
        const existing = card.perks[perkId] ?? {
          mode: 'percent' as const,
          percent: Math.round(perk.defaultRatio * 100),
          enabled: true,
        };
        card.perks[perkId] = { ...existing, enabled };
        return card;
      });
    },

    /** null (or the catalog fee) clears the override. */
    setFeeOverride(cardId: string, cents: number | null) {
      const card = findCard(cardId);
      if (!card) return;
      updateCard(cardId, (cs) => {
        if (cents === null || cents === card.annualFeeCents) {
          delete cs.feeOverrideCents;
        } else {
          cs.feeOverrideCents = clamp(Math.round(cents), 0, 10_000_000);
        }
        return cs;
      });
    },

    resetCard(cardId: string) {
      updateCard(cardId, () => undefined);
    },

    /** Clears every valuation and fee override; keeps which cards are in the wallet. */
    resetAll() {
      commit({ ...state.value, cards: {} });
    },

    replaceState(next: UserState) {
      commit(next);
    },

    flush() {
      saver?.flush();
    },
  };
}

export type Store = ReturnType<typeof createStore>;
