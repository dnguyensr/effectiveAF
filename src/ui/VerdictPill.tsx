// SPDX-License-Identifier: GPL-3.0-or-later
import type { Verdict } from '../core/card-math';
import { formatUsd } from '../core/money';

export function verdictText(effectiveCents: number, verdict: Verdict): string {
  return verdict === 'pays-for-itself'
    ? `Pays for itself (+${formatUsd(-effectiveCents)})`
    : `Costs ${formatUsd(effectiveCents)}/yr`;
}

interface Props {
  effectiveCents: number;
  verdict: Verdict;
  testId?: string;
}

export function VerdictPill({ effectiveCents, verdict, testId }: Props) {
  return (
    <span class={`pill pill-${verdict}`} data-testid={testId}>
      {verdictText(effectiveCents, verdict)}
    </span>
  );
}
