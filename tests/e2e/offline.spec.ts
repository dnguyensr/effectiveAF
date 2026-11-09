// SPDX-License-Identifier: GPL-3.0-or-later
import { addCards, expect, test, verdict, waitForSaved } from './fixtures';

test('is installable: manifest and icons are served', async ({ page, request }) => {
  await page.goto('./');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBe('/effectiveAF/manifest.webmanifest');
  const manifest = await (await request.get(href ?? '')).json();
  expect(manifest).toMatchObject({ short_name: 'effectiveAF', display: 'standalone', scope: './' });
  for (const icon of manifest.icons as { src: string }[]) {
    const res = await request.get(`/effectiveAF/${icon.src}`);
    expect(res.ok(), icon.src).toBe(true);
  }
});

test('works offline after the first visit', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'Offline service-worker emulation is reliable in Chromium');
  await page.goto('./');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await addCards(page, /Add American Express Gold Card/);
  await page.getByRole('slider', { name: /^Dining credit/ }).fill('100');
  await waitForSaved(page, "s.cards['amex-gold']?.perks['amex-gold.dining']?.percent === 100");

  await context.setOffline(true);
  await page.reload();
  await expect(verdict(page, 'amex-gold')).toHaveText('Costs $205/yr');
  await page.getByRole('slider', { name: /^Uber Cash/ }).fill('100');
  await expect(verdict(page, 'amex-gold')).toHaveText('Costs $85/yr');
  await context.setOffline(false);
});
