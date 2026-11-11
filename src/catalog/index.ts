// SPDX-License-Identifier: GPL-3.0-or-later
import { amexBlueCashPreferred } from './cards/amex-blue-cash-preferred';
import { amexBusinessPlatinum } from './cards/amex-business-platinum';
import { amexGold } from './cards/amex-gold';
import { amexPlatinum } from './cards/amex-platinum';
import { biltObsidian } from './cards/bilt-obsidian';
import { biltPalladium } from './cards/bilt-palladium';
import { bofaPremiumRewards } from './cards/bofa-premium-rewards';
import { bofaPremiumRewardsElite } from './cards/bofa-premium-rewards-elite';
import { capitalOneVenture } from './cards/capital-one-venture';
import { capitalOneVentureX } from './cards/capital-one-venture-x';
import { capitalOneVentureXBusiness } from './cards/capital-one-venture-x-business';
import { chaseInkBusinessPreferred } from './cards/chase-ink-business-preferred';
import { chaseInkBusinessPremier } from './cards/chase-ink-business-premier';
import { chaseSapphirePreferred } from './cards/chase-sapphire-preferred';
import { chaseSapphireReserve } from './cards/chase-sapphire-reserve';
import { chaseSapphireReserveBusiness } from './cards/chase-sapphire-reserve-business';
import { citiStrataElite } from './cards/citi-strata-elite';
import { citiStrataPremier } from './cards/citi-strata-premier';
import { wellsFargoAutographJourney } from './cards/wells-fargo-autograph-journey';
import type { CardDef } from './types';

/** Bump whenever card data changes, so saved sessions record which data they were made with. */
export const CATALOG_VERSION = '2026-11-09';

/** Grouped by issuer; the picker's issuer tabs follow this order. */
export const CATALOG: readonly CardDef[] = [
  amexPlatinum,
  amexGold,
  amexBusinessPlatinum,
  amexBlueCashPreferred,
  chaseSapphirePreferred,
  chaseSapphireReserve,
  chaseSapphireReserveBusiness,
  chaseInkBusinessPreferred,
  chaseInkBusinessPremier,
  capitalOneVentureX,
  capitalOneVentureXBusiness,
  capitalOneVenture,
  citiStrataElite,
  citiStrataPremier,
  bofaPremiumRewardsElite,
  bofaPremiumRewards,
  wellsFargoAutographJourney,
  biltPalladium,
  biltObsidian,
];

const byId = new Map(CATALOG.map((card) => [card.id, card]));

export function findCard(id: string): CardDef | undefined {
  return byId.get(id);
}

export type { CardDef, PerkDef } from './types';
