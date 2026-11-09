// SPDX-License-Identifier: GPL-3.0-or-later
import type { CardDef } from '../types';

export const wellsFargoAutographJourney: CardDef = {
  id: 'wells-fargo-autograph-journey',
  issuer: 'Wells Fargo',
  name: 'Autograph Journey Card',
  annualFeeCents: 9500,
  lastVerified: '2026-11-09',
  sourceUrl: 'https://creditcards.wellsfargo.com/autograph-journey-visa-credit-card/',
  rewardsCurrency: 'Wells Fargo Rewards points',
  earnRates: [
    { category: 'Hotels', multiplier: 5 },
    { category: 'Airlines', multiplier: 4 },
    { category: 'Restaurants and other travel', multiplier: 3 },
    { category: 'Everything else', multiplier: 1 },
  ],
  notes: [
    'The airline credit year starts the month after your annual fee posts, not on Jan 1.',
    'Points can be redeemed at 1¢ or transferred to airline and hotel partners.',
  ],
  perks: [
    {
      id: 'wells-fargo-autograph-journey.airline',
      name: 'Airline credit',
      description: 'Applied once a year to your first airline purchase of $50 or more.',
      category: 'travel',
      kind: 'airline-fees',
      cadence: 'annual',
      amountPerPeriodCents: 5000,
      resetBasis: 'cardmember-year',
      cadenceLabel: '$50 / account year',
      requiresEnrollment: false,
    },
  ],
};
