// SPDX-License-Identifier: GPL-3.0-or-later
import { addCards, expect, selectTab, seriousViolations, test, waitForSaved } from './fixtures';

test('reset dates, anniversary month and the "use it before it resets" list', async ({ page }) => {
  await page.goto('./');
  await addCards(page, /Add American Express Gold Card/, /Add Capital One Venture X/);

  await selectTab(page, /Gold Card/);
  const dining = page.locator('li', { has: page.getByRole('heading', { name: 'Dining credit' }) });
  await expect(dining.getByText('Resets Dec 1, 2026')).toBeVisible();
  const soon = page.getByRole('region', { name: 'Use it before it resets' });
  await expect(soon).toHaveCount(0);
  await page.getByRole('slider', { name: /^Dining credit/ }).fill('100');
  await expect(soon).toContainText('Dining credit (Gold Card): $10 resets in 23 days');

  await selectTab(page, /Venture X/);
  const travel = page.locator('li', {
    has: page.getByRole('heading', { name: 'Capital One Travel credit' }),
  });
  await expect(travel.getByText('Resets on your account anniversary')).toBeVisible();
  await page.getByLabel('Account opened in').selectOption('12');
  await expect(travel.getByText('Resets Dec 1, 2026')).toBeVisible();
  await page.getByRole('slider', { name: /^Capital One Travel credit/ }).fill('100');
  await expect(soon).toContainText('Capital One Travel credit (Venture X): $300 resets in 23 days');

  await selectTab(page, /Gold Card/);
  await soon.getByRole('button', { name: 'Capital One Travel credit' }).click();
  await expect(page.getByRole('tab', { name: /Venture X/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  expect(await seriousViolations(page)).toEqual([]);

  await waitForSaved(page, "s.cards['capital-one-venture-x']?.anniversaryMonth === 12");
  await page.reload();
  await expect(soon).toContainText('Capital One Travel credit (Venture X)');
});
