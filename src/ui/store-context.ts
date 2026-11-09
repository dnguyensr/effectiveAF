// SPDX-License-Identifier: GPL-3.0-or-later
import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { Store } from '../state/store';

export const StoreContext = createContext<Store | null>(null);

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside <StoreContext.Provider>');
  return store;
}
