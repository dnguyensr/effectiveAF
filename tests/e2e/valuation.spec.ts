// SPDX-License-Identifier: GPL-3.0-or-later
import { addCards, expect, selectTab, test, verdict } from './fixtures';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

test('first visit: choose, add a card, nothing is assumed', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'What would you like to do?' })).toBeVisible();
  await addCards(page, /Add American Express Gold Card/);
  await expect(verdict(page, 'amex-gold')).toHaveText('Costs $325/yr');
  await expect(page.getByText('4 of 4 not set yet')).toBeVisible();
  await expect(page.getByTestId('realized-amex-gold.dining')).toContainText('Not set');
  await expect(page.getByTestId('summary-effective')).toHaveText('Costs $325/yr');
  await expect(page).toHaveURL(/#wallet$/);
});

test('slider sets a value and updates card, tab and summary', async ({ page }) => {
  await addCards(page, /Add American Express Platinum Card/);
  await page.getByRole('slider', { name: /^Resy dining credit/ }).fill('100');
  await expect(page.getByTestId('realized-amex-platinum.resy')).toContainText('$400');
  await expect(page.getByRole('textbox', { name: /^Resy dining credit/ })).toHaveValue('400');
  await expect(verdict(page, 'amex-platinum')).toHaveText('Costs $495/yr');
  await expect(page.getByRole('tab', { name: /Platinum Card/ })).toContainText('$495/yr');
  await expect(page.getByRole('tab', { name: /Platinum Card/ })).toContainText('11 not set');
  await expect(page.getByTestId('summary-realized')).toHaveText('$400');
});

test('typing dollars moves the slider and is capped at face value', async ({ page }) => {
  await addCards(page, /Add Capital One Venture X/);
  const travel = page.getByRole('textbox', { name: /^Capital One Travel credit/ });
  const slider = page.getByRole('slider', { name: /^Capital One Travel credit/ });
  await travel.fill('150');
  await expect(slider).toHaveValue('50');
  await expect(verdict(page, 'capital-one-venture-x')).toHaveText('Costs $245/yr');
  await travel.fill('999');
  await travel.blur();
  await expect(travel).toHaveValue('300');
  await expect(slider).toHaveValue('100');
});

test('the slider works from the keyboard', async ({ page }) => {
  await addCards(page, /Add Capital One Venture X/);
  const slider = page.getByRole('slider', { name: /^Capital One Travel credit/ });
  await slider.focus();
  await page.keyboard.press('End');
  await expect(slider).toHaveValue('100');
  await page.keyboard.press('ArrowLeft');
  await expect(slider).toHaveValue('99');
  await expect(page.getByTestId('realized-capital-one-venture-x.travel')).toContainText('$297');
});

test("won't use keeps the value but counts $0; unticking restores it", async ({ page }) => {
  await addCards(page, /Add American Express Gold Card/);
  await page.getByRole('textbox', { name: /^Dunkin/ }).fill('84');
  await expect(verdict(page, 'amex-gold')).toHaveText('Costs $241/yr');
  const wontUse = page.getByRole('checkbox', { name: "Won't use Dunkin' credit" });
  await wontUse.check();
  await expect(page.getByTestId('realized-amex-gold.dunkin')).toContainText("Won't use");
  await expect(verdict(page, 'amex-gold')).toHaveText('Costs $325/yr');
  await expect(page.getByRole('textbox', { name: /^Dunkin/ })).toHaveValue('84');
  await wontUse.uncheck();
  await expect(verdict(page, 'amex-gold')).toHaveText('Costs $241/yr');
});

test('presets: face value, travel & dining, clear', async ({ page }) => {
  await addCards(page, /Add American Express Platinum Card/);
  const bar = page.getByRole('group', { name: 'Quick-set Platinum Card credits' });
  await bar.getByRole('button', { name: 'Face value', exact: true }).click();
  await expect(verdict(page, 'amex-platinum')).toHaveText('Pays for itself (+$2,129.40)');
  await bar.getByRole('button', { name: 'Travel & dining at face value' }).click();
  await expect(verdict(page, 'amex-platinum')).toHaveText('Pays for itself (+$754)');
  await expect(page.getByRole('checkbox', { name: "Won't use Equinox credit" })).toBeChecked();
  await bar.getByRole('button', { name: 'Clear all' }).click();
  await expect(verdict(page, 'amex-platinum')).toHaveText('Costs $895/yr');
});

test('fee override shows a badge and can be reset', async ({ page }) => {
  await addCards(page, /Add American Express Platinum Card/);
  const fee = page.getByRole('textbox', { name: 'Platinum Card annual fee' });
  await fee.fill('695');
  await expect(page.getByText('Custom', { exact: true })).toBeVisible();
  await expect(page.getByTestId('summary-fees')).toHaveText('$695');
  await page.getByRole('button', { name: 'Use standard $895' }).click();
  await expect(fee).toHaveValue('895');
});

test('cards live in tabs; arrow keys switch; remove with undo', async ({ page }) => {
  await addCards(page, /Add American Express Gold Card/, /Add Capital One Venture X/);
  await expect(page.getByRole('tab')).toHaveCount(2);
  await selectTab(page, /Gold Card/);
  await page.getByRole('slider', { name: /^Dining credit/ }).fill('100');
  await page.getByRole('tab', { name: /Gold Card/ }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: /Venture X/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByRole('tabpanel')).toContainText('Venture X');

  await selectTab(page, /Gold Card/);
  await page.getByRole('button', { name: 'Remove from wallet' }).click();
  await expect(page.getByRole('tab')).toHaveCount(1);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(verdict(page, 'amex-gold')).toHaveText('Costs $205/yr');
});

test('clear all values asks first', async ({ page }) => {
  await addCards(page, /Add American Express Gold Card/);
  await page.getByRole('slider', { name: /^Dining credit/ }).fill('100');
  page.once('dialog', (d) => void d.dismiss());
  await page.getByRole('button', { name: 'Clear all values' }).click();
  await expect(verdict(page, 'amex-gold')).toHaveText('Costs $205/yr');
  page.once('dialog', (d) => void d.accept());
  await page.getByRole('button', { name: 'Clear all values' }).click();
  await expect(verdict(page, 'amex-gold')).toHaveText('Costs $325/yr');
});

test('picker: issuer tabs and search', async ({ page }) => {
  await page.getByRole('button', { name: /^Value the cards I have/ }).click();
  const picker = page.getByRole('dialog', { name: 'Add a card' });
  await picker.getByRole('tab', { name: 'Chase' }).click();
  await expect(picker.getByRole('button', { name: /^Add / })).toHaveCount(2);
  await picker.getByRole('tab', { name: 'All' }).click();
  await picker.getByLabel('Search cards').fill('venture');
  await expect(picker.getByRole('button', { name: /^Add / })).toHaveCount(1);
  // Escape in a search box with text first clears it (browser behavior), then closes.
  await page.keyboard.press('Escape');
  if (await picker.isVisible()) await page.keyboard.press('Escape');
  await expect(picker).toBeHidden();
});
