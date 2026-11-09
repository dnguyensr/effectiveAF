// SPDX-License-Identifier: GPL-3.0-or-later
import { useState } from 'preact/hooks';
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
  const considering = summary.ownership === 'considering';
  const inWallet = store.state.value.wallet.includes(card.id);
  // The fee rarely changes, so it starts locked against accidental edits.
  const [feeLocked, setFeeLocked] = useState(true);
  const anniversaryMonth = store.state.value.cards[card.id]?.anniversaryMonth;
  // Only ask for the anniversary month when some credit resets on it.
  const usesAnniversary = card.perks.some(
    (p) => p.resetBasis === 'cardmember-year' && p.cadence !== 'every-4-years',
  );

  return (
    <section class="card" data-card-id={card.id} aria-label={card.name}>
      {/* Stays pinned while scrolling through the perks below. */}
      <div class="card-sticky" data-testid={`card-header-${card.id}`}>
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
            considering={considering}
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
      </div>

      <div class="card-body">
        {inWallet && (
          <div class="ownership" role="group" aria-label={`Do you have the ${card.name}?`}>
            <button
              type="button"
              class="chip"
              aria-pressed={!considering}
              onClick={() => store.setOwnership(card.id, 'have')}
            >
              I have this card
            </button>
            <button
              type="button"
              class="chip"
              aria-pressed={considering}
              onClick={() => store.setOwnership(card.id, 'considering')}
            >
              Considering it
            </button>
          </div>
        )}
        {considering && (
          <p class="hint">
            Not counted in your wallet totals. The result shows what the card would cost you in a
            year if you signed up and used the credits as set below.
          </p>
        )}
        <div class="fee-row">
          <label class="fee-label" for={`fee-${card.id}`}>
            {card.custom ? 'Annual fee' : 'Annual fee you pay'}
          </label>
          <MoneyInput
            id={`fee-${card.id}`}
            label={`${card.name} annual fee`}
            valueCents={summary.feeCents}
            allowEmpty
            readOnly={feeLocked}
            onCommit={(cents) => store.setFeeOverride(card.id, cents)}
          />
          <button
            type="button"
            class="btn btn-small lock-button"
            aria-label={`${feeLocked ? 'Unlock' : 'Lock'} ${card.name} annual fee`}
            onClick={() => setFeeLocked(!feeLocked)}
          >
            <LockIcon open={!feeLocked} />
            {feeLocked ? 'Unlock' : 'Lock'}
          </button>
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

        {card.notes && card.notes.length > 0 && (
          <details class="card-notes">
            <summary>Good to know</summary>
            <ul>
              {card.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </details>
        )}

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

function LockIcon({ open }: { open: boolean }) {
  return (
    <svg class="lock-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <rect x="3" y="7" width="10" height="8" rx="1.5" fill="currentColor" />
      <path
        d={open ? 'M5 7V5a3 3 0 0 1 5.8-1' : 'M5 7V5a3 3 0 0 1 6 0v2'}
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
      />
    </svg>
  );
}
