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
    'Spending $60,000 in a calendar year earns a Brilliant Earned Choice Award.',
    'Up to $100 property credit at The Ritz-Carlton or St. Regis on 2+ night stays booked direct with a special rate (per stay, not counted here). Also 25 Elite Night Credits each calendar year.',
    'Includes Marriott Bonvoy Platinum Elite status (not counted as a credit). No foreign transaction fees.',
  ],
  perks: [
    {
      id: 'amex-marriott-brilliant.free-night',
      name: 'Free Night Award',
      description:
        'One night at a hotel costing up to 85,000 points, each year after your renewal month. Resort fees may apply.',
      category: 'travel',
      kind: 'free-night',
      cadence: 'annual',
      amountPerPeriodCents: 200000,
      resetBasis: 'cardmember-year',
      cadenceLabel: '1 night up to 85k / year',
      requiresEnrollment: false,
      userValued: true,
      valueHint: "What would you pay for a night you'd actually book with it?",
    },
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
    {
      id: 'amex-marriott-brilliant.global-entry',
      name: 'Global Entry / TSA PreCheck credit',
      description:
        'Application fee for Global Entry ($120) or TSA PreCheck (up to $85), every 4 years.',
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
