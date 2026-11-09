// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * The starting estimates (percent of face value) that schema v1 applied to perks the user had
 * not touched. Frozen here so the v1 -> v2 migration keeps early users' numbers exactly as
 * they were, no matter how the catalog changes later. Never edit.
 */
export const V1_STARTING_ESTIMATES: Readonly<Record<string, number>> = {
  'amex-gold.dining': 50,
  'amex-gold.uber-cash': 70,
  'amex-gold.resy': 50,
  'amex-gold.dunkin': 25,
  'amex-platinum.hotel': 25,
  'amex-platinum.resy': 50,
  'amex-platinum.digital-entertainment': 50,
  'amex-platinum.lululemon': 25,
  'amex-platinum.uber-cash': 70,
  'amex-platinum.uber-one': 30,
  'amex-platinum.airline-fee': 50,
  'amex-platinum.clear': 30,
  'amex-platinum.walmart-plus': 25,
  'amex-platinum.equinox': 0,
  'amex-platinum.oura': 10,
  'amex-platinum.global-entry': 50,
  'capital-one-venture-x.travel': 90,
  'capital-one-venture-x.anniversary-miles': 100,
  'capital-one-venture-x.global-entry': 50,
  'chase-sapphire-preferred.hotel': 75,
  'chase-sapphire-preferred.doordash-promo': 30,
  'chase-sapphire-preferred.dashpass': 30,
  'chase-sapphire-preferred.apple-tv': 30,
  'chase-sapphire-preferred.global-entry': 50,
  'chase-sapphire-reserve.travel': 95,
  'chase-sapphire-reserve.the-edit': 50,
  'chase-sapphire-reserve.select-hotels-2026': 25,
  'chase-sapphire-reserve.dining': 50,
  'chase-sapphire-reserve.stubhub': 40,
  'chase-sapphire-reserve.apple': 40,
  'chase-sapphire-reserve.doordash-promos': 25,
  'chase-sapphire-reserve.dashpass': 30,
  'chase-sapphire-reserve.lyft': 25,
  'chase-sapphire-reserve.peloton': 0,
  'chase-sapphire-reserve.global-entry': 50,
};
