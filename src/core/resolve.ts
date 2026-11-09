// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * Builds the card definitions the math works on: catalog cards plus any perks the user added
 * to them, and the user's own custom cards.
 */
import type { Cadence, CardDef, CustomCardInput, CustomPerkInput, PerkDef } from '../catalog/types';
import type { CardUserState } from './card-math';
import { formatUsd } from './money';

const CADENCE_SUFFIX: Record<Cadence, string> = {
  monthly: ' / month',
  quarterly: ' / quarter',
  semiannual: ' / half-year',
  annual: ' / year',
  'every-4-years': ' / 4 years',
};

export function cadenceLabelFor(cadence: Cadence, amountPerPeriodCents: number): string {
  return `${formatUsd(amountPerPeriodCents)}${CADENCE_SUFFIX[cadence]}`;
}

export function customPerkDef(input: CustomPerkInput): PerkDef {
  return {
    id: input.id,
    name: input.name,
    description: 'Added by you.',
    category: 'custom',
    kind: 'custom',
    cadence: input.cadence,
    amountPerPeriodCents: input.amountPerPeriodCents,
    resetBasis: 'calendar-year',
    cadenceLabel: cadenceLabelFor(input.cadence, input.amountPerPeriodCents),
    requiresEnrollment: false,
    custom: true,
  };
}

export function customCardDef(input: CustomCardInput): CardDef {
  return {
    id: input.id,
    issuer: input.issuer,
    name: input.name,
    annualFeeCents: input.annualFeeCents,
    perks: [],
    custom: true,
  };
}

/** Catalog + custom cards, each with the user's custom perks appended. */
export function resolveCards(
  catalog: readonly CardDef[],
  customCards: readonly CustomCardInput[],
  cardStates: Readonly<Record<string, CardUserState>>,
): CardDef[] {
  const catalogIds = new Set(catalog.map((c) => c.id));
  const all = [
    ...catalog,
    // A custom card can never shadow a catalog card.
    ...customCards.filter((c) => !catalogIds.has(c.id)).map(customCardDef),
  ];
  return all.map((card) => {
    const extra = cardStates[card.id]?.customPerks ?? [];
    if (extra.length === 0) return card;
    const existing = new Set(card.perks.map((p) => p.id));
    return {
      ...card,
      perks: [...card.perks, ...extra.filter((p) => !existing.has(p.id)).map(customPerkDef)],
    };
  });
}
