// SPDX-License-Identifier: GPL-3.0-or-later
import { Modal } from './Modal';

interface Props {
  open: boolean;
  onClose: () => void;
  onBackup: () => void;
  onErase: () => void;
}

/** Confirms a full reset, listing what goes and offering a backup first. */
export function StartOverDialog({ open, onClose, onBackup, onErase }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Start over?" titleId="start-over-title">
      <p>This erases everything effectiveAF has saved in this browser:</p>
      <ul class="erase-list">
        <li>your wallet and the cards you're comparing</li>
        <li>every value, fee and answer you've entered</li>
        <li>cards and perks you added yourself</li>
        <li>your settings, such as your everyday card's rate</li>
      </ul>
      <p class="hint">Your light or dark theme choice is kept.</p>
      <div class="form-actions">
        <button type="button" class="btn" onClick={onBackup}>
          Back up first
        </button>
        <button type="button" class="btn btn-danger" onClick={onErase}>
          Erase everything
        </button>
        <button type="button" class="btn" onClick={onClose}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}
