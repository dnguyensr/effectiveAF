// SPDX-License-Identifier: GPL-3.0-or-later
import type { CardDef } from '../catalog/types';
import {
  summarizeCard,
  verdictFor,
  type CardSummary,
  type CardUserState,
  type Verdict,
} from './card-math';

export interface WalletSummary {
  cards: CardSummary[];
  /** Wallet IDs with no matching catalog card (e.g. a card retired from the catalog). */
  unknownCardIds: string[];
  feeCents: number;
  realizedCents: number;
  effectiveCents: number;
  verdict: Verdict;
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

  const feeCents = cards.reduce((sum, c) => sum + c.feeCents, 0);
  const realizedCents = cards.reduce((sum, c) => sum + c.realizedCents, 0);
  const effectiveCents = feeCents - realizedCents;

  return {
    cards,
    unknownCardIds,
    feeCents,
    realizedCents,
    effectiveCents,
    verdict: verdictFor(effectiveCents),
  };
}
