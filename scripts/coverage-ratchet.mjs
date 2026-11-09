// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * Coverage ratchet: per-file coverage may only go up.
 *
 *   node scripts/coverage-ratchet.mjs check    (after `vitest run --coverage`)
 *   node scripts/coverage-ratchet.mjs update   (record current numbers as the new baseline)
 *
 * check fails when:
 *   - a file in the baseline drops more than TOLERANCE points on any metric, or
 *   - a file not in the baseline (new code) is below the NEW_FILE floor.
 * The baseline lives in tests/baselines/coverage.json and is reviewed like any other baseline.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const SUMMARY = join(ROOT, 'coverage/coverage-summary.json');
const BASELINE = join(ROOT, 'tests/baselines/coverage.json');
const METRICS = ['lines', 'branches', 'functions', 'statements'];
export const TOLERANCE = 0.5;
export const NEW_FILE = { lines: 90, branches: 85, functions: 90, statements: 90 };

export function readCurrent(summaryJson, root = ROOT) {
  const current = {};
  for (const [file, data] of Object.entries(summaryJson)) {
    if (file === 'total') continue;
    const rel = relative(root, file).replaceAll('\\', '/');
    current[rel] = Object.fromEntries(METRICS.map((m) => [m, data[m].pct]));
  }
  return current;
}

/** Returns a list of human-readable problems; empty means the ratchet holds. */
export function compare(current, baseline) {
  const problems = [];
  for (const [file, cov] of Object.entries(current)) {
    const base = baseline[file];
    for (const m of METRICS) {
      if (base) {
        if (cov[m] < base[m] - TOLERANCE) {
          problems.push(`${file}: ${m} fell from ${base[m]}% to ${cov[m]}%`);
        }
      } else if (cov[m] < NEW_FILE[m]) {
        problems.push(`${file} (new): ${m} is ${cov[m]}%, new files need ${NEW_FILE[m]}%`);
      }
    }
  }
  return problems;
}

function main(mode) {
  if (!existsSync(SUMMARY)) {
    console.error('No coverage/coverage-summary.json: run `vitest run --coverage` first.');
    process.exit(1);
  }
  const current = readCurrent(JSON.parse(readFileSync(SUMMARY, 'utf8')));
  if (mode === 'update') {
    const sorted = Object.fromEntries(
      Object.entries(current).sort(([a], [b]) => a.localeCompare(b)),
    );
    writeFileSync(BASELINE, `${JSON.stringify(sorted, null, 2)}\n`);
    console.log(`Coverage baseline updated for ${Object.keys(sorted).length} files.`);
    return;
  }
  const baseline = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : {};
  const problems = compare(current, baseline);
  if (problems.length > 0) {
    console.error('Coverage ratchet failed: add tests for the code below.');
    for (const p of problems) console.error(`  - ${p}`);
    console.error('If coverage legitimately rose, record it with `npm run coverage:update`.');
    process.exit(1);
  }
  console.log(`Coverage ratchet holds for ${Object.keys(current).length} files.`);
}

const mode = process.argv[2];
if (mode === 'check' || mode === 'update') main(mode);
else if (mode !== undefined) {
  console.error('Usage: node scripts/coverage-ratchet.mjs check|update');
  process.exit(1);
}
