// SPDX-License-Identifier: GPL-3.0-or-later
/** Small UI pieces tested directly: Modal, hash routing, tab keys, the store context. */
import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Modal } from '../../../src/ui/Modal';
import { onTabKeyDown, parseRoute } from '../../../src/ui/navigation';
import { useStore } from '../../../src/ui/store-context';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('parseRoute', () => {
  it.each([
    ['#compare', 'compare'],
    ['#wallet', 'wallet'],
    ['', null],
    ['#other', null],
  ])('%s -> %s', (hash, route) => {
    expect(parseRoute(hash)).toBe(route);
  });
});

describe('onTabKeyDown', () => {
  const ids = ['a', 'b', 'c'];
  const press = (key: string, current: string) => {
    const select = vi.fn();
    const event = new KeyboardEvent('keydown', { key, cancelable: true });
    onTabKeyDown(event, ids, current, select, (id) => `tab-${id}`);
    return { select, prevented: event.defaultPrevented };
  };

  it('moves and wraps with arrows, jumps with Home/End', () => {
    expect(press('ArrowRight', 'c').select).toHaveBeenCalledWith('a');
    expect(press('ArrowLeft', 'a').select).toHaveBeenCalledWith('c');
    expect(press('Home', 'b').select).toHaveBeenCalledWith('a');
    expect(press('End', 'a').select).toHaveBeenCalledWith('c');
  });

  it('ignores other keys and leaves them alone', () => {
    const { select, prevented } = press('Enter', 'a');
    expect(select).not.toHaveBeenCalled();
    expect(prevented).toBe(false);
  });

  it('does nothing with no tabs', () => {
    const select = vi.fn();
    onTabKeyDown(new KeyboardEvent('keydown', { key: 'Home' }), [], '', select, (id) => id);
    expect(select).not.toHaveBeenCalled();
  });
});

describe('Modal', () => {
  it('falls back to the open attribute where <dialog> methods are missing', () => {
    const proto = HTMLDialogElement.prototype as unknown as Record<string, unknown>;
    const saved = { showModal: proto.showModal, close: proto.close };
    proto.showModal = undefined;
    proto.close = undefined;
    try {
      const onClose = vi.fn();
      const { rerender } = render(
        <Modal open onClose={onClose} title="T" titleId="t">
          <p>Body</p>
        </Modal>,
      );
      const dialog = document.querySelector('dialog') as HTMLDialogElement;
      expect(dialog.hasAttribute('open')).toBe(true);
      expect(screen.getByText('Body')).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      expect(onClose).toHaveBeenCalled();
      rerender(
        <Modal open={false} onClose={onClose} title="T" titleId="t">
          <p>Body</p>
        </Modal>,
      );
      expect(dialog.hasAttribute('open')).toBe(false);
      expect(screen.queryByText('Body')).toBeNull();
    } finally {
      proto.showModal = saved.showModal;
      proto.close = saved.close;
    }
  });
});

describe('useStore', () => {
  it('throws a clear error outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    function Orphan() {
      useStore();
      return null;
    }
    expect(() => render(<Orphan />)).toThrow(/StoreContext.Provider/);
  });
});
