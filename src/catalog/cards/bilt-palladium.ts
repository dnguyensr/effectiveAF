// SPDX-License-Identifier: GPL-3.0-or-later
import type { CardDef } from '../types';

export const biltPalladium: CardDef = {
  id: 'bilt-palladium',
  issuer: 'Bilt',
  name: 'Palladium Card',
  annualFeeCents: 49500,
  lastVerified: '2026-11-09',
  sourceUrl: 'https://www.bilt.com/card',
  rewardsCurrency: 'Bilt Points',
  earnRates: [
    { category: 'Bilt partner restaurants', multiplier: 5, note: 'up to; varies by restaurant' },
    { category: 'Hotels via Bilt Travel', multiplier: 4 },
    { category: 'Lyft', multiplier: 4 },
    { category: 'Flights via Bilt Travel', multiplier: 3 },
    { category: 'Everything else', multiplier: 2 },
  ],
  notes: [
    'Rent and mortgage: no transaction fee, but points on housing depend on your other spending. Everyday card spend of 25%, 50%, 75% or 100%+ of your housing payment earns 0.5x, 0.75x, 1x or 1.25x on it. Value those points as a custom perk if you pay housing with the card.',
    'Bilt Cash expires 12 months after you earn it.',
    'You can hold only one Bilt card at a time.',
    'From your first card anniversary on or after Jan 1, 2027 (or from opening, for accounts opened in 2027), the hotel credit and annual Bilt Cash become $600 in Bilt Cash a year, unless you make a Legacy Election in the Bilt App. The total stays $600; value it as Bilt Cash from then.',
  ],
  perks: [
    {
      id: 'bilt-palladium.hotel',
      name: 'Bilt Travel hotel credit',
      description:
        'Hotel stays of 2+ nights booked through the Bilt Travel portal or app; turn the credit on at checkout.',
      category: 'travel',
      kind: 'hotel',
      cadence: 'semiannual',
      amountPerPeriodCents: 20000,
      resetBasis: 'calendar-year',
      cadenceLabel: '$200 / half-year',
      requiresEnrollment: false,
    },
    {
      id: 'bilt-palladium.bilt-cash',
      name: 'Annual Bilt Cash',
      description:
        'Spendable in the Bilt app (e.g. toward rent points or partner purchases); expires after 12 months.',
      category: 'retail',
      kind: 'flexible',
      cadence: 'annual',
      amountPerPeriodCents: 20000,
      resetBasis: 'cardmember-year',
      cadenceLabel: '$200 / year',
      requiresEnrollment: false,
    },
  ],
};
