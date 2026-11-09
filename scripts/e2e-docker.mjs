// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * Runs Playwright inside the official Linux image so screenshot baselines match CI,
 * whatever OS you develop on. Extra arguments are passed to `playwright test`.
 *
 *   npm run test:e2e:docker                       # run all e2e tests in Linux
 *   npm run test:e2e:update                       # regenerate screenshot baselines
 *
 * node_modules lives in a named Docker volume so the Linux install never overwrites
 * your host's node_modules (native binaries differ between OSes).
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { version } = JSON.parse(
  readFileSync(require.resolve('@playwright/test/package.json'), 'utf8'),
);
const image = `mcr.microsoft.com/playwright:v${version}-noble`;
const args = process.argv
  .slice(2)
  .map((a) => `'${a.replace(/'/g, `'\\''`)}'`)
  .join(' ');

const docker = spawnSync(
  'docker',
  [
    'run',
    '--rm',
    '--ipc=host',
    '-e',
    'CI=1',
    '-v',
    `${process.cwd()}:/work`,
    '-v',
    'effectiveaf-node-modules:/work/node_modules',
    '-w',
    '/work',
    image,
    'bash',
    '-c',
    `npm ci --no-audit --no-fund && npx playwright test ${args}`,
  ],
  { stdio: 'inherit' },
);

if (docker.error) {
  console.error(`Could not run Docker (${docker.error.message}). Is Docker Desktop running?`);
  process.exit(1);
}
process.exit(docker.status ?? 1);
