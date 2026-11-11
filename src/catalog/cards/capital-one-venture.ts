// SPDX-License-Identifier: GPL-3.0-or-later
import type { CardDef } from '../types';

export const capitalOneVenture: CardDef = {
  id: 'capital-one-venture',
  issuer: 'Capital One',
  name: 'Venture',
  annualFeeCents: 9500,
  lastVerified: '2026-11-09',
  sourceUrl: 'https://www.capitalone.com/credit-cards/venture/',
  rewardsCurrency: 'Capital One miles',
  earnRates: [
    {
      category: 'Hotels, vacation rentals and rental cars on Capital One Travel',
      multiplier: 5,
    },
    { category: 'Everything else', multiplier: 2 },
  ],
  notes: [
    'Most of its value is in earning 2x miles on everything; at 1¢ a mile that only matches a 2% card, so it pays off when you transfer miles for more.',
    'The $300 Capital One Travel stays credit is a first-year welcome offer, not a yearly credit, so it is not counted here.',
    'Also includes a $50 experience credit on Lifestyle Collection stays (not counted as a credit).',
  ],
  perks: [
    {
      id: 'capital-one-venture.global-entry',
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
