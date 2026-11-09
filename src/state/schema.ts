// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * The persisted user state. Only what the user changed is stored, keyed by stable catalog IDs,
 * so catalog corrections reach existing users automatically.
 *
 * The same schema validates localStorage and imported backup files, so anything that reaches
 * the app has passed through here.
 */
import * as z from 'zod/mini';
import type { CardUserState } from '../core/card-math';
import type { PerkValuation } from '../core/valuation';

export const CURRENT_SCHEMA_VERSION = 1;

/** Lowercase slug segments joined by "." or "-". Rejects "__proto__", "constructor" etc. */
export const ID_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const Id = z.string().check(z.maxLength(100), z.regex(ID_PATTERN));

/** $100,000: far above any real fee or credit, low enough to catch garbage. */
export const MAX_CENTS = 10_000_000;
const Cents = z.int().check(z.minimum(0), z.maximum(MAX_CENTS));

const PerkValuationSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('percent'),
    percent: z.number().check(z.minimum(0), z.maximum(100)),
    enabled: z.boolean(),
  }),
  z.object({ mode: z.literal('dollars'), cents: Cents, enabled: z.boolean() }),
]);

const CardUserStateSchema = z.object({
  feeOverrideCents: z.optional(Cents),
  perks: z.record(Id, PerkValuationSchema),
});

export const UserStateSchema = z.object({
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  catalogVersion: z.string().check(z.maxLength(40)),
  wallet: z.array(Id).check(
    z.maxLength(50),
    z.refine((ids) => new Set(ids).size === ids.length, 'wallet contains duplicate cards'),
  ),
  cards: z.record(Id, CardUserStateSchema),
  updatedAt: z.string().check(z.maxLength(40)),
});

export type UserState = z.infer<typeof UserStateSchema>;

// Compile-time checks that the schema and the core math types agree.
type Assert<T extends true> = T;
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
export type _ValuationMatches = Assert<Same<z.infer<typeof PerkValuationSchema>, PerkValuation>>;
export type _CardStateMatches = Assert<Same<z.infer<typeof CardUserStateSchema>, CardUserState>>;
