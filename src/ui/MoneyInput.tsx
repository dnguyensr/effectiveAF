// SPDX-License-Identifier: GPL-3.0-or-later
import { useEffect, useRef, useState } from 'preact/hooks';
import { centsToInputValue, parseDollarsToCents } from '../core/money';

interface Props {
  id: string;
  /** Accessible name, e.g. "Resy dining credit: dollars per year". */
  label: string;
  valueCents: number;
  /** Called with parsed cents on every valid keystroke; an empty field commits 0 (or null if `allowEmpty`). */
  onCommit: (cents: number | null) => void;
  disabled?: boolean;
  /** Shown but not editable (still focusable and readable). */
  readOnly?: boolean;
  allowEmpty?: boolean;
}

/**
 * A dollar field that doesn't fight the user: while focused it shows exactly what was typed
 * (so the field can be cleared), and on blur it snaps to the stored value, which the store
 * rounds to whole dollars and may have clamped.
 */
export function MoneyInput({
  id,
  label,
  valueCents,
  onCommit,
  disabled,
  readOnly,
  allowEmpty,
}: Props) {
  const [draft, setDraft] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // When the value changes from elsewhere (a Half/Full button, a preset) and the field isn't
  // being edited, drop any leftover typed text so the field shows the new value.
  useEffect(() => {
    if (document.activeElement !== inputRef.current) setDraft(null);
  }, [valueCents]);

  return (
    <span class={readOnly ? 'money-input money-input-locked' : 'money-input'}>
      <span aria-hidden="true">$</span>
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        aria-label={label}
        disabled={disabled}
        readOnly={readOnly}
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
