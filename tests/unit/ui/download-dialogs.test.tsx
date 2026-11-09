// SPDX-License-Identifier: GPL-3.0-or-later
import { cleanup, render, screen } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createStore } from '../../../src/state/store';
import { downloadText } from '../../../src/ui/download';
import { RestoreDialog } from '../../../src/ui/RestoreDialog';
import { StoreContext } from '../../../src/ui/store-context';
import { FIXED_NOW, memoryStorage } from '../helpers';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('downloadText', () => {
  it('downloads through a temporary link and frees the URL afterwards', async () => {
    vi.useFakeTimers();
    const revoke = vi.fn();
    let blob: Blob | undefined;
    Object.assign(URL, {
      createObjectURL: (b: Blob) => {
        blob = b;
        return 'blob:x';
      },
      revokeObjectURL: revoke,
    });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    downloadText('a.csv', 'x,y', 'text/csv');
    const anchor = click.mock.instances[0] as unknown as HTMLAnchorElement;
    expect(anchor.download).toBe('a.csv');
    expect(anchor.href).toBe('blob:x');
    expect(blob?.type).toBe('text/csv');
    expect(revoke).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(revoke).toHaveBeenCalledWith('blob:x');
  });
});

describe('RestoreDialog with a native <dialog>', () => {
  it('uses showModal and close when the browser has them', () => {
    // jsdom lacks these, so the other tests cover the fallback; here, the real path.
    const showModal = vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    });
    const close = vi.fn(function (this: HTMLDialogElement) {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    });
    Object.assign(HTMLDialogElement.prototype, { showModal, close });
    const store = createStore({ storage: memoryStorage(), now: () => FIXED_NOW, saveDelayMs: 0 });
    const onClose = vi.fn();
    const { rerender } = render(
      <StoreContext.Provider value={store}>
        <RestoreDialog open onClose={onClose} />
      </StoreContext.Provider>,
    );
    expect(showModal).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('dialog', { name: 'Restore from backup' })).toBeTruthy();
    rerender(
      <StoreContext.Provider value={store}>
        <RestoreDialog open={false} onClose={onClose} />
      </StoreContext.Provider>,
    );
    expect(close).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
  });
});
