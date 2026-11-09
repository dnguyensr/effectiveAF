// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * Generates dist/sw.js after `vite build`: the template plus the exact list of built files to
 * precache and a version derived from their contents, so every deploy gets a fresh cache.
 *
 *   node scripts/build-sw.mjs [distDir]
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

/** Built files worth caching for offline use (no source maps, not the worker itself). */
export function precacheList(files) {
  const rest = files
    .filter((f) => !f.endsWith('.map') && f !== 'sw.js' && f !== 'index.html')
    .sort()
    .map((f) => `./${f}`);
  // The page itself is cached under the scope URL; it comes first.
  return files.includes('index.html') ? ['./', ...rest] : rest;
}

export function renderServiceWorker(template, precache, version) {
  return template
    .replace('__VERSION__', version)
    .replace('__PRECACHE__', JSON.stringify(precache, null, 2));
}

function listFiles(dir, root = dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory()
      ? listFiles(path, root)
      : [relative(root, path).replaceAll('\\', '/')];
  });
}

function main(dist) {
  const files = listFiles(dist);
  const hash = createHash('sha256');
  for (const f of files.sort()) {
    if (f === 'sw.js') continue;
    hash.update(f);
    hash.update(readFileSync(join(dist, f)));
  }
  const version = hash.digest('hex').slice(0, 12);
  const template = readFileSync(join(import.meta.dirname, 'sw/sw.template.js'), 'utf8');
  const precache = precacheList(files);
  writeFileSync(join(dist, 'sw.js'), renderServiceWorker(template, precache, version));
  console.log(`Wrote sw.js (version ${version}, ${precache.length} files precached)`);
}

if (process.argv[1] && import.meta.filename === process.argv[1]) {
  main(process.argv[2] ?? join(import.meta.dirname, '../dist'));
}
