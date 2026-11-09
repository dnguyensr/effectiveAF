// SPDX-License-Identifier: GPL-3.0-or-later
import { useLayoutEffect, useRef, useState } from 'preact/hooks';

interface Props {
  /** Summary, export and Clear all values only make sense with cards in the wallet. */
  hasCards: boolean;
  onShare: () => void;
  onExport: () => void;
  onBackup: () => void;
  onRestore: () => void;
  onClearValues: () => void;
  onStartOver: () => void;
}

/**
 * The data actions, behind an "Options" button on the nav bar. A disclosure (a button that
 * shows a list of buttons) rather than an ARIA menu: Tab moves through the items, and Escape or
 * a click outside closes it.
 */
export function OptionsMenu(props: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Layout effect, so the listeners are in place as soon as the panel shows.
  useLayoutEffect(() => {
    if (!open) return;
    const onPointerDown = (e: Event) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  /** Closes the panel and puts focus back on Options, so a dialog returns focus there. */
  const run = (action: () => void) => () => {
    setOpen(false);
    toggleRef.current?.focus();
    action();
  };

  const item = (label: string, action: () => void, danger = false) => (
    <li class={danger ? 'options-danger' : undefined}>
      <button
        type="button"
        class={danger ? 'options-item options-item-danger' : 'options-item'}
        onClick={run(action)}
      >
        {label}
      </button>
    </li>
  );

  return (
    <div
      class="options"
      ref={rootRef}
      onFocusOut={(e) => {
        // Tabbing out closes it. (A null target means a click on something unfocusable,
        // which the pointerdown listener handles; Safari doesn't focus buttons on click.)
        const next = e.relatedTarget as Node | null;
        if (next && !rootRef.current?.contains(next)) setOpen(false);
      }}
    >
      <button
        type="button"
        class="options-toggle"
        ref={toggleRef}
        aria-expanded={open}
        aria-controls="options-panel"
        onClick={() => setOpen(!open)}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
          <path fill="currentColor" d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" />
        </svg>
        Options
      </button>
      {open && (
        <ul id="options-panel" class="options-panel">
          {props.hasCards && item('Copy summary for forums', props.onShare)}
          {props.hasCards && item('Export spreadsheet (CSV)', props.onExport)}
          {item('Back up', props.onBackup)}
          {item('Restore from backup…', props.onRestore)}
          {props.hasCards && item('Clear all values', props.onClearValues, true)}
          {item('Start over…', props.onStartOver, true)}
        </ul>
      )}
    </div>
  );
}
