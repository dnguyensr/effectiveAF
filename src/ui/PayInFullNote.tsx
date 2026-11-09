// SPDX-License-Identifier: GPL-3.0-or-later
import { useLayoutEffect, useState } from 'preact/hooks';

export const INTEREST_WARNING =
  'Carrying a balance means paying interest, often 20–30% APR. On a $2,000 balance that is about $400–600 a year, more than most cards’ credits and rewards are worth.';

const SHORT = 'Assumes you pay the statement balance in full every month.';

interface Props {
  /** Unique within the page, e.g. "amex-gold-header". */
  id: string;
  /** false: the user said "Not always"; undefined: not answered yet. */
  paysInFull: false | undefined;
  /** Who the note is about: "this card" or "these totals". */
  subject?: string;
}

/**
 * The asterisk shown next to a result that assumes paying in full. A toggletip: tap or click
 * (or Enter/Space) opens the explanation, Escape or a second press closes it, and hovering
 * shows the short version as a native tooltip.
 */
export function PayInFullNote({ id, paysInFull, subject = 'this card' }: Props) {
  const [open, setOpen] = useState(false);
  const noteId = `pay-note-${id}`;

  // Escape closes it wherever focus is: Safari doesn't focus a button when it's clicked, so a
  // key handler on the button alone would miss Escape there. A layout effect attaches the
  // listener before the next paint, so an Escape pressed right after opening isn't missed.
  useLayoutEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  return (
    <span class="pay-asterisk">
      <button
        type="button"
        class="asterisk-button"
        aria-label="Why the asterisk?"
        aria-expanded={open}
        aria-controls={noteId}
        title={SHORT}
        onClick={() => setOpen(!open)}
      >
        *
      </button>
      {open && (
        <span id={noteId} class="pay-note" role="note">
          {paysInFull === false
            ? `You said you won’t always pay ${subject} in full. These numbers assume you do. `
            : `${SHORT} You haven’t confirmed that for ${subject} yet. `}
          {INTEREST_WARNING}
        </span>
      )}
    </span>
  );
}
