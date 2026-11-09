// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * Screenshot baselines. Font rendering differs between operating systems, so baselines
 * exist only for Linux (the CI image). Create or update them with `npm run test:e2e:update`
 * (Docker) or the "Update screenshots" GitHub Actions workflow, never on Windows/macOS.
 */
import { existsSync } from 'node:fs';
import type { Page, TestInfo } from '@playwright/test';
import { addCards, compareCards, expect, perkChip, setFee, test } from './fixtures';

test.skip(process.platform !== 'linux', 'Screenshot baselines are Linux-only; use test:e2e:docker');

async function snap(page: Page, testInfo: TestInfo, name: string) {
  const updating = ['all', 'changed', 'missing'].includes(testInfo.config.updateSnapshots);
  const baseline = testInfo.snapshotPath(name, { kind: 'screenshot' });
  test.skip(
    !updating && !existsSync(baseline),
    `No baseline yet for ${name}; run the "Update screenshots" workflow`,
  );
  await expect(page).toHaveScreenshot(name, { fullPage: true });
}

for (const scheme of ['light', 'dark'] as const) {
  // Tagged so CI can run screenshots separately (non-blocking while the views are changing).
  test.describe(`${scheme} theme`, { tag: '@visual' }, () => {
    test.use({ colorScheme: scheme });

    test('first visit', async ({ page }, testInfo) => {
      await page.goto('./');
      await snap(page, testInfo, `empty-${scheme}.png`);
    });

    test('Gold card with values, a skipped perk and a custom fee', async ({ page }, testInfo) => {
      await page.goto('./');
      await addCards(page, /Add American Express Gold Card/);
      await page.getByRole('slider', { name: /^Dining credit/ }).fill('75');
      await perkChip(page, "Dunkin' credit", "Won't use").click();
      await perkChip(page, 'Uber Cash', 'Half').click();
      await setFee(page, 'Gold Card', '250');
      await page.getByRole('heading', { level: 1 }).click(); // blur the field
      await snap(page, testInfo, `gold-${scheme}.png`);
    });

    test('comparison of three cards', async ({ page }, testInfo) => {
      await page.goto('./');
      await compareCards(
        page,
        /Compare American Express Platinum Card/,
        /Compare Chase Sapphire Reserve$/,
        /Compare Capital One Venture X$/,
      );
      await snap(page, testInfo, `compare-${scheme}.png`);
    });
  });
}
