// SPDX-License-Identifier: GPL-3.0-or-later
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  addCards,
  expect,
  seedState,
  selectTab,
  STORAGE_KEY,
  test,
  verdict,
  waitForSaved,
} from './fixtures';

test('changes survive a reload, and the wallet opens directly', async ({ page }) => {
  await page.goto('./');
  await addCards(page, /Add American Express Gold Card/);
  await page.getByRole('slider', { name: /^Dining credit/ }).fill('100');
  await page.getByRole('textbox', { name: 'Gold Card annual fee' }).fill('250');
  await waitForSaved(page, "s.cards['amex-gold']?.feeOverrideCents === 25000");

  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'My wallet' })).toBeVisible();
  await expect(verdict(page, 'amex-gold')).toHaveText('Costs $130/yr');
  await expect(page.getByTestId('summary-fees')).toHaveText('$250');
});

test('a second tab sees saved data after loading', async ({ page, context }) => {
  await page.goto('./');
  await addCards(page, /Add Capital One Venture X/);
  await waitForSaved(page, "s.wallet.includes('capital-one-venture-x')");
  const other = await context.newPage();
  await other.clock.setFixedTime(new Date('2026-11-08T12:00:00'));
  await other.goto('./');
  await expect(verdict(other, 'capital-one-venture-x')).toHaveText('Costs $395/yr');
});

test('pending changes are saved when the page is hidden', async ({ page }) => {
  await page.goto('./');
  await addCards(page, /Add Capital One Venture X/);
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  const saved = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
  expect(JSON.parse(saved ?? '{}').wallet).toEqual(['capital-one-venture-x']);
});

test('a v1 user keeps their numbers after the upgrade', async ({ page }) => {
  // A v1 wallet with Venture X and nothing touched: v1 showed it costing $10/yr.
  await seedState(
    page,
    JSON.stringify({
      schemaVersion: 1,
      catalogVersion: '2026-11-08',
      wallet: ['capital-one-venture-x'],
      cards: {},
      updatedAt: '2026-11-08T12:00:00.000Z',
    }),
  );
  await page.goto('./');
  await expect(verdict(page, 'capital-one-venture-x')).toHaveText('Costs $10/yr');
  await expect(page.getByText(/not set yet/)).toHaveCount(0);
});

test.describe('saved data from every schema version loads', () => {
  const root = join(import.meta.dirname, '../fixtures');
  const files = readdirSync(root)
    .filter((d) => d.startsWith('state-v'))
    .flatMap((d) => readdirSync(join(root, d)).map((f) => join(d, f)));

  for (const file of files) {
    test(file, async ({ page }) => {
      const raw = readFileSync(join(root, file), 'utf8');
      await seedState(page, raw);
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto('./#wallet');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByText(/couldn't be read/)).toHaveCount(0);
      const known = (JSON.parse(raw) as { wallet: string[] }).wallet.filter(
        (id) => id !== 'discontinued-card',
      );
      await expect(page.getByRole('tab')).toHaveCount(known.length);
      expect(errors).toEqual([]);
    });
  }
});

test('unreadable saved data is set aside, not lost', async ({ page }) => {
  await seedState(page, '{"schemaVersion":1,"wallet":"broken"');
  await page.goto('./');
  await expect(page.getByRole('status')).toContainText("couldn't be read");
  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys.some((k) => k.startsWith('effectiveaf:corrupt:'))).toBe(true);
});

test('works when the browser blocks storage', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get: () => {
        throw new DOMException('blocked', 'SecurityError');
      },
    });
  });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./');
  await expect(page.getByRole('status')).toContainText("isn't letting effectiveAF save");
  await addCards(page, /Add American Express Gold Card/, /Add Capital One Venture X/);
  await selectTab(page, /Gold Card/);
  await expect(verdict(page, 'amex-gold')).toHaveText('Costs $325/yr');
  await page.getByRole('button', { name: /^Theme:/ }).click();
  expect(errors).toEqual([]);
});
