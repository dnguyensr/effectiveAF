// SPDX-License-Identifier: GPL-3.0-or-later
import { expect, seriousViolations, test, waitForSaved } from './fixtures';

test('a card can be one you have or one you are considering', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: /^Value the cards I have/ }).click();
  const picker = page.getByRole('dialog', { name: 'Add a card' });
  await picker.getByRole('button', { name: /^Add American Express Gold Card/ }).click();
  await picker.getByRole('button', { name: 'Considering: add Chase Sapphire Reserve' }).click();
  await picker.getByRole('button', { name: 'Close' }).click();

  await expect(page.getByTestId('verdict-chase-sapphire-reserve')).toHaveText('Would cost $795/yr');
  await expect(page.getByRole('tab', { name: /Sapphire Reserve/ })).toContainText('Considering');
  await expect(page.getByTestId('summary-fees')).toHaveText('$325');
  await expect(page.getByTestId('summary-considering')).toHaveText(
    'Not counted above: considering 1 card, which would cost $795/yr after credits.',
  );
  expect(await seriousViolations(page)).toEqual([]);

  await waitForSaved(page, "s.cards['chase-sapphire-reserve']?.ownership === 'considering'");
  await page.reload();
  await page.getByRole('tab', { name: /Sapphire Reserve/ }).click();
  const status = page.getByRole('group', { name: 'Do you have the Sapphire Reserve?' });
  await status.getByRole('button', { name: 'I have this card' }).click();
  await expect(page.getByTestId('verdict-chase-sapphire-reserve')).toHaveText('Costs $795/yr');
  await expect(page.getByTestId('summary-fees')).toHaveText('$1,120');
});
