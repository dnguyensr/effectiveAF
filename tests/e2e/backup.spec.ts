// SPDX-License-Identifier: GPL-3.0-or-later
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CURRENT_SCHEMA_VERSION } from '../../src/state/schema';
import { addCards, expect, selectTab, setFee, test, verdict, waitForSaved } from './fixtures';

test('export, clear everything, import: identical result', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'Mobile WebKit does not expose downloads to Playwright');
  await page.goto('./');
  await addCards(page, /Add American Express Gold Card/, /Add Chase Sapphire Preferred/);
  await selectTab(page, /Gold Card/);
  await setFee(page, 'Gold Card', '0');
  await waitForSaved(page, "s.cards['amex-gold']?.feeOverrideCents === 0");
  const before = await page.getByTestId('summary-effective').textContent();

  await page.getByRole('button', { name: 'Back up or restore' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download backup file' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('effectiveaf-backup-2026-11-08.json');
  const path = await download.path();
  const backup = readFileSync(path, 'utf8');
  expect(JSON.parse(backup)).toMatchObject({
    app: 'effectiveAF',
    schemaVersion: CURRENT_SCHEMA_VERSION,
  });

  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByText(/Your wallet is empty/)).toBeVisible();

  await page.getByRole('button', { name: 'Back up or restore' }).click();
  await page.getByLabel('Choose a backup file').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(backup),
  });
  await expect(page.getByText(/This backup has 2 cards/)).toBeVisible();
  await page.getByRole('button', { name: 'Replace my data' }).click();
  await expect(page.getByText('Backup restored.')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();

  await expect(page.getByTestId('summary-effective')).toHaveText(before ?? '');
  await selectTab(page, /Gold Card/);
  await expect(verdict(page, 'amex-gold')).toHaveText('Pays for itself (+$0)');
});

test('pasted backups are validated before anything changes', async ({ page }) => {
  await page.goto('./');
  await addCards(page, /Add Capital One Venture X$/);
  await page.getByRole('button', { name: 'Back up or restore' }).click();
  const dialog = page.getByRole('dialog', { name: 'Back up or restore' });
  await expect(dialog).toBeVisible();

  const paste = dialog.getByLabel('Or paste backup text');
  await paste.fill('{"oops": true');
  await dialog.getByRole('button', { name: 'Check backup' }).click();
  await expect(dialog.getByRole('alert')).toContainText("isn't valid JSON");

  const malicious = readFileSync(
    join(import.meta.dirname, '../fixtures/bad-imports/proto-pollution.json'),
    'utf8',
  );
  await paste.fill(malicious);
  await dialog.getByRole('button', { name: 'Check backup' }).click();
  await expect(dialog.getByRole('alert')).toContainText('doesn’t understand');

  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toBeHidden();
  await expect(verdict(page, 'capital-one-venture-x')).toHaveText('Costs $395/yr');
});

test('Escape closes the dialog', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Back up or restore' }).click();
  const dialog = page.getByRole('dialog', { name: 'Back up or restore' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  // And it can be opened again.
  await page.getByRole('button', { name: 'Back up or restore' }).click();
  await expect(dialog).toBeVisible();
});
