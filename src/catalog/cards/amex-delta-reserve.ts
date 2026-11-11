// SPDX-License-Identifier: GPL-3.0-or-later
import type { CardDef } from '../types';

export const amexDeltaReserve: CardDef = {
  id: 'amex-delta-reserve',
  issuer: 'American Express',
  name: 'Delta SkyMiles Reserve Card',
  annualFeeCents: 65000,
  lastVerified: '2026-11-11',
  sourceUrl:
    'https://www.americanexpress.com/us/credit-cards/card/delta-skymiles-reserve-american-express-card/',
  rewardsCurrency: 'Delta SkyMiles',
  earnRates: [
    { category: 'Delta purchases', multiplier: 3, note: 'made directly with Delta' },
    { category: 'Everything else', multiplier: 1 },
  ],
  notes: [
    'Pay with Miles takes $50 off a Delta flight per 5,000 miles, so 1¢ a mile is a floor; award flights can be worth more.',
    'A Companion Certificate each year after renewal (First, Comfort or Main round trip within the U.S., Mexico, the Caribbean or Central America; you pay $22–$250 in taxes and fees) is not counted here yet; add it as a custom perk at what you would pay.',
    'Includes 15 Delta Sky Club visits a year (unlimited after $75,000 in a calendar year), Centurion Lounge access when flying Delta, and a free first and second checked bag (not counted as credits).',
    'Also 20% back on Delta in-flight food and drink, and $2,500 MQD Headstart each year toward Medallion status.',
  ],
  perks: [
    {
      id: 'amex-delta-reserve.delta-stays',
      name: 'Delta Stays credit',
      description: 'Prepaid hotels or vacation rentals booked through Delta Stays on delta.com.',
      category: 'travel',
      kind: 'hotel',
      cadence: 'annual',
      amountPerPeriodCents: 20000,
      resetBasis: 'calendar-year',
      cadenceLabel: '$200 / year',
      requiresEnrollment: false,
    },
    {
      id: 'amex-delta-reserve.resy',
      name: 'Resy credit',
      description: 'Eligible purchases at qualifying U.S. Resy restaurants.',
      category: 'dining',
      kind: 'dining',
      cadence: 'monthly',
      amountPerPeriodCents: 2000,
      resetBasis: 'calendar-year',
      cadenceLabel: '$20 / month',
      requiresEnrollment: true,
    },
    {
      id: 'amex-delta-reserve.rideshare',
      name: 'Rideshare credit',
      description: 'U.S. rideshare purchases with select providers.',
      category: 'rideshare',
      kind: 'rideshare',
      cadence: 'monthly',
      amountPerPeriodCents: 1000,
      resetBasis: 'calendar-year',
      cadenceLabel: '$10 / month',
      requiresEnrollment: true,
    },
    {
      id: 'amex-delta-reserve.global-entry',
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
