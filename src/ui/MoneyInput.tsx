// SPDX-License-Identifier: GPL-3.0-or-later
import { useState } from 'preact/hooks';
import { centsToInputValue, parseDollarsToCents } from '../core/money';

interface Props {
  id: string;
  /** Accessible name, e.g. "Resy dining credit: dollars per year". */
  label: string;
  valueCents: number;
  /** Called with parsed cents on every valid keystroke; an empty field commits 0 (or null if `allowEmpty`). */
  onCommit: (cents: number | null) => void;
  disabled?: boolean;
  allowEmpty?: boolean;
}

/**
 * A dollar field that doesn't fight the user: while focused it shows exactly what was typed
 * (so the field can be cleared or contain "12."), and on blur it snaps to the stored value,
 * which the store may have clamped.
 */
export function MoneyInput({ id, label, valueCents, onCommit, disabled, allowEmpty }: Props) {
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <span class="money-input">
      <span aria-hidden="true">$</span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        aria-label={label}
        disabled={disabled}
        value={draft ?? centsToInputValue(valueCents)}
        onInput={(e) => {
          const text = e.currentTarget.value;
          setDraft(text);
          if (text.trim() === '') {
            onCommit(allowEmpty ? null : 0);
            return;
          }
          const cents = parseDollarsToCents(text);
          if (cents !== null) onCommit(cents);
        }}
        onBlur={() => setDraft(null)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
      />
    </span>
  );
}
