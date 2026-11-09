// SPDX-License-Identifier: GPL-3.0-or-later
import { useState } from 'preact/hooks';
import {
  BASELINE_CENTS_PER_DOLLAR,
  breakEven,
  DEFAULT_POINT_VALUE_CENTS,
  MAX_POINT_VALUE_CENTS,
  MIN_POINT_VALUE_CENTS,
} from '../core/breakeven';
import type { CardSummary } from '../core/card-math';
import { formatUsd } from '../core/money';
import { useStore } from './store-context';

const dollars = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

/** "To make up the rest, spend about…" for cards that still cost money after credits. */
export function BreakEven({ summary }: { summary: CardSummary }) {
  const store = useStore();
  const { card } = summary;
  const saved = store.state.value.cards[card.id]?.pointValueCents;
  const pointValue = saved ?? DEFAULT_POINT_VALUE_CENTS;
  const [draft, setDraft] = useState<string | null>(null);
  const rates = card.earnRates;
  if (!rates?.length) return null;
  const rows = breakEven(summary.effectiveCents, rates, pointValue);
  const inputId = `point-value-${card.id}`;

  return (
    <section class="breakeven" aria-labelledby={`breakeven-${card.id}`}>
      <h4 id={`breakeven-${card.id}`}>Making up the difference with rewards</h4>
      {rows === null ? (
        <p class="hint">
          This card already pays for itself from credits alone; anything it earns is a bonus.
        </p>
      ) : (
        <>
          <p class="hint">
            After credits it costs {formatUsd(summary.effectiveCents)} a year. To make that up
            compared with a no-fee {BASELINE_CENTS_PER_DOLLAR}% cash-back card, you'd need to put
            about this much on it each month in one category:
          </p>
          <div class="form-row">
            <label for={inputId}>{card.rewardsCurrency ?? 'Points'} worth</label>
            <span class="money-input">
              <input
                id={inputId}
                type="text"
                inputMode="decimal"
                value={draft ?? String(pointValue)}
                onInput={(e) => {
                  const text = e.currentTarget.value;
                  setDraft(text);
                  const n = Number(text);
                  if (text.trim() !== '' && Number.isFinite(n)) {
                    store.setPointValue(
                      card.id,
                      n >= MIN_POINT_VALUE_CENTS && n <= MAX_POINT_VALUE_CENTS ? n : null,
                    );
                  }
                }}
                onBlur={() => setDraft(null)}
              />
              <span aria-hidden="true">¢</span>
            </span>
            <span class="hint">
              each ({MIN_POINT_VALUE_CENTS}–{MAX_POINT_VALUE_CENTS}¢)
            </span>
          </div>
          <table class="breakeven-table">
            <thead>
              <tr>
                <th scope="col">Category</th>
                <th scope="col">Earns</th>
                <th scope="col">Spend needed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.category}>
                  <th scope="row">
                    {r.category}
                    {r.note && <span class="hint"> ({r.note})</span>}
                  </th>
                  <td>{r.multiplier}x</td>
                  <td>
                    {r.monthlySpendDollars === null
                      ? `No better than ${BASELINE_CENTS_PER_DOLLAR}% cash back`
                      : `${dollars.format(r.monthlySpendDollars)}/mo`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
