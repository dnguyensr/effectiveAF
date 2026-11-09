// SPDX-License-Identifier: GPL-3.0-or-later
/**
 * The side-by-side comparison, laid out like a car-trim sheet: one column per card, one row per
 * kind of perk. A cell lists every perk of that kind on that card (a card can have two hotel
 * credits); an empty cell means the card has nothing of that kind.
 */
import { KINDS, type PerkDef, type PerkKind } from '../catalog/types';
import type { CardSummary } from './card-math';

export interface CompareRow {
  kind: PerkKind;
  label: string;
  group: string;
  /** One entry per card, in column order; each is that card's perks of this kind. */
  cells: PerkDef[][];
}

export interface CompareGroup {
  group: string;
  rows: CompareRow[];
}

/** Rows only for kinds at least one compared card has, grouped and ordered by KINDS. */
export function buildComparison(columns: readonly CardSummary[]): CompareGroup[] {
  const groups: CompareGroup[] = [];
  for (const kind of KINDS) {
    const cells = columns.map((c) =>
      c.perks.filter((p) => p.perk.kind === kind.id).map((p) => p.perk),
    );
    if (cells.every((cell) => cell.length === 0)) continue;
    let group = groups.at(-1);
    if (group?.group !== kind.group) {
      group = { group: kind.group, rows: [] };
      groups.push(group);
    }
    group.rows.push({ kind: kind.id, label: kind.label, group: kind.group, cells });
  }
  return groups;
}
