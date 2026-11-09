// SPDX-License-Identifier: GPL-3.0-or-later
import { useEffect, useState } from 'preact/hooks';
import { PRESETS, type PresetId } from '../core/presets';
import { messageFor } from '../state/errors';
import type { Store } from '../state/store';
import { AddCards } from './AddCards';
import { BackupDialog } from './BackupDialog';
import { CardPanel } from './CardPanel';
import { StoreContext } from './store-context';
import { ThemeToggle } from './ThemeToggle';
import { WalletSummary } from './WalletSummary';

const REPO_URL = 'https://github.com/dnguyensr/effectiveAF';
const UNDO_MS = 8000;

interface Removed {
  cardId: string;
  index: number;
}

export function App({ store }: { store: Store }) {
  const [backupOpen, setBackupOpen] = useState(false);
  const [removed, setRemoved] = useState<Removed | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const summary = store.summary.value;

  useEffect(() => {
    if (!removed) return;
    const timer = setTimeout(() => setRemoved(null), UNDO_MS);
    return () => clearTimeout(timer);
  }, [removed]);

  return (
    <StoreContext.Provider value={store}>
      <header class="site-header">
        <div>
          <h1>
            effective<span class="brand-accent">AF</span>
          </h1>
          <p class="tagline">
            What your credit cards really cost after the perks you actually use.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <StorageNotice store={store} />

      <main>
        {summary.cards.length > 0 && <WalletSummary summary={summary} />}

        {summary.cards.length > 0 && (
          <section class="cards" aria-labelledby="cards-title">
            <h2 id="cards-title" class="section-title">
              Your cards
            </h2>
            <p class="hint">
              Slide or type how much of each credit you'd really use in a year. Starting values are
              conservative guesses; your answers are saved in this browser.
            </p>
            {summary.cards.map((c) => (
              <CardPanel
                key={c.card.id}
                summary={c}
                initiallyOpen={c.card.id === justAdded || summary.cards.length === 1}
                onRemove={(cardId) => {
                  const index = store.removeCard(cardId);
                  setRemoved({ cardId, index });
                }}
              />
            ))}
          </section>
        )}

        <AddCards onAdded={setJustAdded} />

        <section class="toolbar" aria-label="Data">
          <button type="button" class="btn" onClick={() => setBackupOpen(true)}>
            Back up or restore
          </button>
          {summary.cards.length > 0 && (
            <button
              type="button"
              class="btn"
              onClick={() => {
                if (
                  confirm(
                    'Reset every card to the standard fees and starting estimates? Perks you added are kept.',
                  )
                ) {
                  store.resetAll();
                }
              }}
            >
              Reset all values
            </button>
          )}
          {summary.cards.length > 1 && <WalletPreset store={store} />}
        </section>
      </main>

      {removed && (
        <div class="toast" role="status">
          <span>Removed {store.findCard(removed.cardId)?.name ?? 'card'}.</span>
          <button
            type="button"
            class="link-button"
            onClick={() => {
              store.addCard(removed.cardId, removed.index);
              setRemoved(null);
            }}
          >
            Undo
          </button>
        </div>
      )}

      <BackupDialog open={backupOpen} onClose={() => setBackupOpen(false)} />

      <footer class="site-footer">
        <p>
          Runs entirely in your browser: nothing you enter leaves your device. Credit amounts come
          from issuers' public pages and change often, so check your issuer's terms. Not financial
          advice; not affiliated with any card issuer.
        </p>
        <p>
          <a href={REPO_URL}>Source code</a> · Licensed under{' '}
          <a href={`${REPO_URL}/blob/main/LICENSE`}>GPL-3.0-or-later</a> ·{' '}
          <a href={`${import.meta.env.BASE_URL}third-party-licenses.txt`}>Third-party notices</a>
        </p>
      </footer>
    </StoreContext.Provider>
  );
}

function WalletPreset({ store }: { store: Store }) {
  const [preset, setPreset] = useState<PresetId>('estimates');
  const chosen = PRESETS.find((p) => p.id === preset);
  return (
    <div class="wallet-preset">
      <label for="wallet-preset">Set every card to</label>
      <select
        id="wallet-preset"
        value={preset}
        onChange={(e) => setPreset(e.currentTarget.value as PresetId)}
      >
        {PRESETS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        class="btn"
        onClick={() => {
          if (confirm(`Set every card to “${chosen?.label}”? ${chosen?.description}`)) {
            store.applyPresetToWallet(preset);
          }
        }}
      >
        Apply
      </button>
    </div>
  );
}

function StorageNotice({ store }: { store: Store }) {
  let text: string | null = null;
  if (store.loadStatus === 'unavailable') {
    text =
      "This browser isn't letting effectiveAF save data, so your changes will be lost when you close the page. Use “Back up or restore” to keep a copy.";
  } else if (store.loadStatus === 'recovered') {
    text = `Your saved data couldn't be read, so effectiveAF started fresh. The old data is still stored in this browser. ${store.loadProblem ? messageFor(store.loadProblem) : ''}`;
  } else if (store.saveFailed.value) {
    text =
      "Your latest changes couldn't be saved (browser storage may be full). Download a backup to keep them.";
  }
  if (!text) return null;
  return (
    <p class="notice" role="status">
      {text}
    </p>
  );
}
