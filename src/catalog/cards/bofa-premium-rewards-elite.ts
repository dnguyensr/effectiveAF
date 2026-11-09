// SPDX-License-Identifier: GPL-3.0-or-later
import type { CardDef } from '../types';

export const bofaPremiumRewardsElite: CardDef = {
  id: 'bofa-premium-rewards-elite',
  issuer: 'Bank of America',
  name: 'Premium Rewards Elite',
  annualFeeCents: 55000,
  lastVerified: '2026-11-09',
  sourceUrl:
    'https://www.bankofamerica.com/credit-cards/products/premium-rewards-elite-credit-card/',
  rewardsCurrency: 'Bank of America points',
  earnRates: [
    { category: 'Travel and dining', multiplier: 2 },
    { category: 'Everything else', multiplier: 1.5 },
  ],
  notes: [
    'Points are worth a fixed 1¢ as cash back; Bank of America Preferred Rewards members earn 25–75% more points.',
    'Also includes up to 4 Priority Pass Select memberships and 20% off airfare paid with points (not counted as credits).',
  ],
  perks: [
    {
      id: 'bofa-premium-rewards-elite.airline',
      name: 'Airline incidental credit',
      description: 'Seat upgrades, baggage fees, in-flight services and airport lounge fees.',
      category: 'travel',
      kind: 'airline-fees',
      cadence: 'annual',
      amountPerPeriodCents: 30000,
      resetBasis: 'calendar-year',
      cadenceLabel: '$300 / year',
      requiresEnrollment: false,
    },
    {
      id: 'bofa-premium-rewards-elite.lifestyle',
      name: 'Lifestyle credit',
      description: 'Streaming, food delivery, fitness subscriptions and rideshare.',
      category: 'entertainment',
      kind: 'flexible',
      cadence: 'annual',
      amountPerPeriodCents: 15000,
      resetBasis: 'calendar-year',
      cadenceLabel: '$150 / year',
      requiresEnrollment: false,
    },
    {
      id: 'bofa-premium-rewards-elite.global-entry',
      name: 'Global Entry / TSA PreCheck credit',
      description: 'Application fee charged to the card, once every 4 years.',
      category: 'travel',
      kind: 'trusted-traveler',
      cadence: 'every-4-years',
      amountPerPeriodCents: 12000,
      resetBasis: 'cardmember-year',
      cadenceLabel: '$120 / 4 years',
      requiresEnrollment: false,
    },
  ],
};
