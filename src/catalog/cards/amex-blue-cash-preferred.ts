// SPDX-License-Identifier: GPL-3.0-or-later
import type { CardDef } from '../types';

export const amexBlueCashPreferred: CardDef = {
  id: 'amex-blue-cash-preferred',
  issuer: 'American Express',
  name: 'Blue Cash Preferred Card',
  annualFeeCents: 9500,
  lastVerified: '2026-11-09',
  sourceUrl: 'https://www.americanexpress.com/us/credit-cards/card/blue-cash-preferred/',
  rewardsCurrency: 'Cash back',
  cashBack: true,
  earnRates: [
    { category: 'U.S. supermarkets', multiplier: 6, note: 'up to $6,000 a year, then 1%' },
    { category: 'Select U.S. streaming subscriptions', multiplier: 6 },
    {
      category: 'Transit (taxis, rideshare, parking, tolls, trains, buses)',
      multiplier: 3,
    },
    { category: 'U.S. gas stations', multiplier: 3 },
    { category: 'Everything else', multiplier: 1 },
  ],
  notes: [
    'No annual fee the first year, then $95.',
    'Cash back comes as Reward Dollars, redeemable as a statement credit, a deposit to an Amex savings account, or at Amazon checkout.',
  ],
  perks: [
    {
      id: 'amex-blue-cash-preferred.disney',
      name: 'Disney streaming credit',
      description:
        'An auto-renewing Disney+, Hulu or ESPN subscription (bundles count) bought on their U.S. websites.',
      category: 'entertainment',
      kind: 'streaming',
      cadence: 'monthly',
      amountPerPeriodCents: 1000,
      resetBasis: 'calendar-year',
      cadenceLabel: '$10 / month',
      requiresEnrollment: true,
    },
  ],
};
