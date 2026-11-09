// SPDX-License-Identifier: GPL-3.0-or-later
import { useState } from 'preact/hooks';
import { CADENCES, type Cadence } from '../catalog/types';
import { parseDollarsToCents } from '../core/money';
import { MAX_NAME_LENGTH } from '../state/schema';
import { useStore } from './store-context';

const CADENCE_LABELS: Record<Cadence, string> = {
  monthly: 'per month',
  quarterly: 'per quarter',
  semiannual: 'per half-year',
  annual: 'per year',
  'every-4-years': 'every 4 years',
};

/** Inline form to add your own credit or a non-credit benefit (lounge access, insurance...). */
export function CustomPerkForm({ cardId, cardName }: { cardId: string; cardName: string }) {
  const store = useStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [cadence, setCadence] = useState<Cadence>('annual');
  const [error, setError] = useState<string | null>(null);
  const prefix = `add-perk-${cardId}`;

  if (!open) {
    return (
      <button type="button" class="btn btn-dashed" onClick={() => setOpen(true)}>
        + Add your own perk or benefit
      </button>
    );
  }

  return (
    <form
      class="inline-form"
      aria-label={`Add a perk to ${cardName}`}
      onSubmit={(e) => {
        e.preventDefault();
        const cents = parseDollarsToCents(amount);
        if (!name.trim()) return setError('Give it a name.');
        if (cents === null || cents <= 0) return setError('Enter a dollar amount above $0.');
        const id = store.addCustomPerk(cardId, { name, cadence, amountPerPeriodCents: cents });
        if (!id) return setError('This card already has the maximum number of custom perks.');
        setName('');
        setAmount('');
        setError(null);
        setOpen(false);
      }}
    >
      <p class="hint">
        For credits we don't list, or benefits that aren't credits but are worth something to you,
        such as lounge access, insurance or anniversary points.
      </p>
      <div class="form-row">
        <label for={`${prefix}-name`}>Name</label>
        <input
          id={`${prefix}-name`}
          type="text"
          maxLength={MAX_NAME_LENGTH}
          placeholder="e.g. Lounge access"
          value={name}
          onInput={(e) => setName(e.currentTarget.value)}
        />
      </div>
      <div class="form-row">
        <label for={`${prefix}-amount`}>Worth to you</label>
        <span class="money-input">
          <span aria-hidden="true">$</span>
          <input
            id={`${prefix}-amount`}
            type="text"
            inputMode="decimal"
            value={amount}
            onInput={(e) => setAmount(e.currentTarget.value)}
          />
        </span>
        <label class="visually-hidden" for={`${prefix}-cadence`}>
          How often
        </label>
        <select
          id={`${prefix}-cadence`}
          value={cadence}
          onChange={(e) => setCadence(e.currentTarget.value as Cadence)}
        >
          {CADENCES.map((c) => (
            <option key={c} value={c}>
              {CADENCE_LABELS[c]}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <p class="error" role="alert">
          {error}
        </p>
      )}
      <div class="form-actions">
        <button type="submit" class="btn btn-primary">
          Add
        </button>
        <button
          type="button"
          class="btn"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

/** Form to define a card that isn't in the catalog. */
export function CustomCardForm({ onCreated }: { onCreated: (cardId: string) => void }) {
  const store = useStore();
  const [open, setOpen] = useState(false);
  const [issuer, setIssuer] = useState('');
  const [name, setName] = useState('');
  const [fee, setFee] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button type="button" class="btn btn-dashed" onClick={() => setOpen(true)}>
        + Create a card that isn't listed
      </button>
    );
  }

  return (
    <form
      class="inline-form"
      aria-label="Create a custom card"
      onSubmit={(e) => {
        e.preventDefault();
        const cents = fee.trim() === '' ? 0 : parseDollarsToCents(fee);
        if (!name.trim()) return setError('Give the card a name.');
        if (cents === null) return setError('Enter the annual fee in dollars, or leave it blank.');
        const id = store.addCustomCard({ issuer, name, annualFeeCents: cents });
        if (!id) return setError('You have reached the maximum number of custom cards.');
        setIssuer('');
        setName('');
        setFee('');
        setError(null);
        setOpen(false);
        onCreated(id);
      }}
    >
      <div class="form-row">
        <label for="custom-card-issuer">Issuer (optional)</label>
        <input
          id="custom-card-issuer"
          type="text"
          maxLength={MAX_NAME_LENGTH}
          placeholder="e.g. Citi"
          value={issuer}
          onInput={(e) => setIssuer(e.currentTarget.value)}
        />
      </div>
      <div class="form-row">
        <label for="custom-card-name">Card name</label>
        <input
          id="custom-card-name"
          type="text"
          maxLength={MAX_NAME_LENGTH}
          placeholder="e.g. Strata Premier"
          value={name}
          onInput={(e) => setName(e.currentTarget.value)}
        />
      </div>
      <div class="form-row">
        <label for="custom-card-fee">Annual fee</label>
        <span class="money-input">
          <span aria-hidden="true">$</span>
          <input
            id="custom-card-fee"
            type="text"
            inputMode="decimal"
            value={fee}
            onInput={(e) => setFee(e.currentTarget.value)}
          />
        </span>
      </div>
      {error && (
        <p class="error" role="alert">
          {error}
        </p>
      )}
      <div class="form-actions">
        <button type="submit" class="btn btn-primary">
          Create card
        </button>
        <button
          type="button"
          class="btn"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
