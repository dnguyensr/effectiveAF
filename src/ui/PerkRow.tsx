// SPDX-License-Identifier: GPL-3.0-or-later
import type { PerkSummary } from '../core/card-math';
import { formatIsoDate } from '../core/dates';
import { formatUsd, toWholeDollars } from '../core/money';
import { percentOfNominal, realizedCents } from '../core/valuation';
import { MoneyInput } from './MoneyInput';
import { useStore } from './store-context';

/** A cleared dollar field counts as $0 (these fields never allow an empty value). */
const orZero = (cents: number | null) => cents ?? 0;

interface Props {
  cardId: string;
  summary: PerkSummary;
  /** yyyy-mm-dd of the next reset, "anniversary" if it depends on an unknown month, or null. */
  nextReset: string | null;
}

/**
 * One perk with its three states: not set (the starting state, $0), using (a value set with the
 * slider, the dollar field, or the Half / Full buttons) and won't use (an explicit $0; pressing
 * it again clears the perk back to not set).
 */
export function PerkRow({ cardId, summary, nextReset }: Props) {
  const store = useStore();
  const { perk, nominalCents, status } = summary;
  const domId = perk.id.replace(/\./g, '--');

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
          <span>{perk.userValued ? 'your value/yr' : `of ${formatUsd(nominalCents)}/yr`}</span>
        </div>
      </div>
      {perk.userValued ? (
        <UserValuedControls cardId={cardId} summary={summary} domId={domId} />
      ) : (
        <FaceValueControls cardId={cardId} summary={summary} domId={domId} />
      )}
    </li>
  );
}

interface ControlProps {
  cardId: string;
  summary: PerkSummary;
  domId: string;
}

/** "Won't use" toggles between an explicit $0 and not set. */
function WontUseChip({ cardId, summary }: Omit<ControlProps, 'domId'>) {
  const store = useStore();
  const { perk, status } = summary;
  return (
    <button
      type="button"
      class="chip"
      aria-pressed={status === 'skipped'}
      title={status === 'skipped' ? 'Press again to clear (not set)' : 'Counts $0'}
      onClick={() =>
        status === 'skipped' ? store.clearPerk(cardId, perk.id) : store.skipPerk(cardId, perk.id)
      }
    >
      Won't use
    </button>
  );
}

/**
 * A benefit with no face value (free night, companion fare): the user types what it's worth to
 * them, up to the perk's limit. No slider or Half/Full, since there's nothing to take a share of.
 */
function UserValuedControls({ cardId, summary, domId }: ControlProps) {
  const store = useStore();
  const { perk, valuation, capCents } = summary;
  const shownCents = realizedCents(capCents, valuation && { ...valuation, enabled: true });
  return (
    <>
      {perk.valueHint && (
        <p class="hint perk-hint" id={`${domId}-hint`}>
          {perk.valueHint} Up to {formatUsd(capCents)}.
        </p>
      )}
      <div class="perk-controls perk-controls-user">
        <MoneyInput
          id={`${domId}-dollars`}
          label={`${perk.name}: what it's worth to you per year, in dollars`}
          valueCents={shownCents}
          onCommit={(cents) => store.setPerkDollars(cardId, perk.id, orZero(cents))}
        />
      </div>
      <div class="perk-quick" role="group" aria-label={`${perk.name}: quick values`}>
        <WontUseChip cardId={cardId} summary={summary} />
      </div>
    </>
  );
}

function FaceValueControls({ cardId, summary, domId }: ControlProps) {
  const store = useStore();
  const { perk, nominalCents, valuation, status } = summary;

  // Value shown in the slider and dollar field (0 when not set or won't use).
  const shownCents = realizedCents(nominalCents, valuation && { ...valuation, enabled: true });
  const percent = percentOfNominal(shownCents, nominalCents);
  const halfCents = toWholeDollars(nominalCents / 2);
  const isFull = status === 'using' && summary.realizedCents === nominalCents;
  const isHalf = status === 'using' && !isFull && summary.realizedCents === halfCents;

  return (
    <>
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
          onCommit={(cents) => store.setPerkDollars(cardId, perk.id, orZero(cents))}
        />
      </div>
      <div class="perk-quick" role="group" aria-label={`${perk.name}: quick values`}>
        <WontUseChip cardId={cardId} summary={summary} />
        <button
          type="button"
          class="chip"
          aria-pressed={isHalf}
          onClick={() => store.setPerkPercent(cardId, perk.id, 50)}
        >
          Half ({formatUsd(halfCents)})
        </button>
        <button
          type="button"
          class="chip"
          aria-pressed={isFull}
          onClick={() => store.setPerkPercent(cardId, perk.id, 100)}
        >
          Full ({formatUsd(nominalCents)})
        </button>
      </div>
    </>
  );
}
