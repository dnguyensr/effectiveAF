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
  // Read via a locator: some pages' content security policy blocks page.evaluate.
  const readBody = () => page.locator('body').innerText();
  const clickIfPresent = async (button, label) => {
    try {
      await button.scrollIntoViewIfNeeded({ timeout: 5000 });
      await button.click({ timeout: 5000 });
      await page.waitForTimeout(2000);
      console.log(`Clicked "${label}"`);
      return true;
    } catch {
      console.warn(`Found "${label}" but could not click it; the text may be incomplete.`);
      return false;
    }
  };
  // Amex lists only "Featured Benefits" per section until that section's "Explore All" opens
  // its full list in a drawer, whose descriptions stay collapsed until "Expand All". Open
  // each section in turn, save its text, and close the drawer before the next one.
  // Amex's "Show Value Breakdown" lists the credits the issuer counts toward the card's value.
  const breakdown = page.getByText('Show Value Breakdown', { exact: true }).first();
  if ((await breakdown.count()) > 0) await clickIfPresent(breakdown, 'Show Value Breakdown');
  let text = await readBody();
  const exploreCount = await page.getByText('Explore All', { exact: true }).count();
  for (let i = 0; i < exploreCount; i++) {
    const explore = page.getByText('Explore All', { exact: true }).nth(i);
    if (!(await clickIfPresent(explore, `Explore All (${i + 1} of ${exploreCount})`))) continue;
    const expand = page.getByText('Expand All', { exact: true }).first();
    if ((await expand.count()) > 0) await clickIfPresent(expand, 'Expand All');
    text += `\n\n=== Explore All, section ${i + 1} of ${exploreCount} ===\n\n${await readBody()}`;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
  }
  if (exploreCount === 0) {
    const expand = page.getByText('Expand All', { exact: true }).first();
    if ((await expand.count()) > 0 && (await clickIfPresent(expand, 'Expand All'))) {
      text = await readBody();
    }
  }
  const date = new Date().toISOString().slice(0, 10);
  const file = join(outDir, `${date}-${name}.txt`);
  writeFileSync(file, `${url}\nFetched ${new Date().toISOString()}\n\n${text}\n`);
  console.log(`Saved ${text.length} characters to ${file}`);
} finally {
  await browser.close();
}
