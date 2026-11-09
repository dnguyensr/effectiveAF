// SPDX-License-Identifier: GPL-3.0-or-later
import { CATALOG } from '../catalog';
import { formatUsd } from '../core/money';
import { useStore } from './store-context';

export function AddCards({ onAdded }: { onAdded: (cardId: string) => void }) {
  const store = useStore();
  const wallet = store.state.value.wallet;
  const available = CATALOG.filter((c) => !wallet.includes(c.id));
  if (available.length === 0) return null;

  return (
    <section class="add-cards" aria-labelledby="add-cards-title">
      <h2 id="add-cards-title">{wallet.length === 0 ? 'Add the cards you have' : 'Add a card'}</h2>
      <ul class="add-grid">
        {available.map((card) => (
          <li key={card.id}>
            <button
              type="button"
              class="add-card"
              onClick={() => {
                store.addCard(card.id);
                onAdded(card.id);
              }}
            >
              {/* Visible text doubles as the accessible name: "Add American Express Gold Card $325 fee". */}
              <span class="add-verb">
                <span aria-hidden="true">+ </span>Add
              </span>{' '}
              <span class="card-issuer">{card.issuer}</span>{' '}
              <span class="add-name">{card.name}</span>{' '}
              <span class="add-fee">{formatUsd(card.annualFeeCents)} fee</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
