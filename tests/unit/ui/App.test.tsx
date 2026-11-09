// SPDX-License-Identifier: GPL-3.0-or-later
import { render, screen } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { App } from '../../../src/ui/App';

describe('App', () => {
  it('renders the heading and the license link', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('effectiveAF');
    expect(screen.getByRole('link', { name: 'GPL-3.0-or-later' }).getAttribute('href')).toMatch(
      /\/LICENSE$/,
    );
  });
});
