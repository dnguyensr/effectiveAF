// SPDX-License-Identifier: GPL-3.0-or-later
import type { CardDef } from '../types';

export const chaseInkBusinessPremier: CardDef = {
  id: 'chase-ink-business-premier',
  issuer: 'Chase',
  name: 'Ink Business Premier',
  annualFeeCents: 19500,
  lastVerified: '2026-11-09',
  sourceUrl: 'https://creditcards.chase.com/business-credit-cards/ink/premier',
  rewardsCurrency: 'Cash back',
  cashBack: true,
  earnRates: [
    { category: 'Travel booked through Chase Travel', multiplier: 5 },
    { category: 'Lyft rides', multiplier: 5, note: 'through Sep 30, 2027' },
    { category: 'Single purchases of $5,000 or more', multiplier: 2.5 },
    { category: 'Everything else', multiplier: 2 },
  ],
  notes: [
    'Against a 2% everyday card, only the 2.5% large-purchase rate and the 5% categories add anything.',
    'Part of the balance must be paid in full each month; Flex for Business lets the rest be carried with interest.',
  ],
  perks: [],
};
