// SPDX-License-Identifier: GPL-3.0-or-later
import type { CardDef } from '../types';

export const citiStrataPremier: CardDef = {
  id: 'citi-strata-premier',
  issuer: 'Citi',
  name: 'Strata Premier Card',
  annualFeeCents: 9500,
  lastVerified: '2026-11-09',
  sourceUrl: 'https://www.citi.com/credit-cards/citi-strata-premier-credit-card',
  rewardsCurrency: 'ThankYou points',
  earnRates: [
    { category: 'Hotels, car rentals and attractions on cititravel.com', multiplier: 10 },
    { category: 'Air travel and other hotel purchases', multiplier: 3 },
    { category: 'Restaurants', multiplier: 3 },
    { category: 'Supermarkets', multiplier: 3 },
    { category: 'Gas and EV charging', multiplier: 3 },
    { category: 'Everything else', multiplier: 1 },
  ],
  notes: [
    'The hotel benefit only applies to a single stay of $500 or more (before taxes and fees), so it is worth nothing if you do not book one through Citi Travel.',
    'Points transfer to airline and hotel partners such as American Airlines, JetBlue and Virgin Atlantic.',
  ],
  perks: [
    {
      id: 'citi-strata-premier.hotel',
      name: 'Annual hotel benefit',
      description:
        '$100 off one hotel stay of $500+ (before taxes and fees) booked through cititravel.com.',
      category: 'travel',
      kind: 'hotel',
      cadence: 'annual',
      amountPerPeriodCents: 10000,
      resetBasis: 'calendar-year',
      cadenceLabel: '$100 / year on a $500+ stay',
      requiresEnrollment: false,
    },
  ],
};
