// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * Dependency license tooling, with no third-party dependencies.
 *
 *   node scripts/licenses.mjs check
 *     Fails if any installed package (prod or dev) has a license that is not on the
 *     GPL-3.0-compatible allow list below.
 *
 *   node scripts/licenses.mjs notices <outfile>
 *     Writes the license texts of all production dependencies (the code that ends up in
 *     the bundle) to <outfile>. Run after `vite build` so it lands in dist/.
 */
import { execSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/** SPDX identifiers that may be combined into a GPL-3.0-or-later work. */
export const ALLOWED = new Set([
  'MIT',
  'MIT-0',
  'ISC',
  '0BSD',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'Apache-2.0',
  'MPL-2.0',
  'BlueOak-1.0.0',
  'CC0-1.0',
  'CC-BY-4.0', // data only (caniuse-lite); not code
  'Unlicense',
  'Python-2.0',
  'LGPL-3.0-or-later',
  'GPL-3.0-or-later',
]);

/**
 * Evaluates a simple SPDX expression ("MIT", "(MIT OR Apache-2.0)", "MIT AND ISC").
 * OR: any branch allowed. AND: every part allowed. Nested parentheses aren't used by
 * npm packages in practice; anything unparseable is treated as not allowed.
 */
export function isAllowed(expression) {
  if (typeof expression !== 'string' || expression.trim() === '') return false;
  const expr = expression.trim().replace(/^\((.*)\)$/, '$1');
  if (/[()]/.test(expr)) return false;
  return expr
    .split(/\s+OR\s+/)
    .some((branch) => branch.split(/\s+AND\s+/).every((id) => ALLOWED.has(id.trim())));
}

function licenseOf(pkg) {
  const l = pkg.license ?? pkg.licenses;
  if (typeof l === 'string') return l;
  if (Array.isArray(l)) return l.map((x) => (typeof x === 'string' ? x : x.type)).join(' OR ');
  if (l && typeof l === 'object') return l.type;
  return undefined;
}

function query(selector) {
  const out = execSync(`npm query "${selector}"`, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  // Skip the project itself (location "").
  return JSON.parse(out).filter((p) => p.location !== '');
}

function check() {
  const pkgs = query('*');
  const bad = pkgs.filter((p) => !isAllowed(licenseOf(p)));
  if (bad.length > 0) {
    console.error('Dependencies with licenses not on the GPL-3.0-compatible allow list:');
    for (const p of bad) console.error(`  ${p.name}@${p.version}: ${licenseOf(p) ?? '(none)'}`);
    console.error(
      'Review compatibility, then update ALLOWED in scripts/licenses.mjs if acceptable.',
    );
    process.exit(1);
  }
  console.log(`License check passed: ${pkgs.length} packages, all GPL-3.0 compatible.`);
}

function readLicenseText(dir) {
  let files;
  try {
    files = readdirSync(dir);
  } catch {
    return undefined;
  }
  const file = files.find((f) => /^(licen[cs]e|copying)(\.|-|$)/i.test(f));
  return file ? readFileSync(join(dir, file), 'utf8').trim() : undefined;
}

function notices(outfile) {
  if (!outfile) throw new Error('Usage: node scripts/licenses.mjs notices <outfile>');
  const pkgs = query('.prod').sort((a, b) => a.name.localeCompare(b.name));
  const seen = new Set();
  const sections = [];
  for (const p of pkgs) {
    const key = `${p.name}@${p.version}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const text =
      readLicenseText(p.path) ?? `License: ${licenseOf(p) ?? 'unknown'} (no license file shipped)`;
    sections.push(
      `${'='.repeat(72)}\n${key}  (${licenseOf(p) ?? 'unknown'})\n${'='.repeat(72)}\n\n${text}\n`,
    );
  }
  const header =
    'effectiveAF is licensed under GPL-3.0-or-later.\n' +
    'Source: https://github.com/dnguyensr/effectiveAF\n\n' +
    'This file lists the third-party software included in the built application\n' +
    'and reproduces their license notices.\n\n';
  mkdirSync(dirname(outfile), { recursive: true });
  writeFileSync(outfile, header + sections.join('\n'));
  console.log(`Wrote ${sections.length} third-party notices to ${outfile}`);
}

const [command, arg] = process.argv.slice(2);
if (command === 'check') check();
else if (command === 'notices') notices(arg);
else if (command !== undefined) {
  console.error(`Unknown command "${command}". Use "check" or "notices <outfile>".`);
  process.exit(1);
}
