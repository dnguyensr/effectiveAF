// SPDX-License-Identifier: GPL-3.0-or-later
import { useState } from 'preact/hooks';
import type { CardDef } from '../catalog/types';
import type { Ownership } from '../core/card-math';
import { formatUsd } from '../core/money';
import { MAX_COMPARE } from '../state/schema';
import { CustomCardForm } from './CustomForms';
import { Modal } from './Modal';
import { onTabKeyDown } from './navigation';
import { useStore } from './store-context';

export type PickerMode = 'wallet' | 'compare';

interface Props {
  open: boolean;
  mode: PickerMode;
  onClose: () => void;
  /** Called after a card is added to the wallet (to select its tab). */
  onAdded?: ((cardId: string) => void) | undefined;
}

const ALL = 'all';
const YOURS = 'yours';

/** Card chooser shared by the wallet (add cards) and the comparison (pick up to 5). */
export function CardPicker({ open, mode, onClose, onAdded }: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      titleId="picker-title"
      title={mode === 'wallet' ? 'Add a card' : 'Choose cards to compare'}
      wide
    >
      <PickerBody mode={mode} onAdded={onAdded} />
    </Modal>
  );
}

function PickerBody({
  mode,
  onAdded,
}: {
  mode: PickerMode;
  onAdded?: ((id: string) => void) | undefined;
}) {
  const store = useStore();
  const [tab, setTab] = useState(ALL);
  const [query, setQuery] = useState('');
  const cards = store.cards.value;
  const { wallet, compare } = store.state.value;

  const issuers = [...new Set(cards.filter((c) => !c.custom).map((c) => c.issuer))];
  const tabs = [
    { id: ALL, label: 'All' },
    ...issuers.map((issuer) => ({ id: issuer, label: issuer })),
    { id: YOURS, label: 'Your cards' },
  ];
  const tabIds = tabs.map((t) => t.id);
  const tabDomId = (id: string) => `picker-tab-${tabIds.indexOf(id)}`;

  const q = query.trim().toLowerCase();
  const shown = cards.filter((c) => {
    const inTab =
      tab === ALL || (tab === YOURS ? c.custom === true : !c.custom && c.issuer === tab);
    return inTab && (!q || `${c.issuer} ${c.name}`.toLowerCase().includes(q));
  });

  const created = (id: string) => {
    if (mode === 'wallet') {
      store.addCard(id);
      onAdded?.(id);
    } else {
      store.toggleCompare(id);
    }
  };

  return (
    <div class="picker">
      {mode === 'compare' && (
        <p class="hint" role="status">
          {compare.length} of {MAX_COMPARE} selected. Values you set for a card show up in both
          views.
        </p>
      )}
      <label class="visually-hidden" for="picker-search">
        Search cards
      </label>
      <input
        id="picker-search"
        class="picker-search"
        type="search"
        placeholder="Search cards"
        value={query}
        onInput={(e) => setQuery(e.currentTarget.value)}
      />
      <div class="tabs picker-tabs" role="tablist" aria-label="Card issuers">
        {tabs.map((t) => (
          <button
            key={t.id}
            id={tabDomId(t.id)}
            type="button"
            role="tab"
            class="tab"
            aria-selected={tab === t.id}
            aria-controls="picker-panel"
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
            onKeyDown={(e) => onTabKeyDown(e, tabIds, tab, setTab, tabDomId)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div id="picker-panel" role="tabpanel" aria-labelledby={tabDomId(tab)}>
        {shown.length > 0 ? (
          <ul class="picker-list">
            {shown.map((card) => (
              <PickerRow
                key={card.id}
                card={card}
                mode={mode}
                status={
                  wallet.includes(card.id)
                    ? (store.state.value.cards[card.id]?.ownership ?? 'have')
                    : null
                }
                selected={compare.includes(card.id)}
                compareFull={compare.length >= MAX_COMPARE}
                onAdd={(ownership) => {
                  store.addCard(card.id, undefined, ownership);
                  onAdded?.(card.id);
                }}
                onToggle={() => store.toggleCompare(card.id)}
              />
            ))}
          </ul>
        ) : (
          <p class="hint">
            {tab === YOURS && !q ? "You haven't created any cards yet." : 'No cards match.'}
          </p>
        )}
        {tab === YOURS && (
          <div class="picker-create">
            <CustomCardForm onCreated={created} />
          </div>
        )}
      </div>
    </div>
  );
}

interface RowProps {
  card: CardDef;
  mode: PickerMode;
  /** Wallet status if the card is in the wallet, else null. */
  status: Ownership | null;
  selected: boolean;
  compareFull: boolean;
  onAdd: (ownership: Ownership) => void;
  onToggle: () => void;
}

function PickerRow({ card, mode, status, selected, compareFull, onAdd, onToggle }: RowProps) {
  const fullName = card.issuer ? `${card.issuer} ${card.name}` : card.name;
  return (
    <li class="picker-row">
      <div class="picker-info">
        {card.issuer && <span class="card-issuer">{card.issuer}</span>}
        <span class="picker-name">{card.name}</span>
        <span class="hint">
          {formatUsd(card.annualFeeCents)} fee ·{' '}
          {card.perks.length === 0 && !card.custom
            ? 'rewards only, no credits'
            : `${card.perks.length} ${card.perks.length === 1 ? 'perk' : 'perks'}`}
        </span>
      </div>
      {mode === 'wallet' ? (
        status ? (
          <span class="tag">{status === 'considering' ? 'Considering' : 'In wallet'}</span>
        ) : (
          <span class="picker-actions">
            <button
              type="button"
              class="btn btn-primary"
              aria-label={`Add ${fullName}`}
              title="I have this card"
              onClick={() => onAdd('have')}
            >
              Add
            </button>
            <button
              type="button"
              class="btn"
              aria-label={`Considering: add ${fullName}`}
              title="I'm thinking about signing up"
              onClick={() => onAdd('considering')}
            >
              Considering
            </button>
          </span>
        )
      ) : (
        <label class="picker-check">
          <input
            type="checkbox"
            checked={selected}
            disabled={!selected && compareFull}
            aria-label={`Compare ${fullName}`}
            onChange={onToggle}
          />
          <span aria-hidden="true">Compare</span>
        </label>
      )}
    </li>
  );
}
