// SPDX-License-Identifier: GPL-3.0-or-later
import { amexGold } from './cards/amex-gold';
import { amexPlatinum } from './cards/amex-platinum';
import { capitalOneVentureX } from './cards/capital-one-venture-x';
import { chaseSapphirePreferred } from './cards/chase-sapphire-preferred';
import { chaseSapphireReserve } from './cards/chase-sapphire-reserve';
import type { CardDef } from './types';

/** Bump whenever card data changes, so saved sessions record which data they were made with. */
export const CATALOG_VERSION = '2026-11-08';

export const CATALOG: readonly CardDef[] = [
  amexPlatinum,
  amexGold,
  chaseSapphirePreferred,
  chaseSapphireReserve,
  capitalOneVentureX,
];

const byId = new Map(CATALOG.map((card) => [card.id, card]));

export function findCard(id: string): CardDef | undefined {
  return byId.get(id);
}

export type { CardDef, PerkDef } from './types';
