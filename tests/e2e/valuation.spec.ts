// SPDX-License-Identifier: GPL-3.0-or-later
import { addCards, expect, perkChip, selectTab, setFee, test, verdict } from './fixtures';

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
  await addCards(page, /Add Capital One Venture X$/);
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
  await addCards(page, /Add Capital One Venture X$/);
  const slider = page.getByRole('slider', { name: /^Capital One Travel credit/ });
  await slider.focus();
  await page.keyboard.press('End');
  await expect(slider).toHaveValue('100');
  await page.keyboard.press('ArrowLeft');
  await expect(slider).toHaveValue('99');
  await expect(page.getByTestId('realized-capital-one-venture-x.travel')).toContainText('$297');
});

test("quick values: won't use is $0, half and full, and won't use again clears", async ({
  page,
}) => {
  await addCards(page, /Add American Express Gold Card/);
  await perkChip(page, "Dunkin' credit", 'Full').click();
  await expect(page.getByRole('textbox', { name: /^Dunkin/ })).toHaveValue('84');
  await expect(verdict(page, 'amex-gold')).toHaveText('Costs $241/yr');
  await perkChip(page, "Dunkin' credit", 'Half').click();
  await expect(perkChip(page, "Dunkin' credit", 'Half')).toHaveAttribute('aria-pressed', 'true');
  await expect(verdict(page, 'amex-gold')).toHaveText('Costs $283/yr');
  const wontUse = perkChip(page, "Dunkin' credit", "Won't use");
  await wontUse.click();
  await expect(page.getByTestId('realized-amex-gold.dunkin')).toContainText("Won't use");
  await expect(page.getByRole('textbox', { name: /^Dunkin/ })).toHaveValue('0');
  await expect(verdict(page, 'amex-gold')).toHaveText('Costs $325/yr');
  await wontUse.click();
  await expect(page.getByTestId('realized-amex-gold.dunkin')).toContainText('Not set');
});

test('presets: full, half, travel & dining, clear all', async ({ page }) => {
  await addCards(page, /Add American Express Platinum Card/);
  const bar = page.getByRole('group', { name: 'Quick-set Platinum Card credits' });
  await bar.getByRole('button', { name: 'Full value', exact: true }).click();
  await expect(verdict(page, 'amex-platinum')).toHaveText('Pays for itself (+$2,129)');
  await bar.getByRole('button', { name: 'Half value', exact: true }).click();
  await expect(verdict(page, 'amex-platinum')).toHaveText('Pays for itself (+$618)');
  await bar.getByRole('button', { name: 'Travel & dining at full value' }).click();
  await expect(verdict(page, 'amex-platinum')).toHaveText('Pays for itself (+$754)');
  await expect(perkChip(page, 'Equinox credit', "Won't use")).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await bar.getByRole('button', { name: 'Clear all (no value)' }).click();
  await expect(verdict(page, 'amex-platinum')).toHaveText('Costs $895/yr');
});

test('fee is locked until unlocked; override shows a badge and can be reset', async ({ page }) => {
  await addCards(page, /Add American Express Platinum Card/);
  const fee = page.getByRole('textbox', { name: 'Platinum Card annual fee' });
  await expect(fee).not.toBeEditable();
  await setFee(page, 'Platinum Card', '695');
  await expect(page.getByText('Custom', { exact: true })).toBeVisible();
  await expect(page.getByTestId('summary-fees')).toHaveText('$695');
  await page.getByRole('button', { name: 'Use standard $895' }).click();
  await expect(fee).toHaveValue('895');
  await page.getByRole('button', { name: 'Lock Platinum Card annual fee' }).click();
  await expect(fee).not.toBeEditable();
});

test('the card header stays pinned while scrolling through its perks', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await addCards(page, /Add American Express Platinum Card/);
  const header = page.getByTestId('card-header-amex-platinum');
  await page.getByRole('heading', { name: 'Oura Ring credit' }).scrollIntoViewIfNeeded();
  await expect(header).toBeInViewport();
  const box = await header.boundingBox();
  expect(box?.y ?? -1).toBeGreaterThanOrEqual(-1);
  expect(box?.y ?? 999).toBeLessThan(5);
  await expect(header).toContainText('Costs $895/yr');
});

test('cards live in tabs; arrow keys switch; remove with undo', async ({ page }) => {
  await addCards(page, /Add American Express Gold Card/, /Add Capital One Venture X$/);
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
  await expect(picker.getByRole('button', { name: /^Add / })).toHaveCount(3);
  await picker.getByRole('tab', { name: 'All' }).click();
  await picker.getByLabel('Search cards').fill('venture');
  await expect(picker.getByRole('button', { name: /^Add / })).toHaveCount(2);
  // Escape in a search box with text first clears it (browser behavior), then closes.
  await page.keyboard.press('Escape');
  if (await picker.isVisible()) await page.keyboard.press('Escape');
  await expect(picker).toBeHidden();
});
