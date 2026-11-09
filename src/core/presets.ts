// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * One-click valuation presets. They set every catalog perk on a card at once; perks the user
 * added themselves keep their values, since the user defined those deliberately. Nothing here
 * guesses at a "typical" value: presets are either face value or a clean slate.
 */
import type { CardDef, PerkCategory } from '../catalog/types';
import type { PerkValuation } from './valuation';

export type PresetId = 'face' | 'travel-dining' | 'clear';

export const PRESETS: readonly { id: PresetId; label: string; description: string }[] = [
  { id: 'face', label: 'Face value', description: 'Every credit at 100%, as advertised.' },
  {
    id: 'travel-dining',
    label: 'Travel & dining at face value',
    description:
      "Travel, dining and rideshare credits at 100%; shopping, streaming, wellness and memberships set to won't use.",
  },
  { id: 'clear', label: 'Clear all', description: 'Every credit back to not set.' },
];

/** Categories most cardholders spend on anyway, as opposed to spend the credit creates. */
const TRAVEL_DINING: ReadonlySet<PerkCategory> = new Set(['travel', 'dining', 'rideshare']);

/** The valuations a preset produces for a card's catalog perks, merged over `current`. */
export function applyPreset(
  card: CardDef,
  current: Readonly<Record<string, PerkValuation>>,
  preset: PresetId,
): Record<string, PerkValuation> {
  const catalogPerks = card.perks.filter((p) => !p.custom);
  if (preset === 'clear') {
    const cleared = new Set(catalogPerks.map((p) => p.id));
    return Object.fromEntries(Object.entries(current).filter(([id]) => !cleared.has(id)));
  }

  const next: Record<string, PerkValuation> = { ...current };
  for (const perk of catalogPerks) {
    next[perk.id] = {
      mode: 'percent',
      percent: 100,
      enabled: preset === 'face' || TRAVEL_DINING.has(perk.category),
    };
  }
  return next;
}
