// SPDX-License-Identifier: GPL-3.0-or-later
import { compareCards, expect, seriousViolations, test } from './fixtures';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

test('lines up three cards by kind of credit, with gaps and totals', async ({ page }) => {
  await compareCards(
    page,
    /Compare American Express Platinum Card/,
    /Compare Chase Sapphire Reserve/,
    /Compare Capital One Venture X/,
  );
  await expect(page).toHaveURL(/#compare$/);
  const table = page.getByRole('table');
  const row = (label: string) =>
    table.getByRole('row').filter({
      has: page.getByRole('rowheader', { name: label, exact: true }),
    });

  await expect(row('Annual fee')).toContainText('$895');
  await expect(row('Annual fee')).toContainText('$795');
  // Platinum has one hotel credit, Reserve two, Venture X none.
  const hotel = row('Hotel credits');
  await expect(hotel).toContainText('The Edit hotel credit');
  await expect(hotel).toContainText('Select hotels credit (2026)');
  await expect(hotel.getByText('Not offered')).toHaveCount(1);
  await expect(row('Airline fee credit').getByText('Not offered')).toHaveCount(2);
  await expect(row('Global Entry / TSA PreCheck').getByText('Not offered')).toHaveCount(0);
  await expect(row('Face value of credits')).toContainText('$2,784');
  await expect(page.getByTestId('compare-verdict-chase-sapphire-reserve')).toHaveText(
    'Costs $795/yr',
  );
});

test('values set in the comparison carry over to the wallet', async ({ page }) => {
  await compareCards(page, /Compare American Express Gold Card/, /Compare Capital One Venture X/);
  await page.getByRole('button', { name: 'Set my values for Gold Card' }).click();
  const editor = page.getByRole('dialog', { name: 'Your values: Gold Card' });
  await editor.getByRole('button', { name: 'Full value', exact: true }).click();
  await editor.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByTestId('compare-verdict-amex-gold')).toHaveText('Pays for itself (+$99)');

  await page.getByRole('button', { name: 'Add to wallet as considering: Gold Card' }).click();
  await page.getByRole('link', { name: 'My wallet' }).click();
  await expect(page.getByTestId('verdict-amex-gold')).toHaveText('Would pay for itself (+$99)');
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Compare cards' })).toBeVisible();
});

test('at phone width the table scrolls sideways, not the page', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await compareCards(
    page,
    /Compare American Express Platinum Card/,
    /Compare American Express Gold Card/,
    /Compare Chase Sapphire Reserve/,
    /Compare Capital One Venture X/,
  );
  const pageOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(pageOverflow).toBeLessThanOrEqual(0);
  const region = page.getByRole('region', { name: 'Comparison table' });
  const scrolls = await region.evaluate((el) => el.scrollWidth > el.clientWidth);
  expect(scrolls).toBe(true);
});

test('comparison has no serious accessibility problems', async ({ page }) => {
  await compareCards(
    page,
    /Compare American Express Platinum Card/,
    /Compare Chase Sapphire Preferred/,
  );
  expect(await seriousViolations(page)).toEqual([]);
});
