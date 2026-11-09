// SPDX-License-Identifier: GPL-3.0-or-later
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { addCard, expect, test } from './fixtures';

async function seriousViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations
    .filter((v) => ['serious', 'critical'].includes(v.impact ?? ''))
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

test('loads at the GitHub Pages base path without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('./');

  await expect(page).toHaveTitle(/effectiveAF/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('effectiveAF');
  expect(errors).toEqual([]);
});

test('serves the third-party license notices', async ({ page, request }) => {
  await page.goto('./');
  const href = await page.getByRole('link', { name: 'Third-party notices' }).getAttribute('href');
  expect(href).toBe('/effectiveAF/third-party-licenses.txt');

  const res = await request.get(href ?? '');
  expect(res.ok()).toBe(true);
  const body = await res.text();
  expect(body).toContain('preact');
  expect(body).toContain('zod');
});

test.describe('accessibility', () => {
  test('empty wallet', async ({ page }) => {
    await page.goto('./');
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('cards expanded, perk switched off, custom fee', async ({ page }) => {
    await page.goto('./');
    await addCard(page, /Add American Express Platinum Card/);
    await addCard(page, /Add Chase Sapphire Reserve/);
    await page.getByRole('checkbox', { name: 'Use Equinox credit' }).uncheck();
    await page.getByRole('textbox', { name: 'Platinum Card annual fee' }).fill('695');
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('dark theme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('./');
    await addCard(page, /Add American Express Gold Card/);
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('backup dialog', async ({ page, browserName }) => {
    // Playwright's Firefox build crashes the page when axe runs inside an open modal <dialog>.
    // Chromium and WebKit cover this scan.
    test.skip(
      browserName === 'firefox',
      'Playwright Firefox crashes running axe in a modal dialog',
    );
    await page.goto('./');
    await page.getByRole('button', { name: 'Back up or restore' }).click();
    await page.getByLabel('Or paste backup text').fill('nope');
    await page.getByRole('button', { name: 'Check backup' }).click();
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('keyboard only: add a card, expand it and change a value', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit skips buttons on Tab unless the OS setting is on');
    await page.goto('./');
    // Tab to the first "Add" button.
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const isAdd = await page.evaluate(
        () => document.activeElement?.classList.contains('add-card') ?? false,
      );
      if (isAdd) break;
    }
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('verdict-amex-platinum')).toBeVisible();
    await page.getByRole('slider', { name: /^Hotel credit/ }).focus();
    await page.keyboard.press('Home');
    await expect(page.getByTestId('realized-amex-platinum.hotel')).toContainText('$0');
  });
});

test('no horizontal scrolling at phone width', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('./');
  await addCard(page, /Add Chase Sapphire Reserve/);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
