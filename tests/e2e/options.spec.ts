// SPDX-License-Identifier: GPL-3.0-or-later
import { readFileSync } from 'node:fs';
import {
  addCards,
  chooseOption,
  expect,
  seriousViolations,
  test,
  verdict,
  waitForSaved,
} from './fixtures';

test('start over erases everything, can be undone, and the erase is saved', async ({
  page,
  browserName,
}) => {
  await page.goto('./');
  await addCards(page, /Add American Express Gold Card/);
  await page.getByRole('slider', { name: /^Dining credit/ }).fill('100');
  await expect(verdict(page, 'amex-gold')).toHaveText('Costs $205/yr');

  await chooseOption(page, 'Start over…');
  const dialog = page.getByRole('dialog', { name: 'Start over?' });
  await expect(dialog).toBeVisible();
  // Playwright's Firefox build crashes the page when axe runs inside an open modal <dialog>.
  if (browserName !== 'firefox') expect(await seriousViolations(page)).toEqual([]);
  await dialog.getByRole('button', { name: 'Erase everything' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText(/Your wallet is empty/)).toBeVisible();

  const toast = page.getByRole('status').filter({ hasText: 'Everything was erased.' });
  await toast.getByRole('button', { name: 'Undo' }).click();
  await expect(verdict(page, 'amex-gold')).toHaveText('Costs $205/yr');

  await chooseOption(page, 'Start over…');
  await dialog.getByRole('button', { name: 'Erase everything' }).click();
  await waitForSaved(page, 's.wallet.length === 0 && Object.keys(s.cards).length === 0');
  await page.reload();
  await expect(page.getByText(/Your wallet is empty/)).toBeVisible();
  await expect(toast).toBeHidden();
});

test('the options menu closes with Escape and returns focus', async ({ page }) => {
  await page.goto('./');
  const toggle = page.getByRole('button', { name: 'Options' });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  expect(await seriousViolations(page)).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toBeFocused();
});

test('at phone width the options panel stays on screen', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('./');
  await addCards(page, /Add American Express Gold Card/);
  await page.getByRole('button', { name: 'Options' }).click();
  const box = await page.locator('#options-panel').boundingBox();
  expect(box?.x).toBeGreaterThanOrEqual(0);
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(360);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
});

test('export the wallet as a spreadsheet', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'Mobile WebKit does not expose downloads to Playwright');
  await page.goto('./');
  await addCards(page, /Add American Express Gold Card/);
  await page.getByRole('slider', { name: /^Dining credit/ }).fill('50');
  const downloadPromise = page.waitForEvent('download');
  await chooseOption(page, 'Export spreadsheet (CSV)');
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('effectiveaf-2026-11-08.csv');
  const csv = readFileSync(await download.path(), 'utf8');
  expect(csv.charCodeAt(0)).toBe(0xfeff);
  expect(csv).toContain('Gold Card,American Express,Have,Annual fee,Yearly,-325,-325,\r\n');
  // $10/month = $120 a year; at 50% that's $60.
  expect(csv).toContain('Gold Card,American Express,Have,Dining credit,$10 / month,120,60,Using');
});
