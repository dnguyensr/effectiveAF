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
}

export function PerkRow({ cardId, summary }: Props) {
  const store = useStore();
  const { perk, nominalCents, valuation, enabled } = summary;
  const domId = perk.id.replace(/\./g, '--');

  // While a perk is switched off, keep showing (greyed) what it would be worth if switched on.
  const shownCents = enabled
    ? summary.realizedCents
    : realizedCents(nominalCents, valuation && { ...valuation, enabled: true }, perk.defaultRatio);
  const percent = percentOfNominal(shownCents, nominalCents);

  return (
    <li class={`perk${enabled ? '' : ' perk-off'}`} data-perk-id={perk.id}>
      <div class="perk-top">
        <div class="perk-info">
          <h4 class="perk-name" id={`${domId}-name`}>
            {perk.name}
          </h4>
          <div class="perk-tags">
            <span class="tag tag-cadence">{perk.cadenceLabel}</span>
            {perk.requiresEnrollment && <span class="tag">Enrollment required</span>}
            {perk.endsOn && <span class="tag">Ends {formatIsoDate(perk.endsOn)}</span>}
          </div>
          <p class="perk-desc">{perk.description}</p>
        </div>
        <div class="perk-value" data-testid={`realized-${perk.id}`}>
          <strong>{formatUsd(enabled ? summary.realizedCents : 0)}</strong>
          <span>of {formatUsd(nominalCents)}/yr</span>
        </div>
      </div>
      <div class="perk-controls">
        <label class="switch">
          <input
            type="checkbox"
            checked={enabled}
            aria-label={`Use ${perk.name}`}
            onChange={(e) => store.setPerkEnabled(cardId, perk.id, e.currentTarget.checked)}
          />
          <span class="switch-label" aria-hidden="true">
            {enabled ? 'Using' : 'Not using'}
          </span>
        </label>
        <input
          class="perk-range"
          type="range"
          min={0}
          max={100}
          step={1}
          value={percent}
          disabled={!enabled}
          aria-label={`${perk.name}: percent of face value you'll use`}
          aria-valuetext={`${percent}% (${formatUsd(shownCents)})`}
          onInput={(e) => store.setPerkPercent(cardId, perk.id, Number(e.currentTarget.value))}
        />
        <span class="perk-percent" aria-hidden="true">
          {percent}%
        </span>
        <MoneyInput
          id={`${domId}-dollars`}
          label={`${perk.name}: dollars per year you'll use`}
          valueCents={shownCents}
          disabled={!enabled}
          onCommit={(cents) => store.setPerkDollars(cardId, perk.id, cents ?? 0)}
        />
      </div>
    </li>
  );
}
