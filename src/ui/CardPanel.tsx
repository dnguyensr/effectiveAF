// SPDX-License-Identifier: GPL-3.0-or-later
import type { CardSummary } from '../core/card-math';
import { formatIsoDate } from '../core/dates';
import { formatUsd } from '../core/money';
import { PRESETS } from '../core/presets';
import { nextResetDate } from '../core/resets';
import { BreakEven } from './BreakEven';
import { CustomPerkForm } from './CustomForms';
import { MoneyInput } from './MoneyInput';
import { PerkRow } from './PerkRow';
import { useStore } from './store-context';
import { VerdictPill } from './VerdictPill';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

interface Props {
  summary: CardSummary;
  /** Shows a "Remove card" button (wallet only). */
  onRemove?: (cardId: string) => void;
  /** Hide the card's own heading when the surrounding dialog already names it. */
  showTitle?: boolean;
}

/** Everything about one card: fee, perk values, presets, custom perks. */
export function CardPanel({ summary, onRemove, showTitle = true }: Props) {
  const store = useStore();
  const { card } = summary;
  const anniversaryMonth = store.state.value.cards[card.id]?.anniversaryMonth;
  // Only ask for the anniversary month when some credit resets on it.
  const usesAnniversary = card.perks.some(
    (p) => p.resetBasis === 'cardmember-year' && p.cadence !== 'every-4-years',
  );

  return (
    <section class="card" data-card-id={card.id} aria-label={card.name}>
      <div class="card-head">
        {showTitle ? (
          <h3 class="card-title">
            {card.issuer && <span class="card-issuer">{card.issuer}</span>}
            <span class="card-name">{card.name}</span>
          </h3>
        ) : (
          <span />
        )}
        <VerdictPill
          effectiveCents={summary.effectiveCents}
          verdict={summary.verdict}
          testId={`verdict-${card.id}`}
        />
      </div>
      <p class="card-stats">
        {formatUsd(summary.feeCents)} fee · {formatUsd(summary.realizedCents)} of{' '}
        {formatUsd(summary.nominalCents)} in credits used
        {summary.unsetCount > 0 && (
          <span class="unset-note">
            {' '}
            · {summary.unsetCount} of {summary.perks.length} not set yet
          </span>
        )}
      </p>

      <div class="card-body">
        <div class="fee-row">
          <label class="fee-label" for={`fee-${card.id}`}>
            {card.custom ? 'Annual fee' : 'Annual fee you pay'}
          </label>
          <MoneyInput
            id={`fee-${card.id}`}
            label={`${card.name} annual fee`}
            valueCents={summary.feeCents}
            allowEmpty
            onCommit={(cents) => store.setFeeOverride(card.id, cents)}
          />
          {summary.isFeeOverridden && (
            <>
              <span class="tag tag-custom">Custom</span>
              <button
                type="button"
                class="link-button"
                onClick={() => store.setFeeOverride(card.id, null)}
              >
                Use standard {formatUsd(card.annualFeeCents)}
              </button>
            </>
          )}
        </div>
        {!card.custom && (
          <p class="hint">Change this for a retention offer, waived fee or grandfathered rate.</p>
        )}
        {usesAnniversary && (
          <div class="fee-row">
            <label class="fee-label" for={`anniversary-${card.id}`}>
              Account opened in
            </label>
            <select
              id={`anniversary-${card.id}`}
              class="month-select"
              value={anniversaryMonth ?? ''}
              onChange={(e) => {
                const v = e.currentTarget.value;
                store.setAnniversaryMonth(card.id, v === '' ? null : Number(v));
              }}
            >
              <option value="">Not set</option>
              {MONTHS.map((name, i) => (
                <option key={name} value={i + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        )}

        {card.perks.some((p) => !p.custom) && (
          <div class="preset-bar" role="group" aria-label={`Quick-set ${card.name} credits`}>
            <span class="preset-label">Quick set:</span>
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                class="btn btn-small"
                title={preset.description}
                onClick={() => store.applyPreset(card.id, preset.id)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}

        {summary.perks.length > 0 ? (
          <ul class="perk-list">
            {summary.perks.map((p) => (
              <PerkRow
                key={p.perk.id}
                cardId={card.id}
                summary={p}
                nextReset={
                  nextResetDate(p.perk, store.asOf, anniversaryMonth) ??
                  (p.perk.resetBasis === 'cardmember-year' && p.perk.cadence !== 'every-4-years'
                    ? 'anniversary'
                    : null)
                }
              />
            ))}
          </ul>
        ) : (
          <p class="hint">No perks yet. Add the credits and benefits this card gives you.</p>
        )}

        <div class="add-perk">
          <CustomPerkForm cardId={card.id} cardName={card.name} />
        </div>

        <BreakEven summary={summary} />

        <div class="card-actions">
          <button type="button" class="btn" onClick={() => store.resetCard(card.id)}>
            Clear this card
          </button>
          {onRemove && (
            <button type="button" class="btn btn-danger" onClick={() => onRemove(card.id)}>
              Remove from wallet
            </button>
          )}
        </div>
        {card.lastVerified && card.sourceUrl ? (
          <p class="source">
            Card data checked {formatIsoDate(card.lastVerified)} ·{' '}
            <a href={card.sourceUrl} target="_blank" rel="noopener noreferrer">
              {card.issuer} card page
            </a>
          </p>
        ) : (
          <p class="source">A card you created.</p>
        )}
      </div>
    </section>
  );
}
