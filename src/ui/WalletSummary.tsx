// SPDX-License-Identifier: GPL-3.0-or-later
import type { WalletSummary as Summary } from '../core/wallet-math';
import { formatUsd } from '../core/money';
import { verdictText } from './VerdictPill';

export function WalletSummary({ summary }: { summary: Summary }) {
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
          <dd data-testid="summary-effective" class={summary.verdict === 'costs' ? 'bad' : 'good'}>
            {verdictText(summary.effectiveCents, summary.verdict)}
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
