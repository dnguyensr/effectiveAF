// SPDX-License-Identifier: GPL-3.0-or-later
import type { WalletSummary as Summary } from '../core/wallet-math';
import { formatUsd } from '../core/money';
import { PayInFullNote } from './PayInFullNote';
import { verdictText } from './VerdictPill';

export function WalletSummary({ summary }: { summary: Summary }) {
  const unconfirmed = summary.cards.filter((c) => c.ownership === 'have' && c.paysInFull !== true);
  return (
    <section class="summary" aria-labelledby="summary-title">
      <h2 id="summary-title" class="visually-hidden">
        Wallet summary
      </h2>
      <dl class="summary-grid">
        <div>
          <dt>Annual fees{summary.considering.count > 0 ? ' (cards you have)' : ''}</dt>
          <dd data-testid="summary-fees">{formatUsd(summary.feeCents)}</dd>
        </div>
        <div>
          <dt>Credits you'll use</dt>
          <dd data-testid="summary-realized" class="good">
            {formatUsd(summary.realizedCents)}
          </dd>
        </div>
        <div>
          <dt>Effective cost</dt>
          <dd class={summary.verdict === 'costs' ? 'bad' : 'good'}>
            <span data-testid="summary-effective">
              {verdictText(summary.effectiveCents, summary.verdict)}
            </span>
            {unconfirmed.length > 0 && (
              <PayInFullNote
                id="wallet-summary"
                paysInFull={unconfirmed.some((c) => c.paysInFull === false) ? false : undefined}
                subject="some of your cards"
              />
            )}
          </dd>
        </div>
      </dl>
      {summary.considering.count > 0 && (
        <p class="summary-considering" data-testid="summary-considering">
          {summary.cards.length === summary.considering.count
            ? 'Considering '
            : 'Not counted above: considering '}
          {summary.considering.count} {summary.considering.count === 1 ? 'card' : 'cards'}, which{' '}
          {summary.considering.verdict === 'costs'
            ? `would cost ${formatUsd(summary.considering.effectiveCents)}/yr after credits.`
            : `would pay for ${summary.considering.count === 1 ? 'itself' : 'themselves'} (+${formatUsd(-summary.considering.effectiveCents)}/yr).`}
        </p>
      )}
    </section>
  );
}
