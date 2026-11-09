// SPDX-License-Identifier: GPL-3.0-or-later
import { render } from 'preact';
import { createStore } from './state/store';
import { getBrowserStorage } from './state/storage';
import { App } from './ui/App';
import './ui/styles.css';

const store = createStore({ storage: getBrowserStorage() });

// Writes are debounced; make sure nothing pending is lost when the tab goes away.
addEventListener('pagehide', () => store.flush());
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') store.flush();
});

const root = document.getElementById('app');
if (!root) throw new Error('Missing #app root element');
render(<App store={store} />, root);
