// SPDX-License-Identifier: GPL-3.0-or-later
import { formatIsoDate } from '../core/dates';
import { formatUsd } from '../core/money';
import { useStore } from './store-context';

function when(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}

/** Credits you use whose current period runs out within 30 days. */
export function ResettingSoon({ onSelectCard }: { onSelectCard: (cardId: string) => void }) {
  const store = useStore();
  const upcoming = store.upcoming.value;
  if (upcoming.length === 0) return null;

  return (
    <section class="resetting" aria-labelledby="resetting-title">
      <h3 id="resetting-title">Use it before it resets</h3>
      <ul>
        {upcoming.map((r) => (
          <li key={r.perkId}>
            <button type="button" class="link-button" onClick={() => onSelectCard(r.cardId)}>
              {r.perkName}
            </button>{' '}
            <span class="hint">({r.cardName})</span>
            {': '}
            {r.kind === 'ends' ? (
              <>
                ends for good {when(r.days)} ({formatIsoDate(r.date)})
              </>
            ) : (
              <>
                {formatUsd(r.periodCents)} resets {when(r.days)} ({formatIsoDate(r.date)})
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
