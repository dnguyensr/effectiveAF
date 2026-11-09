// SPDX-License-Identifier: GPL-3.0-or-later
import { useEffect, useState } from 'preact/hooks';
import { formatUsd } from '../core/money';
import { PRESETS, type PresetId } from '../core/presets';
import type { Store } from '../state/store';
import { CardPanel } from './CardPanel';
import { onTabKeyDown } from './navigation';
import { useStore } from './store-context';
import { ResettingSoon } from './ResettingSoon';
import { WalletSummary } from './WalletSummary';

const UNDO_MS = 8000;

interface Props {
  activeCardId: string | null;
  onSelect: (cardId: string) => void;
  onAddCard: () => void;
}

const tabDomId = (cardId: string) => `wallet-tab-${cardId}`;

/** The cards you hold: a summary, one tab per card, and the selected card's details. */
export function WalletView({ activeCardId, onSelect, onAddCard }: Props) {
  const store = useStore();
  const summary = store.summary.value;
  const [removed, setRemoved] = useState<{ cardId: string; index: number } | null>(null);

  useEffect(() => {
    if (!removed) return;
    const timer = setTimeout(() => setRemoved(null), UNDO_MS);
    return () => clearTimeout(timer);
  }, [removed]);

  const ids = summary.cards.map((c) => c.card.id);
  const active = summary.cards.find((c) => c.card.id === activeCardId) ?? summary.cards[0] ?? null;

  return (
    <section class="view" aria-labelledby="wallet-title">
      <h2 id="wallet-title" class="view-title">
        My wallet
      </h2>
      {summary.cards.length === 0 ? (
        <div class="empty">
          <p>Your wallet is empty. Add the cards you pay an annual fee for.</p>
          <button type="button" class="btn btn-primary" onClick={onAddCard}>
            Add a card
          </button>
        </div>
      ) : (
        <>
          <WalletSummary summary={summary} />
          <ResettingSoon onSelectCard={onSelect} />
          <div class="tab-row">
            <div class="tabs wallet-tabs" role="tablist" aria-label="Your cards">
              {summary.cards.map((c) => (
                <button
                  key={c.card.id}
                  id={tabDomId(c.card.id)}
                  type="button"
                  role="tab"
                  class="tab wallet-tab"
                  aria-selected={c.card.id === active?.card.id}
                  aria-controls="wallet-panel"
                  tabIndex={c.card.id === active?.card.id ? 0 : -1}
                  onClick={() => onSelect(c.card.id)}
                  onKeyDown={(e) => onTabKeyDown(e, ids, active?.card.id ?? '', onSelect, tabDomId)}
                >
                  <span class="tab-name">{c.card.name}</span>
                  <span class={`tab-verdict ${c.verdict}`}>
                    {c.verdict === 'costs'
                      ? `${formatUsd(c.effectiveCents)}/yr`
                      : `+${formatUsd(-c.effectiveCents)}`}
                  </span>
                  {c.unsetCount > 0 && <span class="tab-unset">{c.unsetCount} not set</span>}
                </button>
              ))}
            </div>
            <button type="button" class="btn btn-dashed" onClick={onAddCard}>
              + Add card
            </button>
          </div>
          {active && (
            <div id="wallet-panel" role="tabpanel" aria-labelledby={tabDomId(active.card.id)}>
              <CardPanel
                key={active.card.id}
                summary={active}
                onRemove={(cardId) => {
                  const index = store.removeCard(cardId);
                  setRemoved({ cardId, index });
                }}
              />
            </div>
          )}
          {summary.cards.length > 1 && <WalletPreset store={store} />}
        </>
      )}

      {removed && (
        <div class="toast" role="status">
          <span>Removed {store.findCard(removed.cardId)?.name ?? 'card'}.</span>
          <button
            type="button"
            class="link-button"
            onClick={() => {
              store.addCard(removed.cardId, removed.index);
              onSelect(removed.cardId);
              setRemoved(null);
            }}
          >
            Undo
          </button>
        </div>
      )}
    </section>
  );
}

function WalletPreset({ store }: { store: Store }) {
  const [preset, setPreset] = useState<PresetId>('face');
  const chosen = PRESETS.find((p) => p.id === preset);
  return (
    <div class="wallet-preset">
      <label for="wallet-preset">Set every card to</label>
      <select
        id="wallet-preset"
        value={preset}
        onChange={(e) => setPreset(e.currentTarget.value as PresetId)}
      >
        {PRESETS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        class="btn"
        onClick={() => {
          if (confirm(`Set every card to “${chosen?.label}”? ${chosen?.description}`)) {
            store.applyPresetToWallet(preset);
          }
        }}
      >
        Apply
      </button>
    </div>
  );
}
