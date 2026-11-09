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
          <dt>Annual fees</dt>
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
    </section>
  );
}
