// SPDX-License-Identifier: GPL-3.0-or-later
import type { CardDef } from '../catalog/types';
import {
  summarizeCard,
  verdictFor,
  type CardSummary,
  type CardUserState,
  type Verdict,
} from './card-math';

export interface Totals {
  count: number;
  feeCents: number;
  realizedCents: number;
  effectiveCents: number;
  verdict: Verdict;
}

export interface WalletSummary {
  /** Every wallet card, in wallet order, held or considered. */
  cards: CardSummary[];
  /** Wallet IDs with no matching catalog card (e.g. a card retired from the catalog). */
  unknownCardIds: string[];
  /** The fields below total only the cards the user holds. */
  feeCents: number;
  realizedCents: number;
  effectiveCents: number;
  verdict: Verdict;
  /** Totals for cards the user is considering signing up for, kept separate. */
  considering: Totals;
}

function totals(cards: readonly CardSummary[]): Totals {
  const feeCents = cards.reduce((sum, c) => sum + c.feeCents, 0);
  const realizedCents = cards.reduce((sum, c) => sum + c.realizedCents, 0);
  const effectiveCents = feeCents - realizedCents;
  return {
    count: cards.length,
    feeCents,
    realizedCents,
    effectiveCents,
    verdict: verdictFor(effectiveCents),
  };
}

export function summarizeWallet(
  catalog: readonly CardDef[],
  wallet: readonly string[],
  cardStates: Readonly<Record<string, CardUserState>>,
  asOf: string,
): WalletSummary {
  const byId = new Map(catalog.map((c) => [c.id, c]));
  const cards: CardSummary[] = [];
  const unknownCardIds: string[] = [];

  for (const id of new Set(wallet)) {
    const card = byId.get(id);
    if (card) cards.push(summarizeCard(card, cardStates[id], asOf));
    else unknownCardIds.push(id);
  }

  const held = totals(cards.filter((c) => c.ownership === 'have'));
  return {
    cards,
    unknownCardIds,
    feeCents: held.feeCents,
    realizedCents: held.realizedCents,
    effectiveCents: held.effectiveCents,
    verdict: held.verdict,
    considering: totals(cards.filter((c) => c.ownership === 'considering')),
  };
}
