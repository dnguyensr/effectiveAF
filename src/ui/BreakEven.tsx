// SPDX-License-Identifier: GPL-3.0-or-later
import { useState } from 'preact/hooks';
import {
  BASELINE_OPTIONS,
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
  // Cash back is always worth face value: 6% is 6¢ per $1.
  const cashBack = card.cashBack === true;
  const pointValue = cashBack
    ? 1
    : (saved ?? card.defaultPointValueCents ?? DEFAULT_POINT_VALUE_CENTS);
  const [draft, setDraft] = useState<string | null>(null);
  const rates = card.earnRates;
  if (!rates?.length) return null;
  const baseline = store.baselinePercent.value;
  const rows = breakEven(summary.effectiveCents, rates, pointValue, baseline);
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
            compared with putting the same spending on your everyday card, you'd need to put about
            this much on it each month in one category:
          </p>
          <div class="form-row">
            <label for={`baseline-${card.id}`}>Your everyday card earns</label>
            <select
              id={`baseline-${card.id}`}
              class="month-select"
              value={String(baseline)}
              onChange={(e) => store.setBaselinePercent(Number(e.currentTarget.value))}
            >
              {BASELINE_OPTIONS.map((p) => (
                <option key={p} value={String(p)}>
                  {p}% cash back
                </option>
              ))}
            </select>
          </div>
          {baseline >= 3 && (
            <p class="hint warn-note" role="note">
              Cards that earn 3% on everything usually need a paid membership. For example, the
              Robinhood Gold Card requires Robinhood Gold ($50 a year), so count that cost too.
            </p>
          )}
          {!cashBack && (
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
          )}
          <table class="breakeven-table">
            <thead>
              <tr>
                <th scope="col">Category</th>
                <th scope="col">Earns</th>
                <th scope="col">Spend needed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const cap =
                  r.capDollarsPerYear === undefined
                    ? undefined
                    : `${dollars.format(r.capDollarsPerYear)} a year`;
                const note = [cap && `up to ${cap}`, r.note].filter(Boolean).join(', ');
                return (
                  <tr key={r.category}>
                    <th scope="row">
                      {r.category}
                      {note && <span class="hint"> ({note})</span>}
                    </th>
                    <td>{cashBack ? `${r.multiplier}%` : `${r.multiplier}x`}</td>
                    <td>
                      {r.monthlySpendDollars === null
                        ? `No better than your ${baseline}% card`
                        : r.overCap
                          ? `More than the ${cap} cap`
                          : `${dollars.format(r.monthlySpendDollars)}/mo`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
