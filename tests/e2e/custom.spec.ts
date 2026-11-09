// SPDX-License-Identifier: GPL-3.0-or-later
import AxeBuilder from '@axe-core/playwright';
import { addCard, expect, test, verdict, waitForSaved } from './fixtures';

test('a quick-set preset applies and survives a reload', async ({ page }) => {
  await page.goto('./');
  await addCard(page, /Add American Express Platinum Card/);
  await page
    .getByRole('group', { name: 'Quick-set Platinum Card credits' })
    .getByRole('button', { name: 'Only what I already spend on' })
    .click();
  await expect(verdict(page, 'amex-platinum')).toHaveText('Costs $224.30/yr');
  await expect(page.getByRole('checkbox', { name: 'Use Equinox credit' })).not.toBeChecked();
  await waitForSaved(
    page,
    "s.cards['amex-platinum']?.perks['amex-platinum.lululemon']?.enabled === false",
  );

  await page.reload();
  await expect(verdict(page, 'amex-platinum')).toHaveText('Costs $224.30/yr');
});

test('create a custom card with a perk, add a benefit to a catalog card, reload', async ({
  page,
}) => {
  await page.goto('./');
  await page.getByRole('button', { name: "+ Create a card that isn't listed" }).click();
  const cardForm = page.getByRole('form', { name: 'Create a custom card' });
  await cardForm.getByLabel('Issuer (optional)').fill('Citi');
  await cardForm.getByLabel('Card name').fill('Strata Premier');
  await cardForm.getByLabel('Annual fee').fill('95');
  await cardForm.getByRole('button', { name: 'Create card' }).click();

  const strata = page.getByRole('region', { name: 'Strata Premier' });
  await expect(strata).toBeVisible();
  await strata.getByRole('button', { name: '+ Add your own perk or benefit' }).click();
  const perkForm = strata.getByRole('form', { name: 'Add a perk to Strata Premier' });
  await perkForm.getByLabel('Name').fill('Hotel benefit');
  await perkForm.getByLabel('Worth to you').fill('100');
  await perkForm.getByRole('button', { name: 'Add' }).click();
  await expect(strata.getByRole('heading', { name: 'Hotel benefit' })).toBeVisible();

  await addCard(page, /Add Capital One Venture X/);
  const vx = page.getByRole('region', { name: 'Venture X' });
  await vx.getByRole('button', { name: '+ Add your own perk or benefit' }).click();
  const vxForm = vx.getByRole('form', { name: 'Add a perk to Venture X' });
  await vxForm.getByLabel('Name').fill('Lounge access');
  await vxForm.getByLabel('Worth to you').fill('200');
  await vxForm.getByRole('button', { name: 'Add' }).click();
  await expect(verdict(page, 'capital-one-venture-x')).toHaveText('Pays for itself (+$190)');

  // 95 + 395 fees; 100 + 385 + 200 realized = 685; net −190 − 5 = +$195
  await expect(page.getByTestId('summary-effective')).toHaveText('Pays for itself (+$195)');
  await waitForSaved(page, "s.cards['capital-one-venture-x']?.customPerks?.length === 1");

  await page.reload();
  await expect(page.getByTestId('summary-effective')).toHaveText('Pays for itself (+$195)');
  // Cards start collapsed after a reload.
  await page.getByRole('button', { name: /Venture X/, expanded: false }).click();
  await expect(page.getByRole('heading', { name: 'Lounge access' })).toBeVisible();
});

test('custom forms have no serious accessibility problems', async ({ page, browserName }) => {
  await page.goto('./');
  await page.getByRole('button', { name: "+ Create a card that isn't listed" }).click();
  await addCard(page, /Add American Express Gold Card/);
  await page.getByRole('button', { name: '+ Add your own perk or benefit' }).click();
  await page.getByRole('button', { name: 'Add', exact: true }).click(); // show a validation error
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations
    .filter((v) => ['serious', 'critical'].includes(v.impact ?? ''))
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
  expect(serious, browserName).toEqual([]);
});
