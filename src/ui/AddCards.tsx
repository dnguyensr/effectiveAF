// SPDX-License-Identifier: GPL-3.0-or-later
import type { CardDef } from '../catalog/types';
import { formatUsd } from '../core/money';
import { CustomCardForm } from './CustomForms';
import { useStore } from './store-context';

function AddButton({ card, onAdd }: { card: CardDef; onAdd: () => void }) {
  return (
    <button type="button" class="add-card" onClick={onAdd}>
      {/* Visible text doubles as the accessible name: "Add American Express Gold Card $325 fee". */}
      <span class="add-verb">
        <span aria-hidden="true">+ </span>Add
      </span>{' '}
      {card.issuer && (
        <>
          <span class="card-issuer">{card.issuer}</span>{' '}
        </>
      )}
      <span class="add-name">{card.name}</span>{' '}
      <span class="add-fee">{formatUsd(card.annualFeeCents)} fee</span>
    </button>
  );
}

export function AddCards({ onAdded }: { onAdded: (cardId: string) => void }) {
  const store = useStore();
  const wallet = store.state.value.wallet;
  const available = store.cards.value.filter((c) => !wallet.includes(c.id));
  const add = (id: string) => {
    store.addCard(id);
    onAdded(id);
  };

  return (
    <section class="add-cards" aria-labelledby="add-cards-title">
      <h2 id="add-cards-title">{wallet.length === 0 ? 'Add the cards you have' : 'Add a card'}</h2>
      {available.length > 0 && (
        <ul class="add-grid">
          {available.map((card) => (
            <li key={card.id} class={card.custom ? 'add-custom' : undefined}>
              <AddButton card={card} onAdd={() => add(card.id)} />
              {card.custom && (
                <button
                  type="button"
                  class="link-button"
                  aria-label={`Delete ${card.name} permanently`}
                  onClick={() => {
                    if (confirm(`Delete “${card.name}” and everything you entered for it?`)) {
                      store.deleteCustomCard(card.id);
                    }
                  }}
                >
                  Delete
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <div class="add-custom-form">
        <CustomCardForm onCreated={onAdded} />
      </div>
    </section>
  );
}
