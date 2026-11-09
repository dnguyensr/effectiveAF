// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * Lists catalog cards whose `lastVerified` date is older than N days (default 90).
 * Prints a Markdown list and exits 0 either way; writes `stale=true|false` to
 * $GITHUB_OUTPUT when running in GitHub Actions.
 *
 *   node scripts/catalog-staleness.mjs [maxAgeDays]
 */
import { appendFileSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const maxAgeDays = Number(process.argv[2] ?? 90);
const dir = join(import.meta.dirname, '../src/catalog/cards');
const now = Date.now();

const stale = [];
for (const file of readdirSync(dir).filter((f) => f.endsWith('.ts'))) {
  const text = readFileSync(join(dir, file), 'utf8');
  const id = /id: '([a-z0-9-]+)'/.exec(text)?.[1] ?? file;
  const verified = /lastVerified: '(\d{4}-\d{2}-\d{2})'/.exec(text)?.[1];
  const source = /sourceUrl: '([^']+)'/.exec(text)?.[1] ?? '';
  const ageDays = verified
    ? Math.floor((now - Date.parse(`${verified}T00:00:00Z`)) / 86_400_000)
    : Infinity;
  if (ageDays > maxAgeDays)
    stale.push(
      `- [ ] **${id}**: last verified ${verified ?? 'never'} (${ageDays} days ago). Source: ${source}`,
    );
}

if (stale.length === 0) {
  console.log(`All catalog cards verified within ${maxAgeDays} days.`);
} else {
  console.log(stale.join('\n'));
}
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `stale=${stale.length > 0}\n`);
}
