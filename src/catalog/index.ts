// SPDX-License-Identifier: GPL-3.0-or-later
import { amexBlueCashPreferred } from './cards/amex-blue-cash-preferred';
import { amexBusinessPlatinum } from './cards/amex-business-platinum';
import { amexDeltaGold } from './cards/amex-delta-gold';
import { amexDeltaPlatinum } from './cards/amex-delta-platinum';
import { amexDeltaReserve } from './cards/amex-delta-reserve';
import { amexGold } from './cards/amex-gold';
import { amexHiltonAspire } from './cards/amex-hilton-aspire';
import { amexHiltonBusiness } from './cards/amex-hilton-business';
import { amexHiltonSurpass } from './cards/amex-hilton-surpass';
import { amexMarriottBrilliant } from './cards/amex-marriott-brilliant';
import { amexPlatinum } from './cards/amex-platinum';
import { biltObsidian } from './cards/bilt-obsidian';
import { biltPalladium } from './cards/bilt-palladium';
import { bofaPremiumRewards } from './cards/bofa-premium-rewards';
import { bofaPremiumRewardsElite } from './cards/bofa-premium-rewards-elite';
import { capitalOneVenture } from './cards/capital-one-venture';
import { capitalOneVentureX } from './cards/capital-one-venture-x';
import { capitalOneVentureXBusiness } from './cards/capital-one-venture-x-business';
import { chaseIhgBusiness } from './cards/chase-ihg-business';
import { chaseIhgPremier } from './cards/chase-ihg-premier';
import { chaseIhgPremierSelect } from './cards/chase-ihg-premier-select';
import { chaseInkBusinessPreferred } from './cards/chase-ink-business-preferred';
import { chaseInkBusinessPremier } from './cards/chase-ink-business-premier';
import { chaseMarriottBoundless } from './cards/chase-marriott-boundless';
import { chaseSapphirePreferred } from './cards/chase-sapphire-preferred';
import { chaseSapphireReserve } from './cards/chase-sapphire-reserve';
import { chaseSapphireReserveBusiness } from './cards/chase-sapphire-reserve-business';
import { chaseUnitedClub } from './cards/chase-united-club';
import { chaseUnitedExplorer } from './cards/chase-united-explorer';
import { chaseUnitedQuest } from './cards/chase-united-quest';
import { citiAAdvantageExecutive } from './cards/citi-aadvantage-executive';
import { citiStrataElite } from './cards/citi-strata-elite';
import { citiStrataPremier } from './cards/citi-strata-premier';
import { wellsFargoAutographJourney } from './cards/wells-fargo-autograph-journey';
import type { CardDef } from './types';

/** Bump whenever card data changes, so saved sessions record which data they were made with. */
export const CATALOG_VERSION = '2026-11-11';

/** Grouped by issuer; the picker's issuer tabs follow this order. */
export const CATALOG: readonly CardDef[] = [
  amexPlatinum,
  amexGold,
  amexBusinessPlatinum,
  amexBlueCashPreferred,
  amexHiltonAspire,
  amexHiltonSurpass,
  amexHiltonBusiness,
  amexMarriottBrilliant,
  amexDeltaReserve,
  amexDeltaPlatinum,
  amexDeltaGold,
  chaseSapphirePreferred,
  chaseSapphireReserve,
  chaseSapphireReserveBusiness,
  chaseInkBusinessPreferred,
  chaseInkBusinessPremier,
  chaseUnitedClub,
  chaseUnitedQuest,
  chaseUnitedExplorer,
  chaseMarriottBoundless,
  chaseIhgPremierSelect,
  chaseIhgPremier,
  chaseIhgBusiness,
  capitalOneVentureX,
  capitalOneVentureXBusiness,
  capitalOneVenture,
  citiStrataElite,
  citiStrataPremier,
  citiAAdvantageExecutive,
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
