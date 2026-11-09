// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * One-click valuation presets. They set every catalog perk on a card at once; perks the user
 * added themselves keep their values, since the user defined those deliberately.
 */
import type { CardDef, PerkCategory } from '../catalog/types';
import type { PerkValuation } from './valuation';

export type PresetId = 'face' | 'estimates' | 'organic' | 'none';

export const PRESETS: readonly { id: PresetId; label: string; description: string }[] = [
  {
    id: 'estimates',
    label: 'Starting estimates',
    description: 'Conservative guesses of what a typical cardholder uses.',
  },
  { id: 'face', label: 'Face value', description: 'Every credit at 100%, as advertised.' },
  {
    id: 'organic',
    label: 'Only what I already spend on',
    description:
      'Travel, dining and rideshare credits at the starting estimates; shopping, streaming, wellness and memberships off.',
  },
  { id: 'none', label: 'Nothing', description: 'Every credit off. Turn on only what you use.' },
];

/** Categories you'd typically spend on anyway, as opposed to spend the credit creates. */
const ORGANIC: ReadonlySet<PerkCategory> = new Set(['travel', 'dining', 'rideshare']);

/**
 * The valuations a preset produces for a card's catalog perks, merged over `current` so custom
 * perks are untouched. "Starting estimates" removes the entries so the catalog defaults apply.
 */
export function applyPreset(
  card: CardDef,
  current: Readonly<Record<string, PerkValuation>>,
  preset: PresetId,
): Record<string, PerkValuation> {
  const catalogPerks = card.perks.filter((p) => !p.custom);
  if (preset === 'estimates') {
    const reset = new Set(catalogPerks.map((p) => p.id));
    return Object.fromEntries(Object.entries(current).filter(([id]) => !reset.has(id)));
  }

  const next: Record<string, PerkValuation> = { ...current };
  for (const perk of catalogPerks) {
    const estimate = Math.round(perk.defaultRatio * 100);
    next[perk.id] =
      preset === 'face'
        ? { mode: 'percent', percent: 100, enabled: true }
        : {
            mode: 'percent',
            percent: estimate,
            enabled: preset === 'organic' && ORGANIC.has(perk.category),
          };
  }
  return next;
}
