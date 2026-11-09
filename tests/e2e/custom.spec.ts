// SPDX-License-Identifier: GPL-3.0-or-later
import type { Page } from '@playwright/test';
import {
  addCards,
  expect,
  selectTab,
  seriousViolations,
  test,
  verdict,
  waitForSaved,
} from './fixtures';

async function firstCustomCardId(page: Page): Promise<string> {
  const raw = await page.evaluate(() => localStorage.getItem('effectiveaf:state'));
  return (JSON.parse(raw ?? '{}') as { customCards?: { id: string }[] }).customCards?.[0]?.id ?? '';
}

test('create a custom card with a perk, add a benefit to a catalog card, reload', async ({
  page,
}) => {
  await page.goto('./');
  await page.getByRole('button', { name: /^Value the cards I have/ }).click();
  const picker = page.getByRole('dialog', { name: 'Add a card' });
  await picker.getByRole('tab', { name: 'Your cards' }).click();
  await picker.getByRole('button', { name: "+ Create a card that isn't listed" }).click();
  const cardForm = picker.getByRole('form', { name: 'Create a custom card' });
  await cardForm.getByLabel('Issuer (optional)').fill('Citi');
  await cardForm.getByLabel('Card name').fill('Strata Premier');
  await cardForm.getByLabel('Annual fee').fill('95');
  await cardForm.getByRole('button', { name: 'Create card' }).click();
  await picker.getByRole('tab', { name: 'All' }).click();
  await picker.getByRole('button', { name: /Add Capital One Venture X/ }).click();
  await picker.getByRole('button', { name: 'Close' }).click();

  await selectTab(page, /Strata Premier/);
  const strata = page.getByRole('region', { name: 'Strata Premier' });
  await strata.getByRole('button', { name: '+ Add your own perk or benefit' }).click();
  const perkForm = strata.getByRole('form', { name: 'Add a perk to Strata Premier' });
  await perkForm.getByLabel('Name').fill('Hotel benefit');
  await perkForm.getByLabel('Worth to you').fill('100');
  await perkForm.getByRole('button', { name: 'Add' }).click();
  await waitForSaved(page, 's.customCards.length === 1');
  await expect(verdict(page, await firstCustomCardId(page))).toHaveText('Pays for itself (+$5)');

  await selectTab(page, /Venture X/);
  const vx = page.getByRole('region', { name: 'Venture X' });
  await vx.getByRole('button', { name: '+ Add your own perk or benefit' }).click();
  const vxForm = vx.getByRole('form', { name: 'Add a perk to Venture X' });
  await vxForm.getByLabel('Name').fill('Lounge access');
  await vxForm.getByLabel('Worth to you').fill('200');
  await vxForm.getByRole('button', { name: 'Add' }).click();
  await expect(verdict(page, 'capital-one-venture-x')).toHaveText('Costs $195/yr');

  // Fees 95 + 395 = 490; values 100 + 200 = 300 → costs $190
  await expect(page.getByTestId('summary-effective')).toHaveText('Costs $190/yr');
  await waitForSaved(page, "s.cards['capital-one-venture-x']?.customPerks?.length === 1");

  await page.reload();
  await expect(page.getByTestId('summary-effective')).toHaveText('Costs $190/yr');
  await selectTab(page, /Venture X/);
  await expect(page.getByRole('heading', { name: 'Lounge access' })).toBeVisible();
});

test('custom forms have no serious accessibility problems', async ({ page }) => {
  await page.goto('./');
  await addCards(page, /Add American Express Gold Card/);
  await page.getByRole('button', { name: '+ Add your own perk or benefit' }).click();
  await page.getByRole('button', { name: 'Add', exact: true }).click(); // validation error
  expect(await seriousViolations(page)).toEqual([]);
});
