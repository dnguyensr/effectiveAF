// SPDX-License-Identifier: GPL-3.0-or-later
import type { CardDef } from '../types';

export const chaseInkBusinessPreferred: CardDef = {
  id: 'chase-ink-business-preferred',
  issuer: 'Chase',
  name: 'Ink Business Preferred',
  annualFeeCents: 9500,
  lastVerified: '2026-11-09',
  sourceUrl: 'https://creditcards.chase.com/business-credit-cards/ink/business-preferred',
  rewardsCurrency: 'Ultimate Rewards points',
  earnRates: [
    { category: 'Lyft rides', multiplier: 5, note: 'through Sep 30, 2027' },
    {
      category: 'Travel, shipping, internet, cable and phone, and social media and search ads',
      multiplier: 3,
      capCentsPerYear: 15_000_000,
      note: 'combined, per account year',
    },
    { category: 'Everything else', multiplier: 1 },
  ],
  notes: [
    'Most of its value is in earning: the 3x categories share one $150,000 yearly cap.',
    'Points transfer to Chase airline and hotel partners.',
    'Also includes cell phone protection and employee cards at no extra cost (not counted as credits; add cell phone protection as your own perk if it matters to you).',
  ],
  perks: [
    {
      id: 'chase-ink-business-preferred.doordash-promos',
      name: 'DoorDash promos',
      description: 'A $10 monthly promo on DoorDash grocery and retail orders (needs DashPass).',
      category: 'dining',
      kind: 'food-delivery',
      cadence: 'monthly',
      amountPerPeriodCents: 1000,
      resetBasis: 'calendar-year',
      cadenceLabel: '$10 / month',
      requiresEnrollment: true,
      endsOn: '2027-12-31',
    },
    {
      id: 'chase-ink-business-preferred.dashpass',
      name: 'DashPass membership',
      description:
        'Complimentary DoorDash DashPass for at least a year (activate by Dec 31, 2027).',
      category: 'membership',
      kind: 'delivery-membership',
      cadence: 'annual',
      amountPerPeriodCents: 12000,
      resetBasis: 'calendar-year',
      cadenceLabel: '$120 value / year',
      requiresEnrollment: true,
      endsOn: '2027-12-31',
    },
  ],
};
