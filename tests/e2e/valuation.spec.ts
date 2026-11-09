// SPDX-License-Identifier: GPL-3.0-or-later
import { addCard, expect, test, verdict } from './fixtures';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

test('first visit offers all five cards and shows baseline numbers once one is added', async ({
  page,
}) => {
  await expect(page.getByRole('heading', { name: 'Add the cards you have' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Add / })).toHaveCount(5);

  await addCard(page, /Add American Express Gold Card/);
  await expect(verdict(page, 'amex-gold')).toHaveText('Costs $110/yr');
  await expect(page.getByTestId('summary-fees')).toHaveText('$325');
  await expect(page.getByTestId('summary-realized')).toHaveText('$215');
  await expect(page.getByTestId('summary-effective')).toHaveText('Costs $110/yr');
});

test('slider updates the perk, the card verdict and the wallet summary', async ({ page }) => {
  await addCard(page, /Add American Express Platinum Card/);
  const resy = page.getByRole('slider', { name: /^Resy dining credit/ });
  await resy.fill('100');
  // Defaults realize $990.55; Resy goes from $200 to $400: $1,190.55 − $895 = +$295.55
  await expect(page.getByTestId('realized-amex-platinum.resy')).toContainText('$400');
  await expect(page.getByRole('textbox', { name: /^Resy dining credit/ })).toHaveValue('400');
  await expect(verdict(page, 'amex-platinum')).toHaveText('Pays for itself (+$295.55)');
  await expect(page.getByTestId('summary-realized')).toHaveText('$1,190.55');
});

test('typing dollars moves the slider and is capped at face value', async ({ page }) => {
  await addCard(page, /Add Capital One Venture X/);
  const travel = page.getByRole('textbox', { name: /^Capital One Travel credit/ });
  const slider = page.getByRole('slider', { name: /^Capital One Travel credit/ });

  await travel.fill('150');
  await expect(slider).toHaveValue('50');
  // 150 + 100 miles + 15 Global Entry = 265; 395 − 265 = 130
  await expect(verdict(page, 'capital-one-venture-x')).toHaveText('Costs $130/yr');

  await travel.fill('999');
  await travel.blur();
  await expect(travel).toHaveValue('300');
  await expect(slider).toHaveValue('100');

  await travel.fill('');
  await expect(page.getByTestId('realized-capital-one-venture-x.travel')).toContainText('$0');
});

test('the slider works from the keyboard', async ({ page }) => {
  await addCard(page, /Add Capital One Venture X/);
  const slider = page.getByRole('slider', { name: /^Capital One Travel credit/ });
  await slider.focus();
  await page.keyboard.press('End');
  await expect(slider).toHaveValue('100');
  await page.keyboard.press('ArrowLeft');
  await expect(slider).toHaveValue('99');
  await expect(page.getByTestId('realized-capital-one-venture-x.travel')).toContainText('$297');
});

test('switching a perk off excludes it; switching back restores the value', async ({ page }) => {
  await addCard(page, /Add American Express Gold Card/);
  const toggle = page.getByRole('checkbox', { name: "Use Dunkin' credit" });
  await toggle.uncheck();
  await expect(page.getByTestId('realized-amex-gold.dunkin')).toContainText('$0');
  await expect(verdict(page, 'amex-gold')).toHaveText('Costs $131/yr');
  await expect(page.getByRole('slider', { name: /^Dunkin/ })).toBeDisabled();
  await toggle.check();
  await expect(verdict(page, 'amex-gold')).toHaveText('Costs $110/yr');
});

test('fee override shows a badge and can be reset to the standard fee', async ({ page }) => {
  await addCard(page, /Add American Express Platinum Card/);
  const fee = page.getByRole('textbox', { name: 'Platinum Card annual fee' });
  await fee.fill('695');
  await expect(page.getByText('Custom', { exact: true })).toBeVisible();
  await expect(page.getByTestId('summary-fees')).toHaveText('$695');
  await expect(verdict(page, 'amex-platinum')).toHaveText('Pays for itself (+$295.55)');

  await page.getByRole('button', { name: 'Use standard $895' }).click();
  await expect(page.getByText('Custom', { exact: true })).toBeHidden();
  await expect(fee).toHaveValue('895');
});

test('remove a card, undo, and re-add it with its values', async ({ page }) => {
  await addCard(page, /Add American Express Gold Card/);
  await page.getByRole('slider', { name: /^Dining credit/ }).fill('100');
  await expect(verdict(page, 'amex-gold')).toHaveText('Costs $50/yr');

  await page.getByRole('button', { name: 'Remove card' }).click();
  await expect(verdict(page, 'amex-gold')).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(verdict(page, 'amex-gold')).toHaveText('Costs $50/yr');

  // Undo puts the card back expanded.
  await page.getByRole('button', { name: 'Remove card' }).click();
  await addCard(page, /Add American Express Gold Card/);
  await expect(verdict(page, 'amex-gold')).toHaveText('Costs $50/yr');
});

test('reset all asks first, then restores defaults', async ({ page }) => {
  await addCard(page, /Add American Express Gold Card/);
  await page.getByRole('slider', { name: /^Dining credit/ }).fill('100');

  page.once('dialog', (d) => void d.dismiss());
  await page.getByRole('button', { name: 'Reset all values' }).click();
  await expect(verdict(page, 'amex-gold')).toHaveText('Costs $50/yr');

  page.once('dialog', (d) => void d.accept());
  await page.getByRole('button', { name: 'Reset all values' }).click();
  await expect(verdict(page, 'amex-gold')).toHaveText('Costs $110/yr');
});

test('a 2026-only credit shows its end date', async ({ page }) => {
  await addCard(page, /Add Chase Sapphire Reserve/);
  const perk = page.locator('li', {
    has: page.getByRole('heading', { name: 'Select hotels credit (2026)' }),
  });
  await expect(perk.getByText('Ends Dec 31, 2026')).toBeVisible();
});
