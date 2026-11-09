// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * The app's single source of truth: user state in a signal, the computed wallet summary,
 * and every action that changes state. Each change is saved (debounced) to storage.
 */
import { computed, signal } from '@preact/signals';
import { CATALOG } from '../catalog';
import type { Cadence, CardDef } from '../catalog/types';
import type { CardUserState } from '../core/card-math';
import { localIsoDate } from '../core/dates';
import { clamp } from '../core/money';
import { applyPreset, type PresetId } from '../core/presets';
import { resolveCards } from '../core/resolve';
import { annualNominalCents } from '../core/valuation';
import { summarizeWallet } from '../core/wallet-math';
import type { StateErrorCode } from './errors';
import {
  MAX_CENTS,
  MAX_CUSTOM_CARDS,
  MAX_CUSTOM_PERKS_PER_CARD,
  MAX_NAME_LENGTH,
  type UserState,
} from './schema';
import {
  createDebouncedSaver,
  loadState,
  saveState,
  type KeyValueStore,
  type LoadStatus,
} from './storage';

export interface StoreOptions {
  storage: KeyValueStore | undefined;
  now?: () => Date;
  saveDelayMs?: number;
  /** Source of random ID suffixes for custom cards and perks (injectable for tests). */
  randomId?: () => string;
}

export interface NewCustomCard {
  issuer: string;
  name: string;
  annualFeeCents: number;
}

export interface NewCustomPerk {
  name: string;
  cadence: Cadence;
  amountPerPeriodCents: number;
}

function defaultRandomId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 10);
}

function cleanText(text: string): string {
  return text.trim().replace(/\s+/g, ' ').slice(0, MAX_NAME_LENGTH).trim();
}

function cleanCents(cents: number, min: number): number {
  return clamp(Math.round(Number.isFinite(cents) ? cents : 0), min, MAX_CENTS);
}

