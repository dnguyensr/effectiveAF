// SPDX-License-Identifier: GPL-3.0-or-later
import type { CardDef } from '../types';

export const biltObsidian: CardDef = {
  id: 'bilt-obsidian',
  issuer: 'Bilt',
  name: 'Obsidian Card',
  annualFeeCents: 9500,
  lastVerified: '2026-11-09',
  sourceUrl: 'https://www.bilt.com/card',
  rewardsCurrency: 'Bilt Points',
  earnRates: [
    { category: 'Bilt partner restaurants', multiplier: 6, note: 'up to; varies by restaurant' },
    { category: 'Hotels via Bilt Travel', multiplier: 4 },
    {
      category: 'Dining or grocery (your choice)',
      multiplier: 3,
      note: 'grocery up to $25,000 a year',
    },
    { category: 'Flights via Bilt Travel', multiplier: 3 },
    { category: 'Lyft', multiplier: 3, note: 'after linking your accounts' },
    { category: 'Other travel', multiplier: 2 },
    { category: 'Everything else', multiplier: 1 },
  ],
  notes: [
    'You choose 3x on either dining or grocery, not both.',
    'Rent and mortgage: no transaction fee, but points on housing depend on your other spending. Everyday card spend of 25%, 50%, 75% or 100%+ of your housing payment earns 0.5x, 0.75x, 1x or 1.25x on it. Value those points as a custom perk if you pay housing with the card.',
    'You can hold only one Bilt card at a time.',
    'From your first card anniversary on or after Jan 1, 2027 (or from opening, for accounts opened in 2027), the hotel credit becomes $100 in Bilt Cash a year, unless you make a Legacy Election in the Bilt App. The total stays $100; value it as Bilt Cash from then.',
  ],
  perks: [
    {
      id: 'bilt-obsidian.hotel',
      name: 'Bilt Travel hotel credit',
      description:
        'Hotel stays of 2+ nights booked through the Bilt Travel portal or app; turn the credit on at checkout.',
      category: 'travel',
      kind: 'hotel',
      cadence: 'semiannual',
      amountPerPeriodCents: 5000,
      resetBasis: 'calendar-year',
      cadenceLabel: '$50 / half-year',
      requiresEnrollment: false,
    },
  ],
};
