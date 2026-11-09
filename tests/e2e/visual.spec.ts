// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * Screenshot baselines. Font rendering differs between operating systems, so baselines
 * exist only for Linux (the CI image). Create or update them with `npm run test:e2e:update`
 * (Docker) or the "Update screenshots" GitHub Actions workflow, never on Windows/macOS.
 */
import { existsSync } from 'node:fs';
import type { Page, TestInfo } from '@playwright/test';
import { addCard, expect, test } from './fixtures';

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
  test.describe(`${scheme} theme`, () => {
    test.use({ colorScheme: scheme });

    test('empty wallet', async ({ page }, testInfo) => {
      await page.goto('./');
      await snap(page, testInfo, `empty-${scheme}.png`);
    });

    test('Gold card with a perk off and a custom fee', async ({ page }, testInfo) => {
      await page.goto('./');
      await addCard(page, /Add American Express Gold Card/);
      await page.getByRole('checkbox', { name: "Use Dunkin' credit" }).uncheck();
      await page.getByRole('textbox', { name: 'Gold Card annual fee' }).fill('250');
      await page.getByRole('heading', { level: 1 }).click(); // blur the field
      await snap(page, testInfo, `gold-${scheme}.png`);
    });
  });
}
