// SPDX-License-Identifier: GPL-3.0-or-later
import type { PerkSummary } from '../core/card-math';
import { formatIsoDate } from '../core/dates';
import { formatUsd } from '../core/money';
import { percentOfNominal, realizedCents } from '../core/valuation';
import { MoneyInput } from './MoneyInput';
import { useStore } from './store-context';

interface Props {
  cardId: string;
  summary: PerkSummary;
  /** yyyy-mm-dd of the next reset, "anniversary" if it depends on an unknown month, or null. */
  nextReset: string | null;
}

/**
 * One perk with its three states: not set (the starting state, $0), using (any value set with
 * the slider or dollar field) and won't use (an explicit $0 that remembers the last value).
 */
export function PerkRow({ cardId, summary, nextReset }: Props) {
  const store = useStore();
  const { perk, nominalCents, valuation, status } = summary;
  const domId = perk.id.replace(/\./g, '--');

  // For "won't use", keep showing the remembered value in the controls.
  const shownCents = realizedCents(nominalCents, valuation && { ...valuation, enabled: true });
  const percent = percentOfNominal(shownCents, nominalCents);

  return (
    <li class={`perk perk-${status}`} data-perk-id={perk.id}>
      <div class="perk-top">
        <div class="perk-info">
          <h4 class="perk-name" id={`${domId}-name`}>
            {perk.name}
          </h4>
          <div class="perk-tags">
            <span class="tag tag-cadence">{perk.cadenceLabel}</span>
            {perk.requiresEnrollment && <span class="tag">Enrollment required</span>}
            {nextReset && (
              <span class="tag tag-reset">
                {nextReset === 'anniversary'
                  ? 'Resets on your account anniversary'
                  : `Resets ${formatIsoDate(nextReset)}`}
              </span>
            )}
            {perk.endsOn && <span class="tag">Ends {formatIsoDate(perk.endsOn)}</span>}
            {perk.custom && <span class="tag tag-custom">Yours</span>}
          </div>
          <p class="perk-desc">
            {perk.description}
            {perk.custom && (
              <>
                {' '}
                <button
                  type="button"
                  class="link-button"
                  aria-label={`Delete ${perk.name}`}
                  onClick={() => store.removeCustomPerk(cardId, perk.id)}
                >
                  Delete
                </button>
              </>
            )}
          </p>
        </div>
        <div class="perk-value" data-testid={`realized-${perk.id}`}>
          <strong>
            {status === 'unset'
              ? 'Not set'
              : status === 'skipped'
                ? "Won't use"
                : formatUsd(summary.realizedCents)}
          </strong>
          <span>of {formatUsd(nominalCents)}/yr</span>
        </div>
      </div>
      <div class="perk-controls">
        <input
          class="perk-range"
          type="range"
          min={0}
          max={100}
          step={1}
          value={percent}
          aria-label={`${perk.name}: percent of face value you'll use`}
          aria-valuetext={status === 'unset' ? 'Not set' : `${percent}% (${formatUsd(shownCents)})`}
          onInput={(e) => store.setPerkPercent(cardId, perk.id, Number(e.currentTarget.value))}
        />
        <span class="perk-percent" aria-hidden="true">
          {percent}%
        </span>
        <MoneyInput
          id={`${domId}-dollars`}
          label={`${perk.name}: dollars per year you'll use`}
          valueCents={shownCents}
          onCommit={(cents) => store.setPerkDollars(cardId, perk.id, cents ?? 0)}
        />
        <label class="switch">
          <input
            type="checkbox"
            checked={status === 'skipped'}
            aria-label={`Won't use ${perk.name}`}
            onChange={(e) => store.setPerkEnabled(cardId, perk.id, !e.currentTarget.checked)}
          />
          <span class="switch-label" aria-hidden="true">
            Won't use
          </span>
        </label>
      </div>
    </li>
  );
}
