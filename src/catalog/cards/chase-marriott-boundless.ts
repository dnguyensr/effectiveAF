// SPDX-License-Identifier: GPL-3.0-or-later
import type { CardDef } from '../types';

export const chaseMarriottBoundless: CardDef = {
  id: 'chase-marriott-boundless',
  issuer: 'Chase',
  name: 'Marriott Bonvoy Boundless Card',
  annualFeeCents: 9500,
  lastVerified: '2026-11-11',
  sourceUrl: 'https://creditcards.chase.com/travel-credit-cards/marriott-bonvoy/boundless',
  rewardsCurrency: 'Marriott Bonvoy points',
  defaultPointValueCents: 0.7,
  earnRates: [
    { category: 'Marriott Bonvoy hotels', multiplier: 6 },
    {
      category: 'Grocery stores, gas stations and dining',
      multiplier: 3,
      capCentsPerYear: 600_000,
      note: 'combined; then 2x',
    },
    { category: 'Everything else', multiplier: 2 },
  ],
  notes: [
    'Marriott points are usually valued around 0.7¢ each, below transferable points; change the value in break-even to what you get.',
    "If you're considering it: the welcome offer changes often, and Chase periodically offers 5 free nights instead of points, so it can pay to wait for a strong offer.",
    'Includes Silver Elite status and 15 Elite Night Credits each calendar year; $35,000 of spending in a calendar year is a path to Gold (not counted as credits).',
  ],
  perks: [
    {
      id: 'chase-marriott-boundless.free-night',
      name: 'Free Night Award',
      description:
        'One night at a hotel costing up to 35,000 points, each year after your account anniversary. Resort fees may apply.',
      category: 'travel',
      kind: 'free-night',
      cadence: 'annual',
      amountPerPeriodCents: 200000,
      resetBasis: 'cardmember-year',
      cadenceLabel: '1 night up to 35k / year',
      requiresEnrollment: false,
      userValued: true,
      valueHint: "What would you pay for a night you'd actually book with it?",
    },
    {
      id: 'chase-marriott-boundless.airline',
      name: 'Airline credit',
      description:
        'A $50 credit after $250 or more directly with airlines in each window: June 4 to Dec 31, 2026, and Jan 1 to June 30, 2027.',
      category: 'travel',
      kind: 'airline-fees',
      cadence: 'semiannual',
      amountPerPeriodCents: 5000,
      resetBasis: 'calendar-year',
      cadenceLabel: '$50 / half-year',
      requiresEnrollment: false,
      endsOn: '2027-06-30',
    },
  ],
};
