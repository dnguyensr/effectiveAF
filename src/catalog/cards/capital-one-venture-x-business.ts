// SPDX-License-Identifier: GPL-3.0-or-later
import type { CardDef } from '../types';

export const capitalOneVentureXBusiness: CardDef = {
  id: 'capital-one-venture-x-business',
  issuer: 'Capital One',
  name: 'Venture X Business',
  annualFeeCents: 39500,
  lastVerified: '2026-11-09',
  sourceUrl: 'https://www.capitalone.com/small-business/credit-cards/venture-x-business/',
  rewardsCurrency: 'Capital One miles',
  earnRates: [
    { category: 'Hotels and rental cars via Capital One Business Travel', multiplier: 10 },
    { category: 'Flights and vacation rentals via Capital One Business Travel', multiplier: 5 },
    { category: 'Everything else', multiplier: 2 },
  ],
  notes: [
    'The travel credit only works on Capital One Business Travel bookings and expires the day before each account anniversary.',
    'Also includes Priority Pass and Capital One Lounge access (not counted as credits).',
  ],
  perks: [
    {
      id: 'capital-one-venture-x-business.travel',
      name: 'Capital One Business Travel credit',
      description: 'Bookings made through Capital One Business Travel.',
      category: 'travel',
      kind: 'travel-general',
      cadence: 'annual',
      amountPerPeriodCents: 30000,
      resetBasis: 'cardmember-year',
      cadenceLabel: '$300 / account year',
      requiresEnrollment: false,
    },
    {
      id: 'capital-one-venture-x-business.anniversary-miles',
      name: 'Anniversary bonus miles',
      description: '10,000 miles each account anniversary, shown at 1¢ per mile.',
      category: 'travel',
      kind: 'bonus-miles',
      cadence: 'annual',
      amountPerPeriodCents: 10000,
      resetBasis: 'cardmember-year',
      cadenceLabel: '10,000 miles / year',
      requiresEnrollment: false,
    },
    {
      id: 'capital-one-venture-x-business.global-entry',
      name: 'Global Entry / TSA PreCheck credit',
      description: 'Application fee charged to the card, once every 4 years.',
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
