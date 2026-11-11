// SPDX-License-Identifier: GPL-3.0-or-later
import type { CardDef } from '../types';

export const amexMarriottBrilliant: CardDef = {
  id: 'amex-marriott-brilliant',
  issuer: 'American Express',
  name: 'Marriott Bonvoy Brilliant Card',
  annualFeeCents: 65000,
  lastVerified: '2026-11-11',
  sourceUrl: 'https://www.americanexpress.com/us/credit-cards/card/marriott-bonvoy-brilliant/',
  rewardsCurrency: 'Marriott Bonvoy points',
  defaultPointValueCents: 0.7,
  earnRates: [
    { category: 'Marriott Bonvoy hotels', multiplier: 6 },
    { category: 'Restaurants worldwide', multiplier: 3 },
    { category: 'Flights booked directly with airlines', multiplier: 3 },
    { category: 'Everything else', multiplier: 2 },
  ],
  notes: [
    'Marriott points are usually valued around 0.7¢ each, below transferable points; change the value in break-even to what you get.',
    'A Free Night Award (up to 85,000 points; resort fees may apply) each year after your renewal month is not counted here yet; add it as a custom perk at what you would pay for the stay.',
    'Spending $60,000 in a calendar year earns a Brilliant Earned Choice Award.',
    'Includes Marriott Bonvoy Platinum Elite status (not counted as a credit). No foreign transaction fees.',
  ],
  perks: [
    {
      id: 'amex-marriott-brilliant.dining',
      name: 'Brilliant Dining credit',
      description: 'Eligible purchases at restaurants worldwide.',
      category: 'dining',
      kind: 'dining',
      cadence: 'monthly',
      amountPerPeriodCents: 2500,
      resetBasis: 'calendar-year',
      cadenceLabel: '$25 / month',
      requiresEnrollment: false,
    },
  ],
};
