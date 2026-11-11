// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * Saves the fully rendered text of an issuer's card page, for verifying catalog data.
 * Many issuer pages lazy-load their benefits, so a plain HTTP fetch misses them; this opens
 * the page in Playwright's Chromium, scrolls to the bottom so everything loads, opens
 * collapsed benefit lists ("Explore All", "Expand All"), and writes
 * the visible text to notes/issuer-pages/ (gitignored).
 *
 *   npm run catalog:fetch -- <url> [name]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const [url, nameArg] = process.argv.slice(2);
if (!url) {
  console.error('Usage: npm run catalog:fetch -- <url> [name]');
  process.exit(1);
}
const name = nameArg ?? new URL(url).pathname.split('/').filter(Boolean).pop() ?? 'page';
const outDir = join(import.meta.dirname, '../notes/issuer-pages');
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(3000);
  for (let i = 0; i < 40; i++) {
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(2000);
  // Amex lists only "Featured Benefits" until "Explore All" opens the full list, whose
  // descriptions stay collapsed until "Expand All". Click each if the page has it.
  for (const label of ['Explore All', 'Expand All']) {
    const button = page.getByText(label, { exact: true }).first();
    if ((await button.count()) === 0) continue;
    try {
      await button.scrollIntoViewIfNeeded({ timeout: 5000 });
      await button.click({ timeout: 5000 });
      await page.waitForTimeout(2000);
      console.log(`Clicked "${label}"`);
    } catch {
      console.warn(`Found "${label}" but could not click it; the text may be incomplete.`);
    }
  }
  // Read via a locator: some pages' content security policy blocks page.evaluate.
  const text = await page.locator('body').innerText();
  const date = new Date().toISOString().slice(0, 10);
  const file = join(outDir, `${date}-${name}.txt`);
  writeFileSync(file, `${url}\nFetched ${new Date().toISOString()}\n\n${text}\n`);
  console.log(`Saved ${text.length} characters to ${file}`);
} finally {
  await browser.close();
}
