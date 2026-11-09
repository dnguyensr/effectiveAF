// SPDX-License-Identifier: GPL-3.0-or-later
import { useEffect, useState } from 'preact/hooks';

type Theme = 'system' | 'light' | 'dark';
const THEME_KEY = 'effectiveaf:theme';
const NEXT: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' };
const LABEL: Record<Theme, string> = { system: 'System', light: 'Light', dark: 'Dark' };

function readTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'system';
  } catch {
    return 'system';
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(readTheme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') delete root.dataset.theme;
    else root.dataset.theme = theme;
    try {
      if (theme === 'system') localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Not remembered across visits; that's fine.
    }
  }, [theme]);

  return (
    <button
      type="button"
      class="btn btn-small"
      aria-label={`Theme: ${LABEL[theme]}. Switch to ${LABEL[NEXT[theme]]}.`}
      onClick={() => setTheme(NEXT[theme])}
    >
      Theme: {LABEL[theme]}
    </button>
  );
}
