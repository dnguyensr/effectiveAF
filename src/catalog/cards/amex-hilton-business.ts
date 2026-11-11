// SPDX-License-Identifier: GPL-3.0-or-later
import type { CardDef } from '../types';

export const amexHiltonBusiness: CardDef = {
  id: 'amex-hilton-business',
  issuer: 'American Express',
  name: 'Hilton Honors Business Card',
  annualFeeCents: 19500,
  lastVerified: '2026-11-11',
  sourceUrl:
    'https://www.americanexpress.com/us/credit-cards/business/business-credit-cards/hilton-honors/',
  rewardsCurrency: 'Hilton Honors points',
  defaultPointValueCents: 0.5,
  earnRates: [
    { category: 'Hilton hotels and resorts', multiplier: 12, note: 'booked directly' },
    {
      category: 'Everything else',
      multiplier: 5,
      capCentsPerYear: 10_000_000,
      note: 'then 3x',
    },
  ],
  notes: [
    'Hilton points are usually valued around 0.5¢ each, well below transferable points; change the value in break-even to what you get.',
    'Spending $40,000 in a calendar year earns Diamond status through the next calendar year.',
    'Includes Hilton Honors Gold status and National Car Rental Emerald Club Executive status (enroll through Amex).',
  ],
  perks: [
    {
      id: 'amex-hilton-business.hilton',
      name: 'Hilton credit',
      description: 'Purchases made directly with a property in the Hilton portfolio.',
      category: 'travel',
      kind: 'hotel',
      cadence: 'quarterly',
      amountPerPeriodCents: 6000,
      resetBasis: 'calendar-year',
      cadenceLabel: '$60 / quarter',
      requiresEnrollment: false,
    },
  ],
};
