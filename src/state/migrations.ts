// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * Upgrades saved state from older schema versions.
 *
 * To change the schema: bump CURRENT_SCHEMA_VERSION, add MIGRATIONS[oldVersion], and add a
 * fixture of the old format under tests/fixtures/state-v<old>/. Fixtures are never deleted:
 * every version a user might still have saved must keep loading.
 */
import { CATALOG_VERSION } from '../catalog';
import { StateError } from './errors';
import { CURRENT_SCHEMA_VERSION, UserStateSchema, type UserState } from './schema';
import { V1_STARTING_ESTIMATES } from './v1-estimates';

export type StateObject = Record<string, unknown>;
export type Migration = (state: StateObject) => StateObject;

/** Keyed by the version a migration upgrades FROM. */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {
  1: migrateV1toV2,
};

/**
 * v2 adds user-defined cards and custom perks, and stops assuming values: an untouched perk
 * now counts $0 instead of a starting estimate. So that v1 users' numbers don't silently
 * change, every perk they left untouched on a card they had gets the v1 estimate written in
 * as an explicit value.
 */
function migrateV1toV2(state: StateObject): StateObject {
  const cards = isPlainObject(state.cards) ? state.cards : {};
  const wallet = Array.isArray(state.wallet)
    ? state.wallet.filter((id): id is string => typeof id === 'string')
    : [];
  const next: StateObject = { ...cards };
  for (const cardId of new Set([...wallet, ...Object.keys(cards)])) {
    const current = next[cardId];
    const cardState = isPlainObject(current) ? current : {};
    const perks = isPlainObject(cardState.perks) ? { ...cardState.perks } : {};
    for (const [perkId, percent] of Object.entries(V1_STARTING_ESTIMATES)) {
      if (perkId.startsWith(`${cardId}.`) && !Object.hasOwn(perks, perkId)) {
        perks[perkId] = { mode: 'percent', percent, enabled: true };
      }
    }
    next[cardId] = { ...cardState, perks };
  }
  return { ...state, cards: next, customCards: [], compare: [] };
}

function isPlainObject(value: unknown): value is StateObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function migrate(
  raw: unknown,
  migrations: Readonly<Record<number, Migration>> = MIGRATIONS,
  currentVersion: number = CURRENT_SCHEMA_VERSION,
): StateObject {
  if (!isPlainObject(raw)) throw new StateError('not-an-object');
  let version = raw.schemaVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new StateError('unknown-version');
  }
  if (version > currentVersion) throw new StateError('newer-version', `v${version}`);

  let state = raw;
  while (version < currentVersion) {
    const step = migrations[version];
    if (!step) throw new StateError('missing-migration', `v${version}`);
    version += 1;
    state = { ...step(state), schemaVersion: version };
  }
  return state;
}

/** Migrates and validates anything claiming to be saved state. Throws StateError. */
export function parseState(raw: unknown): UserState {
  const result = UserStateSchema.safeParse(migrate(raw));
  if (!result.success) {
    const first = result.error.issues[0];
    throw new StateError('invalid-shape', first ? `${first.path.join('.')}: ${first.message}` : '');
  }
  return result.data;
}

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * JSON.parse that rejects prototype-polluting keys outright (rather than letting them be
 * silently dropped later), so a tampered backup is refused as a whole. Throws StateError.
 */
export function parseJson(text: string): unknown {
  try {
    return JSON.parse(text, (key, value: unknown) => {
      if (FORBIDDEN_KEYS.has(key)) throw new StateError('invalid-shape', `forbidden key "${key}"`);
      return value;
    });
  } catch (err) {
    if (err instanceof StateError) throw err;
    throw new StateError('invalid-json');
  }
}

export function createEmptyState(updatedAt: string): UserState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    catalogVersion: CATALOG_VERSION,
    wallet: [],
    cards: {},
    customCards: [],
    compare: [],
    updatedAt,
  };
}
