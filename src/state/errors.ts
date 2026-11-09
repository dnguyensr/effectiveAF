// SPDX-License-Identifier: GPL-3.0-or-later

export type StateErrorCode =
  | 'too-large'
  | 'invalid-json'
  | 'not-an-object'
  | 'unknown-version'
  | 'newer-version'
  | 'missing-migration'
  | 'invalid-shape';

const MESSAGES: Record<StateErrorCode, string> = {
  'too-large': 'That file is too large to be an effectiveAF backup.',
  'invalid-json': "That isn't valid JSON. Check that you copied the whole backup.",
  'not-an-object': "That doesn't look like an effectiveAF backup.",
  'unknown-version': "That doesn't look like an effectiveAF backup (no recognizable version).",
  'newer-version':
    'That backup was made by a newer version of effectiveAF. Reload the page to update, then try again.',
  'missing-migration': "That backup's version can't be upgraded by this version of effectiveAF.",
  'invalid-shape':
    'That backup contains values effectiveAF doesn’t understand, so it was not loaded.',
};

export class StateError extends Error {
  constructor(
    readonly code: StateErrorCode,
    detail?: string,
  ) {
    super(detail ? `${MESSAGES[code]} (${detail})` : MESSAGES[code]);
    this.name = 'StateError';
  }
}

export function messageFor(code: StateErrorCode): string {
  return MESSAGES[code];
}
