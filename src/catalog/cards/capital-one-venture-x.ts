// SPDX-License-Identifier: GPL-3.0-or-later
import type { CardDef } from '../types';

export const capitalOneVentureX: CardDef = {
  id: 'capital-one-venture-x',
  issuer: 'Capital One',
  name: 'Venture X',
  annualFeeCents: 39500,
  lastVerified: '2026-11-08',
  sourceUrl: 'https://www.capitalone.com/credit-cards/venture-x/',
  perks: [
    {
      id: 'capital-one-venture-x.travel',
      name: 'Capital One Travel credit',
      description: 'Bookings made through Capital One Travel.',
      category: 'travel',
      cadence: 'annual',
      amountPerPeriodCents: 30000,
      resetBasis: 'cardmember-year',
      cadenceLabel: '$300 / account year',
      defaultRatio: 0.9,
      requiresEnrollment: false,
    },
    {
      id: 'capital-one-venture-x.anniversary-miles',
      name: 'Anniversary bonus miles',
      description: '10,000 miles each account anniversary, shown at 1¢ per mile.',
      category: 'travel',
      cadence: 'annual',
      amountPerPeriodCents: 10000,
      resetBasis: 'cardmember-year',
      cadenceLabel: '10,000 miles / year',
      defaultRatio: 1,
      requiresEnrollment: false,
    },
    {
      id: 'capital-one-venture-x.global-entry',
      name: 'Global Entry / TSA PreCheck credit',
      description: 'Application fee charged to the card, once every 4 years.',
      category: 'travel',
      cadence: 'every-4-years',
      amountPerPeriodCents: 12000,
      resetBasis: 'cardmember-year',
      cadenceLabel: '$120 / 4 years',
      defaultRatio: 0.5,
      requiresEnrollment: false,
    },
  ],
};
