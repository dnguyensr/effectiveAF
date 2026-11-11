// SPDX-License-Identifier: GPL-3.0-or-later
import type { CardDef } from '../types';

export const amexHiltonSurpass: CardDef = {
  id: 'amex-hilton-surpass',
  issuer: 'American Express',
  name: 'Hilton Honors Surpass Card',
  annualFeeCents: 15000,
  lastVerified: '2026-11-11',
  sourceUrl: 'https://www.americanexpress.com/us/credit-cards/card/hilton-honors-surpass/',
  rewardsCurrency: 'Hilton Honors points',
  defaultPointValueCents: 0.5,
  earnRates: [
    { category: 'Hilton hotels and resorts', multiplier: 12, note: 'booked directly' },
    { category: 'U.S. restaurants', multiplier: 6, note: 'including takeout and delivery' },
    { category: 'U.S. supermarkets', multiplier: 6 },
    { category: 'U.S. gas stations', multiplier: 6 },
    { category: 'U.S. online retail', multiplier: 4 },
    { category: 'Everything else', multiplier: 3 },
  ],
  notes: [
    'Hilton points are usually valued around 0.5¢ each, well below transferable points; change the value in break-even to what you get.',
    'Spending $15,000 in a calendar year earns a Free Night Reward (not counted here); $40,000 earns Diamond status through the next calendar year.',
    'Includes Hilton Honors Gold status and National Car Rental Emerald Club Executive status (enroll through Amex).',
  ],
  perks: [
    {
      id: 'amex-hilton-surpass.hilton',
      name: 'Hilton credit',
      description: 'Purchases made directly with a property in the Hilton portfolio.',
      category: 'travel',
      kind: 'hotel',
      cadence: 'quarterly',
      amountPerPeriodCents: 5000,
      resetBasis: 'calendar-year',
      cadenceLabel: '$50 / quarter',
      requiresEnrollment: false,
    },
  ],
};
