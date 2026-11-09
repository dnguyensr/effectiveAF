// SPDX-License-Identifier: GPL-3.0-or-later
import { addCards, expect, seriousViolations, test, waitForSaved } from './fixtures';

test('pay-in-full question, asterisk explanation and "apply to all"', async ({ page }) => {
  await page.goto('./');
  await addCards(page, /Add American Express Gold Card/, /Add Capital One Venture X$/);
  const header = page.getByTestId('card-header-capital-one-venture-x');
  const star = header.getByRole('button', { name: 'Why the asterisk?' });
  await star.click();
  await expect(header.getByRole('note')).toContainText(
    'You haven’t confirmed that for this card yet.',
  );
  expect(await seriousViolations(page)).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(header.getByRole('note')).toHaveCount(0);

  const question = page.getByRole('group', {
    name: "Will you pay this card's statement balance in full every month?",
  });
  await question.getByRole('button', { name: 'Yes' }).click();
  await expect(star).toHaveCount(0);
  await question.getByRole('button', { name: 'Use this answer for all my cards' }).click();
  await expect(
    page.getByRole('region', { name: 'Wallet summary' }).getByRole('button', {
      name: 'Why the asterisk?',
    }),
  ).toHaveCount(0);

  await waitForSaved(page, "s.cards['amex-gold']?.paysInFull === true");
  await page.reload();
  await page.getByRole('tab', { name: /Gold Card/ }).click();
  await expect(
    page.getByTestId('card-header-amex-gold').getByRole('button', { name: 'Why the asterisk?' }),
  ).toHaveCount(0);
});
