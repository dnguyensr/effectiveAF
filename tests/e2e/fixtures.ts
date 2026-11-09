// SPDX-License-Identifier: GPL-3.0-or-later
import { test as base, expect, type Page } from '@playwright/test';

/** All e2e tests run "on" this date so expiring perks don't change results over time. */
export const FIXED_TIME = new Date('2026-11-08T12:00:00');
export const STORAGE_KEY = 'effectiveaf:state';

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.clock.setFixedTime(FIXED_TIME);
    await use(page);
  },
});

export { expect };

export async function addCard(page: Page, name: RegExp) {
  await page.getByRole('button', { name }).click();
}

export function verdict(page: Page, cardId: string) {
  return page.getByTestId(`verdict-${cardId}`);
}

/** Debounced saves: wait until storage reflects the condition. */
export async function waitForSaved(page: Page, predicate: string) {
  await page.waitForFunction(
    ([key, body]) => {
      const raw = localStorage.getItem(key as string);
      if (!raw) return false;
      return new Function('s', `return ${body as string}`)(JSON.parse(raw)) as boolean;
    },
    [STORAGE_KEY, predicate],
  );
}
