// SPDX-License-Identifier: GPL-3.0-or-later
import { addCards, expect, seriousViolations, test, waitForSaved } from './fixtures';

test('break-even spend responds to values and point value, and persists', async ({ page }) => {
  await page.goto('./');
  await addCards(page, /Add American Express Gold Card/);
  const section = page.getByRole('region', { name: 'Making up the difference with rewards' });
  const restaurants = section.getByRole('row').filter({
    has: page.getByRole('rowheader', { name: /^Restaurants worldwide/ }),
  });
  // $325 at 1¢: 4x → 2¢ extra per $ → $16,250 a year → $1,355/mo
  await expect(restaurants).toContainText('$1,355/mo');
  await page.getByRole('slider', { name: /^Uber Cash/ }).fill('100');
  // $205 left → $10,250 a year → $854.17 → $855/mo
  await expect(restaurants).toContainText('$855/mo');
  await section.getByLabel('Membership Rewards points worth').fill('2');
  // 4x × 2¢ = 8¢ − 2¢ = 6¢ → $205 / 0.06 / 12 = $284.72 → $285/mo
  await expect(restaurants).toContainText('$285/mo');
  expect(await seriousViolations(page)).toEqual([]);
  await waitForSaved(page, "s.cards['amex-gold']?.pointValueCents === 2");
  await page.reload();
  await expect(restaurants).toContainText('$285/mo');
});

test('the forum summary lists every card and the total', async ({ page }) => {
  await page.goto('./');
  await addCards(page, /Add American Express Gold Card/, /Add Capital One Venture X/);
  await page.getByRole('button', { name: 'Copy summary for forums' }).click();
  const text = page.getByRole('dialog', { name: 'Share a summary' }).getByLabel('Summary text');
  await expect(text).toHaveValue(
    /\| American Express Gold Card \| \$325 \| \$0 of \$424 \| Costs \$325\/yr \|/,
  );
  await expect(text).toHaveValue(/\| \*\*Total\*\* \| \*\*\$720\*\*/);
});

test('copy the summary to the clipboard', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'Clipboard permissions are only grantable in Chromium');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('./');
  await addCards(page, /Add American Express Gold Card/);
  await page.getByRole('button', { name: 'Copy summary for forums' }).click();
  const dialog = page.getByRole('dialog', { name: 'Share a summary' });
  await dialog.getByRole('button', { name: 'Copy to clipboard' }).click();
  await expect(dialog.getByText('Copied to clipboard.')).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain(
    '_Calculated with effectiveAF: https://dnguyensr.github.io/effectiveAF/_',
  );
});
