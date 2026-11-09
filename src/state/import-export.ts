// SPDX-License-Identifier: GPL-3.0-or-later
import { StateError, messageFor, type StateErrorCode } from './errors';
import { parseJson, parseState } from './migrations';
import type { UserState } from './schema';

/** Real backups are a few KB; anything this big is not one. */
export const MAX_IMPORT_CHARS = 1_000_000;

export function exportState(state: UserState): string {
  // "app" identifies the file to humans; the schema strips it on import.
  return `${JSON.stringify({ app: 'effectiveAF', ...state }, null, 2)}\n`;
}

export function backupFileName(isoDate: string): string {
  return `effectiveaf-backup-${isoDate}.json`;
}

export type ImportResult =
  | { ok: true; state: UserState; cardCount: number; valuationCount: number }
  | { ok: false; code: StateErrorCode; message: string };

export function parseImport(text: string): ImportResult {
  try {
    if (text.length > MAX_IMPORT_CHARS) throw new StateError('too-large');
    const state = parseState(parseJson(text));
    const valuationCount = Object.values(state.cards).reduce(
      (sum, card) => sum + Object.keys(card.perks).length,
      0,
    );
    return { ok: true, state, cardCount: state.wallet.length, valuationCount };
  } catch (err) {
    const code = err instanceof StateError ? err.code : 'invalid-shape';
    return { ok: false, code, message: messageFor(code) };
  }
}
