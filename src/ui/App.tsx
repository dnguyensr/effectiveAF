// SPDX-License-Identifier: GPL-3.0-or-later
import { useState } from 'preact/hooks';
import { csvFileName, walletCsv } from '../core/export-csv';
import { messageFor } from '../state/errors';
import { backupFileName, exportState } from '../state/import-export';
import type { UserState } from '../state/schema';
import type { Store } from '../state/store';
import { CardPicker, type PickerMode } from './CardPicker';
import { CompareView } from './CompareView';
import { downloadText } from './download';
import { useHashRoute, type Route } from './navigation';
import { OptionsMenu } from './OptionsMenu';
import { RestoreDialog } from './RestoreDialog';
import { ShareDialog } from './ShareDialog';
import { StartOverDialog } from './StartOverDialog';
import { StoreContext } from './store-context';
import { ThemeToggle } from './ThemeToggle';
import { WalletView } from './WalletView';
import { Welcome } from './Welcome';

const REPO_URL = 'https://github.com/dnguyensr/effectiveAF';

export function App({ store }: { store: Store }) {
  const [route, go] = useHashRoute();
  const [picker, setPicker] = useState<PickerMode | null>(null);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [startOverOpen, setStartOverOpen] = useState(false);
  /** What Start over erased, kept in memory (not saved) so it can be undone until reload. */
  const [erased, setErased] = useState<UserState | null>(null);
  const [activeCard, setActiveCard] = useState<string | null>(null);

  const { wallet, compare, customCards } = store.state.value;
  const isNew = wallet.length === 0 && compare.length === 0 && customCards.length === 0;
  const view: Route | 'welcome' = route ?? (isNew ? 'welcome' : 'wallet');

  const open = (target: Route) => {
    go(target);
    setPicker(target);
  };

  const backup = () =>
    downloadText(backupFileName(store.asOf), exportState(store.state.value), 'application/json');

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

      <nav class="views-nav" aria-label="Views">
        <a href="#wallet" aria-current={view === 'wallet' ? 'page' : undefined}>
          My wallet
        </a>
        <a href="#compare" aria-current={view === 'compare' ? 'page' : undefined}>
          Compare
        </a>
        <OptionsMenu
          hasCards={wallet.length > 0}
          onShare={() => setShareOpen(true)}
          onExport={() =>
            downloadText(
              csvFileName(store.asOf),
              walletCsv(store.summary.value.cards),
              'text/csv;charset=utf-8',
            )
          }
          onBackup={backup}
          onRestore={() => setRestoreOpen(true)}
          onClearValues={() => {
            if (confirm('Clear every value and fee override? Perks you added are kept.')) {
              store.resetAll();
            }
          }}
          onStartOver={() => setStartOverOpen(true)}
        />
      </nav>

      <StorageNotice store={store} />

      <main>
        {view === 'welcome' && (
          <Welcome onValueCards={() => open('wallet')} onCompare={() => open('compare')} />
        )}
        {view === 'wallet' && (
          <WalletView
            activeCardId={activeCard}
            onSelect={setActiveCard}
            onAddCard={() => setPicker('wallet')}
          />
        )}
        {view === 'compare' && <CompareView onChooseCards={() => setPicker('compare')} />}
      </main>

      <CardPicker
        open={picker !== null}
        mode={picker ?? 'wallet'}
        onClose={() => setPicker(null)}
        onAdded={setActiveCard}
      />
      <RestoreDialog open={restoreOpen} onClose={() => setRestoreOpen(false)} />
      <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} />
      <StartOverDialog
        open={startOverOpen}
        onClose={() => setStartOverOpen(false)}
        onBackup={backup}
        onErase={() => {
          setErased(store.startOver());
          setActiveCard(null);
          setStartOverOpen(false);
        }}
      />
      {erased && (
        <div class="toast" role="status">
          <span>Everything was erased.</span>
          <button
            type="button"
            class="link-button"
            onClick={() => {
              store.replaceState(erased);
              setErased(null);
            }}
          >
            Undo
          </button>
          <button type="button" class="link-button" onClick={() => setErased(null)}>
            Dismiss
          </button>
        </div>
      )}

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

function StorageNotice({ store }: { store: Store }) {
  let text: string | null = null;
  if (store.loadStatus === 'unavailable') {
    text =
      "This browser isn't letting effectiveAF save data, so your changes will be lost when you close the page. Use Options → Back up to keep a copy.";
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
