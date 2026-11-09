// SPDX-License-Identifier: GPL-3.0-or-later
import type { ComponentChildren } from 'preact';
import { useLayoutEffect, useRef } from 'preact/hooks';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  titleId: string;
  wide?: boolean;
  children: ComponentChildren;
}

/**
 * A native modal <dialog> (focus trap, Escape and backdrop for free). Children mount only while
 * open, so each opening starts fresh.
 */
export function Modal({ open, onClose, title, titleId, wide, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  // Layout effect: open in the same tick as the render, so nothing can interact with a
  // half-open dialog.
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    } else if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      class={wide ? 'dialog dialog-wide' : 'dialog'}
      aria-labelledby={titleId}
      onClose={onClose}
    >
      <div class="dialog-head">
        <h2 id={titleId}>{title}</h2>
        <button type="button" class="btn btn-small" onClick={onClose}>
          Close
        </button>
      </div>
      {open && children}
    </dialog>
  );
}
