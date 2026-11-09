// SPDX-License-Identifier: GPL-3.0-or-later
import { useState } from 'preact/hooks';
import { walletMarkdown } from '../core/share';
import { Modal } from './Modal';
import { useStore } from './store-context';

/** A copyable Markdown summary for forums. Nothing leaves the device unless the user pastes it. */
export function ShareDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Share a summary" titleId="share-title" wide>
      <ShareBody />
    </Modal>
  );
}

function ShareBody() {
  const store = useStore();
  const text = walletMarkdown(store.summary.value, store.asOf);
  const [status, setStatus] = useState<string | null>(null);

  return (
    <div class="share">
      <p class="hint">
        Markdown for Reddit or other forums, e.g. when asking whether to keep a card. Only what you
        paste is shared.
      </p>
      <label class="visually-hidden" for="share-text">
        Summary text
      </label>
      <textarea
        id="share-text"
        rows={12}
        readOnly
        value={text}
        onFocus={(e) => e.currentTarget.select()}
      />
      <div class="form-actions">
        <button
          type="button"
          class="btn btn-primary"
          onClick={() => {
            navigator.clipboard
              .writeText(text)
              .then(() => setStatus('Copied to clipboard.'))
              .catch(() => setStatus("Couldn't copy automatically: select the text and copy it."));
          }}
        >
          Copy to clipboard
        </button>
        {status && (
          <p class="hint" role="status">
            {status}
          </p>
        )}
      </div>
    </div>
  );
}
