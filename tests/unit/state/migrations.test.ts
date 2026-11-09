// SPDX-License-Identifier: GPL-3.0-or-later
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CATALOG_VERSION } from '../../../src/catalog';
import { StateError } from '../../../src/state/errors';
import {
  createEmptyState,
  migrate,
  parseState,
  type Migration,
} from '../../../src/state/migrations';
import { CURRENT_SCHEMA_VERSION, UserStateSchema } from '../../../src/state/schema';

const FIXTURES = join(__dirname, '../../fixtures');

function codeOf(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (err) {
    return err instanceof StateError ? err.code : 'other';
  }
  return undefined;
}

describe('every saved-state fixture still loads', () => {
  // One folder per schema version ever shipped. Never delete these.
  const versionDirs = readdirSync(FIXTURES).filter((d) => d.startsWith('state-v'));

  it('has a fixture folder for every version up to the current one', () => {
    for (let v = 1; v <= CURRENT_SCHEMA_VERSION; v++) {
      expect(versionDirs).toContain(`state-v${v}`);
    }
  });

  const files = versionDirs.flatMap((dir) =>
    readdirSync(join(FIXTURES, dir)).map((f) => [`${dir}/${f}`, join(FIXTURES, dir, f)] as const),
  );

  it.each(files)('%s', (_name, path) => {
    const state = parseState(JSON.parse(readFileSync(path, 'utf8')));
    expect(state.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    // Migrating an already-current state is a no-op.
    expect(parseState(state)).toEqual(state);
  });
});

describe('migrate', () => {
  it.each([
    [null, 'not-an-object'],
    [[1, 2], 'not-an-object'],
    ['state', 'not-an-object'],
    [{}, 'unknown-version'],
    [{ schemaVersion: '1' }, 'unknown-version'],
    [{ schemaVersion: 0 }, 'unknown-version'],
    [{ schemaVersion: 1.5 }, 'unknown-version'],
    [{ schemaVersion: CURRENT_SCHEMA_VERSION + 1 }, 'newer-version'],
  ])('rejects %j with %s', (raw, code) => {
    expect(codeOf(() => migrate(raw))).toBe(code);
  });

  it('runs each step in order and stamps the new version', () => {
    const migrations: Record<number, Migration> = {
      1: (s) => ({ ...s, steps: ['1→2'] }),
      2: (s) => ({ ...s, steps: [...(s.steps as string[]), '2→3'] }),
    };
    expect(migrate({ schemaVersion: 1, keep: true }, migrations, 3)).toEqual({
      schemaVersion: 3,
      keep: true,
      steps: ['1→2', '2→3'],
    });
  });

  it('fails clearly when a migration step is missing', () => {
    expect(codeOf(() => migrate({ schemaVersion: 1 }, {}, 2))).toBe('missing-migration');
  });
});

describe('parseState', () => {
  it('rejects a wallet with duplicate cards', () => {
    const state = { ...createEmptyState('now'), wallet: ['amex-gold', 'amex-gold'] };
    expect(codeOf(() => parseState(state))).toBe('invalid-shape');
  });

  it('strips unknown top-level keys', () => {
    const parsed = parseState({ ...createEmptyState('now'), extra: 'x' });
    expect(parsed).not.toHaveProperty('extra');
  });
});

describe('createEmptyState', () => {
  it('is valid, empty and stamped with the current catalog', () => {
    const s = createEmptyState('2026-11-08T12:00:00.000Z');
    expect(UserStateSchema.safeParse(s).success).toBe(true);
    expect(s).toMatchObject({ wallet: [], cards: {}, catalogVersion: CATALOG_VERSION });
  });
});
