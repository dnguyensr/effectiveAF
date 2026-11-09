// SPDX-License-Identifier: GPL-3.0-or-later
import { useLayoutEffect, useRef, useState } from 'preact/hooks';

export const INTEREST_WARNING =
  'Carrying a balance means paying interest, often 20–30% APR. On a $2,000 balance that is about $400–600 a year, more than most cards’ credits and rewards are worth.';

const SHORT = 'Assumes you pay the statement balance in full every month.';

/** Widest the note gets (36rem at 16px), and its gap from the screen edges. */
const MAX_WIDTH = 576;
const EDGE = 16;

interface Props {
  /** Unique within the page, e.g. "amex-gold-header". */
  id: string;
  /** false: the user said "Not always"; undefined: not answered yet. */
  paysInFull: false | undefined;
  /** Who the note is about: "this card" or "these totals". */
  subject?: string;
}

interface Placement {
  top: number;
  left: number;
  width: number;
}

/**
 * The asterisk shown next to a result that assumes paying in full. A toggletip: tap or click
 * (or Enter/Space) opens the explanation; its Close button, Escape, a second press or a tap
 * anywhere else closes it. Hovering shows the short version as a native tooltip.
 *
 * The note floats over the page (fixed, placed under the asterisk and kept on screen) rather
 * than in the layout: in the card header it used to squeeze the title, and inside the
 * comparison table's scroll area it would be clipped.
 */
export function PayInFullNote({ id, paysInFull, subject = 'this card' }: Props) {
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState<Placement | null>(null);
  const rootRef = useRef<HTMLSpanElement>(null);
  const starRef = useRef<HTMLButtonElement>(null);
  const noteId = `pay-note-${id}`;

  // Layout effect: listeners and placement are ready before the next paint, so an Escape
  // pressed right after opening isn't missed and the note never flashes in the wrong spot.
  // Escape is listened for on the document: Safari doesn't focus a button when it's clicked.
  useLayoutEffect(() => {
    if (!open) return;
    // The asterisk is always mounted while its note is open.
    const button = starRef.current as HTMLButtonElement;
    const reposition = () => {
      const star = button.getBoundingClientRect();
      const viewport = document.documentElement.clientWidth;
      const width = Math.max(0, Math.min(MAX_WIDTH, viewport - 2 * EDGE));
      const centered = star.left + star.width / 2 - width / 2;
      setPlace({
        top: star.bottom + 6,
        left: Math.max(EDGE, Math.min(centered, viewport - EDGE - width)),
        width,
      });
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onPointerDown = (e: Event) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    reposition();
    // Capture, so scrolling inside the comparison table moves the note too.
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  return (
    <span class="pay-asterisk" ref={rootRef}>
      <button
        type="button"
        class="asterisk-button"
        ref={starRef}
        aria-label="Why the asterisk?"
        aria-expanded={open}
        aria-controls={noteId}
        title={SHORT}
        onClick={() => setOpen(!open)}
      >
        *
      </button>
      {open && (
        <span
          id={noteId}
          class="pay-note"
          role="note"
          style={
            place
              ? { top: `${place.top}px`, left: `${place.left}px`, width: `${place.width}px` }
              : undefined
          }
        >
          <span>
            {paysInFull === false
              ? `You said you won’t always pay ${subject} in full. These numbers assume you do. `
              : `${SHORT} You haven’t confirmed that for ${subject} yet. `}
            {INTEREST_WARNING}
          </span>
          <button
            type="button"
            class="btn btn-small pay-note-close"
            onClick={() => {
              setOpen(false);
              starRef.current?.focus();
            }}
          >
            Close
          </button>
        </span>
      )}
    </span>
  );
}
