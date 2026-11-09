// SPDX-License-Identifier: GPL-3.0-or-later
import { addCards, expect, seriousViolations, test } from './fixtures';

test('loads at the GitHub Pages base path without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  await page.goto('./');
  await expect(page).toHaveTitle(/effectiveAF/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('effectiveAF');
  expect(errors).toEqual([]);
});

test('serves the third-party license notices', async ({ page, request }) => {
  await page.goto('./');
  const href = await page.getByRole('link', { name: 'Third-party notices' }).getAttribute('href');
  expect(href).toBe('/effectiveAF/third-party-licenses.txt');
  const res = await request.get(href ?? '');
  expect(res.ok()).toBe(true);
  const body = await res.text();
  expect(body).toContain('preact');
  expect(body).toContain('zod');
});

test.describe('accessibility (axe)', () => {
  test('first-visit screen', async ({ page }) => {
    await page.goto('./');
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('wallet: tabs, a set perk, a skipped perk, a custom fee', async ({ page }) => {
    await page.goto('./');
    await addCards(page, /Add American Express Platinum Card/, /Add Chase Sapphire Reserve/);
    await page.getByRole('tab', { name: /Platinum Card/ }).click();
    await page.getByRole('slider', { name: /^Resy dining credit/ }).fill('50');
    await page.getByRole('checkbox', { name: "Won't use Equinox credit" }).check();
    await page.getByRole('textbox', { name: 'Platinum Card annual fee' }).fill('695');
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('dark theme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('./');
    await addCards(page, /Add American Express Gold Card/);
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('card picker and backup dialogs', async ({ page, browserName }) => {
    // Playwright's Firefox build crashes the page when axe runs inside an open modal <dialog>.
    test.skip(
      browserName === 'firefox',
      'Playwright Firefox crashes running axe in a modal dialog',
    );
    await page.goto('./');
    await page.getByRole('button', { name: /^Value the cards I have/ }).click();
    expect(await seriousViolations(page)).toEqual([]);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Back up or restore' }).click();
    await page.getByLabel('Or paste backup text').fill('nope');
    await page.getByRole('button', { name: 'Check backup' }).click();
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('keyboard only: choose, add a card, change a value', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'WebKit skips buttons on Tab unless the OS setting is on');
    await page.goto('./');
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      const onChoice = await page.evaluate(
        () => document.activeElement?.classList.contains('choice') ?? false,
      );
      if (onChoice) break;
    }
    await page.keyboard.press('Enter');
    const picker = page.getByRole('dialog', { name: 'Add a card' });
    await expect(picker).toBeVisible();
    // Focus starts inside the modal; Tab until the first "Add" button.
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Tab');
      const name = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
      if (name?.startsWith('Add ')) break;
    }
    await page.keyboard.press('Enter');
    await page.keyboard.press('Escape');
    await expect(picker).toBeHidden();
    await expect(page.getByTestId('verdict-amex-platinum')).toBeVisible();
    await page.getByRole('slider', { name: /^Hotel credit/ }).focus();
    await page.keyboard.press('End');
    await expect(page.getByTestId('realized-amex-platinum.hotel')).toContainText('$600');
  });
});

test('no horizontal page scrolling at phone width', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('./');
  await addCards(
    page,
    /Add American Express Platinum Card/,
    /Add American Express Gold Card/,
    /Add Chase Sapphire Reserve/,
    /Add Capital One Venture X/,
  );
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
