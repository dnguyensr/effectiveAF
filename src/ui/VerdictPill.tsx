// SPDX-License-Identifier: GPL-3.0-or-later
import type { Verdict } from '../core/card-math';
import { formatUsd } from '../core/money';

/** "Costs $X/yr" for a card you have; "Would cost $X/yr" for one you're considering. */
export function verdictText(effectiveCents: number, verdict: Verdict, considering = false): string {
  if (verdict === 'pays-for-itself') {
    return `${considering ? 'Would pay' : 'Pays'} for itself (+${formatUsd(-effectiveCents)})`;
  }
  return `${considering ? 'Would cost' : 'Costs'} ${formatUsd(effectiveCents)}/yr`;
}

interface Props {
  effectiveCents: number;
  verdict: Verdict;
  considering?: boolean;
  testId?: string;
}

export function VerdictPill({ effectiveCents, verdict, considering, testId }: Props) {
  return (
    <span class={`pill pill-${verdict}`} data-testid={testId}>
      {verdictText(effectiveCents, verdict, considering)}
    </span>
  );
}
