// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * A plain Markdown summary of the wallet, for asking "should I keep this card?" on Reddit or
 * other forums. Contains only what the user chooses to paste: nothing is sent anywhere.
 */
import type { CardSummary } from './card-math';
import { formatIsoDate } from './dates';
import { formatUsd } from './money';
import type { WalletSummary } from './wallet-math';

export const APP_URL = 'https://dnguyensr.github.io/effectiveAF/';

/** Markdown table cells can't contain raw pipes or newlines. */
function cell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
}

function verdict(c: Pick<CardSummary, 'effectiveCents' | 'verdict'>, considering = false): string {
  return c.verdict === 'pays-for-itself'
    ? `${considering ? 'Would pay' : 'Pays'} for itself (+${formatUsd(-c.effectiveCents)})`
    : `${considering ? 'Would cost' : 'Costs'} ${formatUsd(c.effectiveCents)}/yr`;
}

/** Perks not valued yet (the pay-in-full question is reported separately). */
const unvalued = (c: CardSummary) => c.perks.filter((p) => p.status === 'unset').length;

/** Results assume paying in full; mark (escaped for Markdown) the ones not confirmed. */
const star = (unconfirmed: boolean) => (unconfirmed ? '\\*' : '');

export const PAY_IN_FULL_FOOTNOTE =
  "\\* Assumes the statement balance is paid in full every month, which isn't confirmed for this card. Interest on a carried balance usually outweighs credits and rewards.";

function cardLine(c: CardSummary): string {
  const using = c.perks
    .filter((p) => p.status === 'using')
    .map((p) => `${cell(p.perk.name)} (${formatUsd(p.realizedCents)})`);
  const skipped = c.perks.filter((p) => p.status === 'skipped').map((p) => cell(p.perk.name));
  const parts = [
    using.length > 0 ? `using ${using.join(', ')}` : 'using no credits',
    ...(skipped.length > 0 ? [`won't use ${skipped.join(', ')}`] : []),
    ...(unvalued(c) > 0 ? [`${unvalued(c)} not valued yet`] : []),
    ...(c.paysInFull === false ? ["I don't always pay it in full"] : []),
  ];
  return `**${cell(c.card.name)}${c.ownership === 'considering' ? ' (considering)' : ''}:** ${parts.join('; ')}.`;
}

export function walletMarkdown(wallet: WalletSummary, asOf: string): string {
  const considering = (c: CardSummary) => c.ownership === 'considering';
  const name = (c: CardSummary) =>
    cell([c.card.issuer, c.card.name].filter(Boolean).join(' ')) +
    (considering(c) ? ' _(considering)_' : '');
  const rows = wallet.cards.map(
    (c) =>
      `| ${name(c)} | ${formatUsd(c.feeCents)} | ${formatUsd(c.realizedCents)} of ${formatUsd(c.nominalCents)} | ${verdict(c, considering(c))}${star(c.paysInFull !== true)} |`,
  );
  const totalLabel = wallet.considering.count > 0 ? '**Total, cards I have**' : '**Total**';
  const anyUnconfirmed = wallet.cards.some((c) => c.paysInFull !== true);
  const heldUnconfirmed = wallet.cards.some((c) => c.ownership === 'have' && c.paysInFull !== true);
  return [
    `**My credit card wallet** (values as of ${formatIsoDate(asOf)})`,
    '',
    '| Card | Annual fee | Credits I actually use | Effective cost |',
    '|---|--:|--:|---|',
    ...rows,
    `| ${totalLabel} | **${formatUsd(wallet.feeCents)}** | **${formatUsd(wallet.realizedCents)}** | **${verdict(wallet)}**${star(heldUnconfirmed)} |`,
    '',
    ...wallet.cards.map(cardLine),
    '',
    ...(anyUnconfirmed ? [PAY_IN_FULL_FOOTNOTE, ''] : []),
    `_Calculated with effectiveAF: ${APP_URL}. Credit amounts come from issuers' public pages and change often; check current terms._`,
    '',
  ].join('\n');
}