export function createStore({
  storage,
  now = () => new Date(),
  saveDelayMs = 250,
  randomId = defaultRandomId,
}: StoreOptions) {
  const loaded = loadState(storage, now().toISOString());
  const state = signal<UserState>(loaded.state);
  const asOf = localIsoDate(now());

  /** Catalog cards plus the user's custom cards, each with any custom perks added. */
  const cards = computed(() => resolveCards(CATALOG, state.value.customCards, state.value.cards));
  const cardById = computed(() => new Map(cards.value.map((c) => [c.id, c])));
  const summary = computed(() =>
    summarizeWallet(cards.value, state.value.wallet, state.value.cards, asOf),
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

  function withCard(
    s: Omit<UserState, 'updatedAt'>,
    cardId: string,
    updated: CardUserState | undefined,
  ): Omit<UserState, 'updatedAt'> {
    const others = Object.entries(s.cards).filter(([id]) => id !== cardId);
    return {
      ...s,
      cards: Object.fromEntries(
        updated === undefined ? others : [...others, [cardId, updated] as const],
      ),
    };
  }

  function updateCard(cardId: string, fn: (card: CardUserState) => CardUserState | undefined) {
    const current = state.value.cards[cardId] ?? { perks: {} };
    commit(withCard(state.value, cardId, fn({ ...current, perks: { ...current.perks } })));
  }

  /** What resetting leaves behind: nothing, except perks the user created. */
  function resetState(cs: CardUserState | undefined): CardUserState | undefined {
    return cs?.customPerks?.length ? { perks: {}, customPerks: cs.customPerks } : undefined;
  }

  function findCard(cardId: string): CardDef | undefined {
    return cardById.value.get(cardId);
  }

  function findPerk(cardId: string, perkId: string) {
    return findCard(cardId)?.perks.find((p) => p.id === perkId);
  }

  function uniqueId(prefix: string, taken: (id: string) => boolean): string {
    let id = `${prefix}${randomId()}`;
    for (let i = 2; taken(id); i++) id = `${prefix}${randomId()}-${i}`;
    return id;
  }

  return {
    state,
    cards,
    summary,
    asOf,
    loadStatus: loaded.status as LoadStatus,
    loadProblem: loaded.problem as StateErrorCode | undefined,
    /** True when the last write to storage failed (e.g. storage full). */
    saveFailed,
    findCard,

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

    /**
     * Catalog cards: sets an override; null (or the catalog fee) clears it.
     * Custom cards: sets the card's own fee; null means $0.
     */
    setFeeOverride(cardId: string, cents: number | null) {
      const card = findCard(cardId);
      if (!card) return;
      if (card.custom) {
        const fee = cleanCents(cents ?? 0, 0);
        commit({
          ...state.value,
          customCards: state.value.customCards.map((c) =>
            c.id === cardId ? { ...c, annualFeeCents: fee } : c,
          ),
        });
        return;
      }
      updateCard(cardId, (cs) => {
        if (cents === null || cents === card.annualFeeCents) {
          delete cs.feeOverrideCents;
        } else {
          cs.feeOverrideCents = cleanCents(cents, 0);
        }
        return cs;
      });
    },

    applyPreset(cardId: string, preset: PresetId) {
      const card = findCard(cardId);
      if (!card) return;
      updateCard(cardId, (cs) => ({ ...cs, perks: applyPreset(card, cs.perks, preset) }));
    },

    applyPresetToWallet(preset: PresetId) {
      let next: Omit<UserState, 'updatedAt'> = state.value;
      for (const cardId of state.value.wallet) {
        const card = findCard(cardId);
        if (!card) continue;
        const cs = next.cards[cardId] ?? { perks: {} };
        next = withCard(next, cardId, { ...cs, perks: applyPreset(card, cs.perks, preset) });
      }
      commit(next);
    },

    /** Values and fee override back to defaults. Perks the user created are kept. */
    resetCard(cardId: string) {
      commit(withCard(state.value, cardId, resetState(state.value.cards[cardId])));
    },

    /** resetCard for every card; keeps which cards are in the wallet and custom perks. */
    resetAll() {
      const cards = Object.entries(state.value.cards).flatMap(([id, cs]) => {
        const kept = resetState(cs);
        return kept ? [[id, kept] as const] : [];
      });
      commit({ ...state.value, cards: Object.fromEntries(cards) });
    },

    /** Creates a custom card, adds it to the wallet and returns its ID (null if at the limit). */
    addCustomCard(input: NewCustomCard): string | null {
      const name = cleanText(input.name);
      if (!name || state.value.customCards.length >= MAX_CUSTOM_CARDS) return null;
      const id = uniqueId('custom-', (candidate) => cardById.value.has(candidate));
      commit({
        ...state.value,
        customCards: [
          ...state.value.customCards,
          {
            id,
            issuer: cleanText(input.issuer),
            name,
            annualFeeCents: cleanCents(input.annualFeeCents, 0),
          },
        ],
        wallet: [...state.value.wallet, id],
      });
      return id;
    },

    /** Deletes a custom card and everything about it, permanently. */
    deleteCustomCard(cardId: string) {
      if (!state.value.customCards.some((c) => c.id === cardId)) return;
      commit(
        withCard(
          {
            ...state.value,
            customCards: state.value.customCards.filter((c) => c.id !== cardId),
            wallet: state.value.wallet.filter((id) => id !== cardId),
          },
          cardId,
          undefined,
        ),
      );
    },

    /** Adds a perk or benefit the user defines to any card. Returns its ID (null if invalid). */
    addCustomPerk(cardId: string, input: NewCustomPerk): string | null {
      const card = findCard(cardId);
      const name = cleanText(input.name);
      const existing = state.value.cards[cardId]?.customPerks ?? [];
      if (!card || !name || existing.length >= MAX_CUSTOM_PERKS_PER_CARD) return null;
      const id = uniqueId(`${cardId}.my-`, (candidate) =>
        card.perks.some((p) => p.id === candidate),
      );
      updateCard(cardId, (cs) => ({
        ...cs,
        customPerks: [
          ...existing,
          {
            id,
            name,
            cadence: input.cadence,
            amountPerPeriodCents: cleanCents(input.amountPerPeriodCents, 1),
          },
        ],
      }));
      return id;
    },

    removeCustomPerk(cardId: string, perkId: string) {
      const cs = state.value.cards[cardId];
      if (!cs?.customPerks?.some((p) => p.id === perkId)) return;
      const customPerks = cs.customPerks.filter((p) => p.id !== perkId);
      const perks = Object.fromEntries(Object.entries(cs.perks).filter(([id]) => id !== perkId));
      updateCard(cardId, () => ({ ...cs, perks, customPerks }));
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
