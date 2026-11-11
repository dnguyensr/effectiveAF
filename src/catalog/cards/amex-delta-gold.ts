// SPDX-License-Identifier: GPL-3.0-or-later
import type { CardDef } from '../types';

export const amexDeltaGold: CardDef = {
  id: 'amex-delta-gold',
  issuer: 'American Express',
  name: 'Delta SkyMiles Gold Card',
  annualFeeCents: 15000,
  lastVerified: '2026-11-11',
  sourceUrl:
    'https://www.americanexpress.com/us/credit-cards/card/delta-skymiles-gold-american-express-card/',
  rewardsCurrency: 'Delta SkyMiles',
  earnRates: [
    { category: 'Delta purchases', multiplier: 2, note: 'made directly with Delta' },
    { category: 'U.S. restaurants', multiplier: 2, note: 'including takeout and delivery' },
    { category: 'U.S. supermarkets', multiplier: 2 },
    { category: 'Everything else', multiplier: 1 },
  ],
  notes: [
    'The annual fee is $0 the first year.',
    'Pay with Miles takes $50 off a Delta flight per 5,000 miles, so 1¢ a mile is a floor; award flights can be worth more.',
    'Includes a free first checked bag for you and up to 8 companions, and 15% off Delta award flights (not counted as credits). Also 20% back on Delta in-flight food and drink.',
  ],
  perks: [
    {
      id: 'amex-delta-gold.flight-credit',
      name: 'Delta Flight Credit',
      description:
        'A $200 Delta Flight Credit after you spend $10,000 on the card in a calendar year.',
      category: 'travel',
      kind: 'airline-fees',
      cadence: 'annual',
      amountPerPeriodCents: 20000,
      resetBasis: 'calendar-year',
      cadenceLabel: '$200 / year after $10,000 spend',
      requiresEnrollment: false,
    },
    {
      id: 'amex-delta-gold.delta-stays',
      name: 'Delta Stays credit',
      description: 'Prepaid hotels or vacation rentals booked through Delta Stays on delta.com.',
      category: 'travel',
      kind: 'hotel',
      cadence: 'annual',
      amountPerPeriodCents: 10000,
      resetBasis: 'calendar-year',
      cadenceLabel: '$100 / year',
      requiresEnrollment: false,
    },
    {
      id: 'amex-delta-gold.rideshare',
      name: 'Rideshare credit',
      description:
        'U.S. rideshare purchases with select providers, starting after your first card renewal.',
      category: 'rideshare',
      kind: 'rideshare',
      cadence: 'monthly',
      amountPerPeriodCents: 1000,
      resetBasis: 'calendar-year',
      cadenceLabel: '$10 / month',
      requiresEnrollment: true,
    },
  ],
};
