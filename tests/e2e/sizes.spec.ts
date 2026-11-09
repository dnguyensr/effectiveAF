// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * Readability and touch-target guards (WCAG 2.2, AAA where practical):
 *  - no visible text under 14px, and body text at least 1.5 line height
 *  - every standalone control at least 44 × 44 px (2.5.5); links and buttons inside a sentence
 *    are exempt, as WCAG allows for inline targets
 */
import type { Page } from '@playwright/test';
import { addCards, compareCards, expect, test } from './fixtures';

interface Problem {
  what: string;
  detail: string;
}

async function measure(page: Page): Promise<Problem[]> {
  return page.evaluate(() => {
    const problems: { what: string; detail: string }[] = [];
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return (
        r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && !el.closest('.visually-hidden')
      );
    };
    const label = (el: Element) =>
      `${el.tagName.toLowerCase()}${el.className ? `.${String(el.className).split(' ')[0]}` : ''} "${(el.textContent ?? '').trim().slice(0, 30)}"`;

    // Text size and line height, for every element that directly holds text.
    for (const el of Array.from(document.querySelectorAll('body *'))) {
      if (!visible(el)) continue;
      const ownText = Array.from(el.childNodes).some(
        (n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim() !== '',
      );
      if (!ownText) continue;
      const cs = getComputedStyle(el);
      const size = parseFloat(cs.fontSize);
      if (size < 13.9) problems.push({ what: 'font < 14px', detail: `${label(el)} ${size}px` });
      if (el.tagName === 'P' || el.tagName === 'LI') {
        const lh = parseFloat(cs.lineHeight);
        if (Number.isFinite(lh) && lh / size < 1.45) {
          problems.push({ what: 'line-height < 1.5', detail: `${label(el)} ${lh}/${size}` });
        }
      }
    }

    // Touch targets.
    const inline = (el: Element) =>
      el.closest('p, li, .perk-desc, .resetting, .site-footer, .source') !== null &&
      !el.closest('.picker-row, .perk-quick');
    const targets = document.querySelectorAll(
      'button, a[href], select, input:not([type="checkbox"]):not([type="file"]), [role="tab"], .picker-check',
    );
    for (const el of Array.from(targets)) {
      if (!visible(el) || inline(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.height < 43.5 || r.width < 43.5) {
        problems.push({
          what: 'target < 44px',
          detail: `${label(el)} ${Math.round(r.width)}×${Math.round(r.height)}`,
        });
      }
    }
    return problems;
  });
}

for (const [device, viewport] of [
  ['phone', { width: 360, height: 780 }],
  ['desktop', { width: 1100, height: 900 }],
] as const) {
  test.describe(device, () => {
    test.use({ viewport });

    test('wallet, picker and comparison meet size guidelines', async ({ page }) => {
      await page.goto('./');
      expect(await measure(page), 'first visit').toEqual([]);

      await page.getByRole('button', { name: /^Value the cards I have/ }).click();
      expect(await measure(page), 'card picker').toEqual([]);
      await page.keyboard.press('Escape');

      await addCards(page, /Add American Express Platinum Card/, /Add Capital One Venture X$/);
      await page.getByRole('tab', { name: /Platinum/ }).click();
      await page.getByRole('slider', { name: /^Hotel credit/ }).fill('50');
      expect(await measure(page), 'wallet').toEqual([]);

      await page.getByRole('link', { name: 'Compare' }).click();
      await compareCards(
        page,
        /Compare American Express Gold Card/,
        /Compare Chase Sapphire Reserve$/,
      );
      expect(await measure(page), 'comparison').toEqual([]);
    });
  });
}

test('body text is 1rem on wide screens and 14px minimum on narrow ones', async ({ page }) => {
  const sizeAt = async (width: number) => {
    await page.setViewportSize({ width, height: 800 });
    return page.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize));
  };
  await page.goto('./');
  expect(await sizeAt(320)).toBeCloseTo(14, 0);
  expect(await sizeAt(1200)).toBe(16);
});
