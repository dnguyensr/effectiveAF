// SPDX-License-Identifier: GPL-3.0-or-later
import AxeBuilder from '@axe-core/playwright';
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

/**
 * Adds catalog cards to the wallet through the card picker, from wherever the app is:
 * the first-visit screen, an empty wallet, or a wallet with cards. Leaves the picker closed.
 */
export async function addCards(page: Page, ...names: RegExp[]) {
  const choice = page.getByRole('button', { name: /^Value the cards I have/ });
  if (await choice.isVisible()) {
    await choice.click();
  } else {
    await page.getByRole('button', { name: /^(\+ Add card|Add a card)$/ }).click();
  }
  const picker = page.getByRole('dialog', { name: 'Add a card' });
  for (const name of names) await picker.getByRole('button', { name }).click();
  await picker.getByRole('button', { name: 'Close' }).click();
  await expect(picker).toBeHidden();
}

/** Opens the Options menu on the nav bar and picks an item. */
export async function chooseOption(page: Page, name: string) {
  await page.getByRole('button', { name: 'Options' }).click();
  await page.getByRole('button', { name, exact: true }).click();
}

/** Picks cards for the comparison (from the first-visit screen or the compare view). */
export async function compareCards(page: Page, ...names: RegExp[]) {
  const choice = page.getByRole('button', { name: /^Compare cards/ });
  if (await choice.isVisible()) await choice.click();
  else await page.getByRole('button', { name: 'Choose cards' }).click();
  const picker = page.getByRole('dialog', { name: 'Choose cards to compare' });
  for (const name of names) await picker.getByRole('checkbox', { name }).check();
  await picker.getByRole('button', { name: 'Close' }).click();
  await expect(picker).toBeHidden();
}

/** The fee field starts locked: unlock it, then type. */
export async function setFee(page: Page, cardName: string, dollars: string) {
  const unlock = page.getByRole('button', { name: `Unlock ${cardName} annual fee` });
  if (await unlock.isVisible()) await unlock.click();
  await page.getByRole('textbox', { name: `${cardName} annual fee` }).fill(dollars);
}

/** A perk's quick-value button: "Won't use", or a name starting "Half" / "Full". */
export function perkChip(page: Page, perkName: string, chip: "Won't use" | 'Half' | 'Full') {
  return page
    .getByRole('group', { name: `${perkName}: quick values` })
    .getByRole('button', { name: chip === "Won't use" ? chip : new RegExp(`^${chip} `) });
}

export function verdict(page: Page, cardId: string) {
  return page.getByTestId(`verdict-${cardId}`);
}

export async function selectTab(page: Page, name: RegExp) {
  await page.getByRole('tab', { name }).click();
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

/** Seeds localStorage once (not again on reload) before the app loads. */
export async function seedState(page: Page, raw: string) {
  await page.addInitScript(
    ([key, value]) => {
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem(key as string, value as string);
        sessionStorage.setItem('seeded', '1');
      }
    },
    [STORAGE_KEY, raw],
  );
}

/**
 * Serious/critical axe violations on the page. Skipped on Firefox: Playwright's Firefox build
 * crashes intermittently while axe runs after a modal <dialog> has been used. axe checks the
 * DOM and ARIA tree, which doesn't differ by engine, so Chromium and WebKit cover it.
 */
export async function seriousViolations(page: Page) {
  if (page.context().browser()?.browserType().name() === 'firefox') {
    test.info().annotations.push({
      type: 'axe-skipped',
      description: 'axe runs on Chromium and WebKit only (Playwright Firefox crash)',
    });
    return [];
  }
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations
    .filter((v) => ['serious', 'critical'].includes(v.impact ?? ''))
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}
