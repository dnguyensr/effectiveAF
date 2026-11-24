// SPDX-License-Identifier: GPL-3.0-or-later
import type { CardDef } from '../types';

export const bofaAtmosSummit: CardDef = {
  id: 'bofa-atmos-summit',
  issuer: 'Bank of America',
  name: 'Atmos Rewards Summit Visa Infinite',
  annualFeeCents: 39500,
  lastVerified: '2026-11-24',
  sourceUrl:
    'https://www.bankofamerica.com/credit-cards/products/alaska-airlines-infinite-credit-card/',
  rewardsCurrency: 'Atmos Rewards points',
  earnRates: [
    { category: 'Alaska and Hawaiian Airlines', multiplier: 3 },
    { category: 'Dining', multiplier: 3 },
    { category: 'Foreign purchases', multiplier: 3, note: 'purchases made abroad' },
    { category: 'Everything else', multiplier: 1 },
  ],
  notes: [
    'Break-even starts at 1¢ a point; published valuations of Atmos points are often higher, so set your own value.',
    'Bank of America customers with an eligible banking or investment account earn 10% more points on card purchases.',
    'Includes 8 Alaska Lounge passes and 8 inflight Wi-Fi passes a year (2 of each per quarter), and a free checked bag and preferred boarding for you and up to 6 companions on the same reservation (not counted as credits). Add the lounge passes as your own perk if you would use them.',
    'Earns 1 status point per $2 spent, plus 10,000 status points each account anniversary.',
  ],
  perks: [
    {
      id: 'bofa-atmos-summit.companion',
      name: 'Global Companion Award',
      description:
        "Each account anniversary: takes 25,000 points off a companion's award ticket on Alaska, Hawaiian or partner airlines, in any cabin, subject to award availability. Spend $60,000 in the card year and it's a 100,000-point award instead.",
      category: 'travel',
      kind: 'companion-fare',
      cadence: 'annual',
      amountPerPeriodCents: 200000,
      resetBasis: 'cardmember-year',
      cadenceLabel: '25,000 points / year',
      requiresEnrollment: false,
      userValued: true,
      valueHint:
        "What would 25,000 points off a companion's award ticket be worth to you, on a trip you'd take anyway?",
    },
    {
      id: 'bofa-atmos-summit.global-entry',
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
