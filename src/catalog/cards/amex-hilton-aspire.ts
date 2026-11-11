// SPDX-License-Identifier: GPL-3.0-or-later
import type { CardDef } from '../types';

export const amexHiltonAspire: CardDef = {
  id: 'amex-hilton-aspire',
  issuer: 'American Express',
  name: 'Hilton Honors Aspire Card',
  annualFeeCents: 55000,
  lastVerified: '2026-11-11',
  sourceUrl: 'https://www.americanexpress.com/us/credit-cards/card/hilton-honors-aspire/',
  rewardsCurrency: 'Hilton Honors points',
  defaultPointValueCents: 0.5,
  earnRates: [
    { category: 'Hilton hotels and resorts', multiplier: 14, note: 'booked directly' },
    {
      category: 'Flights and car rentals',
      multiplier: 7,
      note: 'flights direct with airlines or Amex Travel; select car rental companies',
    },
    { category: 'U.S. restaurants', multiplier: 7, note: 'including takeout and delivery' },
    { category: 'Everything else', multiplier: 3 },
  ],
  notes: [
    'Hilton points are usually valued around 0.5¢ each, well below transferable points; change the value in break-even to what you get.',
    'A Free Night Reward each year on renewal (and in your first year) is not counted here yet; add it as a custom perk at what you would pay for the stay.',
    'Spending $30,000 in a calendar year earns another Free Night Reward, and another $30,000 earns a second.',
    'Includes Hilton Honors Diamond status (not counted as a credit).',
  ],
  perks: [
    {
      id: 'amex-hilton-aspire.resort',
      name: 'Hilton Resort credit',
      description: 'Eligible purchases made directly with participating Hilton Resorts.',
      category: 'travel',
      kind: 'hotel',
      cadence: 'semiannual',
      amountPerPeriodCents: 20000,
      resetBasis: 'calendar-year',
      cadenceLabel: '$200 / half-year',
      requiresEnrollment: false,
    },
    {
      id: 'amex-hilton-aspire.flight',
      name: 'Flight credit',
      description:
        'Flight purchases made directly with an airline, or through AmexTravel.com or the Amex Travel app.',
      category: 'travel',
      kind: 'airline-fees',
      cadence: 'quarterly',
      amountPerPeriodCents: 5000,
      resetBasis: 'calendar-year',
      cadenceLabel: '$50 / quarter',
      requiresEnrollment: false,
    },
    {
      id: 'amex-hilton-aspire.clear',
      name: 'CLEAR+ credit',
      description: 'A CLEAR+ airport security membership paid with the card.',
      category: 'travel',
      kind: 'airport-security',
      cadence: 'annual',
      amountPerPeriodCents: 21900,
      resetBasis: 'calendar-year',
      cadenceLabel: '$219 / year',
      requiresEnrollment: false,
    },
  ],
};
