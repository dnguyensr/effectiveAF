// SPDX-License-Identifier: GPL-3.0-or-later
import type { CardDef } from '../types';

export const bofaPremiumRewards: CardDef = {
  id: 'bofa-premium-rewards',
  issuer: 'Bank of America',
  name: 'Premium Rewards',
  annualFeeCents: 9500,
  lastVerified: '2026-11-09',
  sourceUrl: 'https://www.bankofamerica.com/credit-cards/products/premium-rewards-credit-card/',
  rewardsCurrency: 'Bank of America points',
  earnRates: [
    { category: 'Travel and dining', multiplier: 2 },
    { category: 'Everything else', multiplier: 1.5 },
  ],
  notes: [
    'Points are worth a fixed 1¢ as cash back and do not expire; Bank of America Preferred Rewards members earn 25–75% more points.',
  ],
  perks: [
    {
      id: 'bofa-premium-rewards.airline',
      name: 'Airline incidental credit',
      description:
        'Seat upgrades, baggage fees, in-flight services and lounge fees on certain U.S. airlines, charged separately from tickets.',
      category: 'travel',
      kind: 'airline-fees',
      cadence: 'annual',
      amountPerPeriodCents: 10000,
      resetBasis: 'calendar-year',
      cadenceLabel: '$100 / year',
      requiresEnrollment: false,
    },
    {
      id: 'bofa-premium-rewards.global-entry',
      name: 'Global Entry / TSA PreCheck credit',
      description: 'Application fee charged to the card, once every 4 years.',
      category: 'travel',
      kind: 'trusted-traveler',
      cadence: 'every-4-years',
      amountPerPeriodCents: 10000,
      resetBasis: 'cardmember-year',
      cadenceLabel: '$100 / 4 years',
      requiresEnrollment: false,
    },
  ],
};
