// SPDX-License-Identifier: GPL-3.0-or-later
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error -- plain .mjs script without type declarations
import { precacheList, renderServiceWorker } from '../../../scripts/build-sw.mjs';

describe('service worker build', () => {
  it('precaches the built files, the page as "./", and skips maps and itself', () => {
    expect(
      precacheList([
        'index.html',
        'assets/index-abc.js',
        'assets/index-abc.js.map',
        'assets/index-def.css',
        'sw.js',
        'favicon.svg',
      ]),
    ).toEqual(['./', './assets/index-abc.js', './assets/index-def.css', './favicon.svg']);
  });

  it('fills the template with the version and the list', () => {
    const template = readFileSync(join(__dirname, '../../../scripts/sw/sw.template.js'), 'utf8');
    const sw = renderServiceWorker(template, ['./', './a.js'], 'v123');
    expect(sw).toContain("const VERSION = 'v123';");
    expect(sw).toContain('const PRECACHE = [\n  "./",\n  "./a.js"\n];');
    expect(sw).not.toContain('__');
  });
});
