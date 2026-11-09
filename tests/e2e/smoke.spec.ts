// SPDX-License-Identifier: GPL-3.0-or-later
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

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
  expect(body).toContain('MIT');
});

test('has no serious accessibility violations', async ({ page }) => {
  await page.goto('./');
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((v) =>
    ['serious', 'critical'].includes(v.impact ?? ''),
  );
  expect(serious).toEqual([]);
});
