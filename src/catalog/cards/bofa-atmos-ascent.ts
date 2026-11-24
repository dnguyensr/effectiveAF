// SPDX-License-Identifier: GPL-3.0-or-later
import type { CardDef } from '../types';

export const bofaAtmosAscent: CardDef = {
  id: 'bofa-atmos-ascent',
  issuer: 'Bank of America',
  name: 'Atmos Rewards Ascent Visa Signature',
  annualFeeCents: 9500,
  lastVerified: '2026-11-24',
  sourceUrl: 'https://www.bankofamerica.com/credit-cards/products/alaska-airlines-credit-card/',
  rewardsCurrency: 'Atmos Rewards points',
  earnRates: [
    { category: 'Alaska and Hawaiian Airlines', multiplier: 3 },
    { category: 'Gas and EV charging', multiplier: 2 },
    { category: 'Local transit', multiplier: 2, note: 'including rideshare' },
    { category: 'Cable and select streaming', multiplier: 2 },
    { category: 'Everything else', multiplier: 1 },
  ],
  notes: [
    'Break-even starts at 1¢ a point; published valuations of Atmos points are often higher, so set your own value.',
    'Bank of America customers with an eligible banking or investment account earn 10% more points on card purchases.',
    'Includes a free checked bag and preferred boarding for you and up to 6 companions on the same reservation, 20% back on inflight purchases, and $100 off an Alaska Lounge+ membership (not counted as credits).',
    'Earns 1 status point per $3 spent.',
  ],
  perks: [
    {
      id: 'bofa-atmos-ascent.companion',
      name: 'Companion Fare',
      description:
        'Each account anniversary, if you spent $6,000 on the card in the prior year: a companion on a paid Main Cabin or Saver fare on Alaska or Hawaiian within North America, for $99 plus taxes and fees (from $23).',
      category: 'travel',
      kind: 'companion-fare',
      cadence: 'annual',
      amountPerPeriodCents: 200000,
      resetBasis: 'cardmember-year',
      cadenceLabel: '1 fare / year after $6,000 spend',
      requiresEnrollment: false,
      userValued: true,
      valueHint:
        "What would you pay for the companion's ticket on a trip you'd take anyway, minus the $99 fare and taxes?",
    },
  ],
};
