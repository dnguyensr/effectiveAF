// SPDX-License-Identifier: GPL-3.0-or-later
import { useState } from 'preact/hooks';
import type { CardSummary } from '../core/card-math';
import { formatIsoDate } from '../core/dates';
import { formatUsd } from '../core/money';
import { PRESETS } from '../core/presets';
import { CustomPerkForm } from './CustomForms';
import { MoneyInput } from './MoneyInput';
import { PerkRow } from './PerkRow';
import { useStore } from './store-context';
import { VerdictPill } from './VerdictPill';

interface Props {
  summary: CardSummary;
  onRemove: (cardId: string) => void;
  initiallyOpen?: boolean;
}

export function CardPanel({ summary, onRemove, initiallyOpen = false }: Props) {
  const store = useStore();
  const [open, setOpen] = useState(initiallyOpen);
  const { card } = summary;
  const bodyId = `card-${card.id}-body`;

  return (
    <section class="card" data-card-id={card.id} aria-labelledby={`card-${card.id}-title`}>
      <div class="card-head">
        <h3 class="card-title">
          <button
            type="button"
            class="card-toggle"
            aria-expanded={open}
            aria-controls={bodyId}
            onClick={() => setOpen(!open)}
          >
            {card.issuer && <span class="card-issuer">{card.issuer}</span>}
            <span class="card-name" id={`card-${card.id}-title`}>
              {card.name}
            </span>
            <span class="chevron" aria-hidden="true">
              {open ? '▾' : '▸'}
            </span>
          </button>
        </h3>
        <VerdictPill
          effectiveCents={summary.effectiveCents}
          verdict={summary.verdict}
          testId={`verdict-${card.id}`}
        />
      </div>
      <p class="card-stats">
        {formatUsd(summary.feeCents)} fee · {formatUsd(summary.realizedCents)} of{' '}
        {formatUsd(summary.nominalCents)} in credits used
      </p>

      {open && (
        <div class="card-body" id={bodyId}>
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
                <PerkRow key={p.perk.id} cardId={card.id} summary={p} />
              ))}
            </ul>
          ) : (
            <p class="hint">No perks yet. Add the credits and benefits this card gives you.</p>
          )}

          <div class="add-perk">
            <CustomPerkForm cardId={card.id} cardName={card.name} />
          </div>

          <div class="card-actions">
            <button type="button" class="btn" onClick={() => store.resetCard(card.id)}>
              Reset this card
            </button>
            <button type="button" class="btn btn-danger" onClick={() => onRemove(card.id)}>
              Remove card
            </button>
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
      )}
    </section>
  );
}
