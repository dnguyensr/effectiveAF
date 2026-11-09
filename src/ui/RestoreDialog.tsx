// SPDX-License-Identifier: GPL-3.0-or-later
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { MAX_IMPORT_CHARS, parseImport, type ImportResult } from '../state/import-export';
import { useStore } from './store-context';

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Restores a backup file or pasted backup text, after showing what it contains. */
export function RestoreDialog({ open, onClose }: Props) {
  const store = useStore();
  const ref = useRef<HTMLDialogElement>(null);
  const [pasted, setPasted] = useState('');
  const [checked, setChecked] = useState<ImportResult | null>(null);
  const [restored, setRestored] = useState(false);
  // Bumped on close to remount the restore form, which also clears the file input.
  const [formKey, setFormKey] = useState(0);

  // Layout effect: open the dialog in the same tick it renders, so nothing can interact with
  // a half-open dialog.
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

  // Clear the form when the dialog closes (Close button, Escape), never while it's opening:
  // resetting on open raced with a file being chosen and could wipe it.
  function handleClose() {
    setPasted('');
    setChecked(null);
    setRestored(false);
    setFormKey((k) => k + 1);
    onClose();
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_IMPORT_CHARS) {
      setChecked(parseImport('x'.repeat(MAX_IMPORT_CHARS + 1)));
      return;
    }
    const text = await file.text();
    setPasted(text);
    setChecked(parseImport(text));
  }

  return (
    <dialog ref={ref} class="dialog" aria-labelledby="restore-title" onClose={handleClose}>
      <h2 id="restore-title">Restore from backup</h2>

      <section key={formKey}>
        <p class="hint">
          Choose a backup file you downloaded with Options → Back up, or paste its text.
        </p>
        <label class="file-label">
          Choose a backup file
          <input
            type="file"
            accept="application/json,.json"
            onChange={(e) => void onFile(e.currentTarget.files?.[0])}
          />
        </label>
        <label class="paste-label" for="backup-paste">
          Or paste backup text
        </label>
        <textarea
          id="backup-paste"
          rows={5}
          spellcheck={false}
          value={pasted}
          onInput={(e) => {
            setPasted(e.currentTarget.value);
            setChecked(null);
          }}
        />
        <button
          type="button"
          class="btn"
          disabled={pasted.trim() === ''}
          onClick={() => setChecked(parseImport(pasted))}
        >
          Check backup
        </button>

        {checked && !checked.ok && (
          <p class="error" role="alert">
            {checked.message}
          </p>
        )}
        {checked?.ok && !restored && (
          <div class="confirm" role="status">
            <p>
              This backup has {checked.cardCount} {checked.cardCount === 1 ? 'card' : 'cards'} and{' '}
              {checked.valuationCount} saved {checked.valuationCount === 1 ? 'value' : 'values'}.
              Restoring replaces everything you have now.
            </p>
            <button
              type="button"
              class="btn btn-danger"
              onClick={() => {
                store.replaceState(checked.state);
                setRestored(true);
              }}
            >
              Replace my data
            </button>
          </div>
        )}
        {restored && (
          <p class="success" role="status">
            Backup restored.
          </p>
        )}
      </section>

      <div class="dialog-actions">
        <button type="button" class="btn" onClick={handleClose}>
          Close
        </button>
      </div>
    </dialog>
  );
}
