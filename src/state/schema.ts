// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * The persisted user state. Only what the user changed is stored, keyed by stable catalog IDs,
 * so catalog corrections reach existing users automatically.
 *
 * The same schema validates localStorage and imported backup files, so anything that reaches
 * the app has passed through here.
 */
import * as z from 'zod/mini';
import { CADENCES, type CustomCardInput, type CustomPerkInput } from '../catalog/types';
import {
  MAX_BASELINE_PERCENT,
  MAX_POINT_VALUE_CENTS,
  MIN_BASELINE_PERCENT,
  MIN_POINT_VALUE_CENTS,
} from '../core/breakeven';
import type { CardUserState } from '../core/card-math';
import type { PerkValuation } from '../core/valuation';

export const CURRENT_SCHEMA_VERSION = 2;

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

export const MAX_CUSTOM_CARDS = 20;
export const MAX_COMPARE = 5;
export const MAX_CUSTOM_PERKS_PER_CARD = 30;
export const MAX_NAME_LENGTH = 60;

/** User-typed text: trimmed, non-empty unless allowEmpty, bounded. Rendered escaped by Preact. */
const Text = (allowEmpty = false) =>
  z.string().check(
    z.maxLength(MAX_NAME_LENGTH),
    z.refine((s) => s === s.trim() && (allowEmpty || s.length > 0), 'must be trimmed text'),
  );

const uniqueIds = <T extends { id: string }>(items: T[]) =>
  new Set(items.map((i) => i.id)).size === items.length;

const CustomPerkSchema = z.object({
  id: Id,
  name: Text(),
  cadence: z.enum(CADENCES),
  amountPerPeriodCents: z.int().check(z.minimum(1), z.maximum(MAX_CENTS)),
});

const CustomCardSchema = z.object({
  id: Id,
  issuer: Text(true),
  name: Text(),
  annualFeeCents: Cents,
});

const CardUserStateSchema = z.object({
  ownership: z.optional(z.enum(['have', 'considering'])),
  feeOverrideCents: z.optional(Cents),
  anniversaryMonth: z.optional(z.int().check(z.minimum(1), z.maximum(12))),
  pointValueCents: z.optional(
    z.number().check(z.minimum(MIN_POINT_VALUE_CENTS), z.maximum(MAX_POINT_VALUE_CENTS)),
  ),
  perks: z.record(Id, PerkValuationSchema),
  customPerks: z.optional(
    z
      .array(CustomPerkSchema)
      .check(z.maxLength(MAX_CUSTOM_PERKS_PER_CARD), z.refine(uniqueIds, 'duplicate perk IDs')),
  ),
});

export const UserStateSchema = z.object({
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  catalogVersion: z.string().check(z.maxLength(40)),
  wallet: z.array(Id).check(
    z.maxLength(50),
    z.refine((ids) => new Set(ids).size === ids.length, 'wallet contains duplicate cards'),
  ),
  cards: z.record(Id, CardUserStateSchema),
  /** App-wide preferences. */
  settings: z.optional(
    z.object({
      /** What the user's everyday card earns, in % cash back, for break-even math. */
      baselinePercent: z.optional(
        z.number().check(z.minimum(MIN_BASELINE_PERCENT), z.maximum(MAX_BASELINE_PERCENT)),
      ),
    }),
  ),
  /** Cards chosen for the comparison view, in column order. */
  compare: z.array(Id).check(
    z.maxLength(MAX_COMPARE),
    z.refine((ids) => new Set(ids).size === ids.length, 'duplicate cards'),
  ),
  customCards: z
    .array(CustomCardSchema)
    .check(z.maxLength(MAX_CUSTOM_CARDS), z.refine(uniqueIds, 'duplicate custom card IDs')),
  updatedAt: z.string().check(z.maxLength(40)),
});

export type UserState = z.infer<typeof UserStateSchema>;

// Compile-time checks that the schema and the core math types agree.
type Assert<T extends true> = T;
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
export type _ValuationMatches = Assert<Same<z.infer<typeof PerkValuationSchema>, PerkValuation>>;
export type _CardStateMatches = Assert<Same<z.infer<typeof CardUserStateSchema>, CardUserState>>;
export type _CustomPerkMatches = Assert<Same<z.infer<typeof CustomPerkSchema>, CustomPerkInput>>;
export type _CustomCardMatches = Assert<Same<z.infer<typeof CustomCardSchema>, CustomCardInput>>;
