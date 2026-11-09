// SPDX-License-Identifier: GPL-3.0-or-later
import { Fragment } from 'preact';
import { useState } from 'preact/hooks';
import { buildComparison } from '../core/compare';
import { formatUsd } from '../core/money';
import { annualNominalCents } from '../core/valuation';
import { CardPanel } from './CardPanel';
import { Modal } from './Modal';
import { useStore } from './store-context';
import { PayInFullNote } from './PayInFullNote';
import { VerdictPill } from './VerdictPill';

/** Cards side by side, like a car-trim sheet: rows are kinds of perk, "—" means none. */
export function CompareView({ onChooseCards }: { onChooseCards: () => void }) {
  const store = useStore();
  const columns = store.compareSummaries.value;
  const wallet = store.state.value.wallet;
  const [editing, setEditing] = useState<string | null>(null);
  const editingSummary = editing ? store.summaryFor(editing) : undefined;
  const groups = buildComparison(columns);
  const span = columns.length + 1;

  return (
    <section class="view" aria-labelledby="compare-title">
      <div class="view-head">
        <h2 id="compare-title" class="view-title">
          Compare cards
        </h2>
        <button type="button" class="btn btn-primary" onClick={onChooseCards}>
          Choose cards
        </button>
      </div>

      {columns.length === 0 ? (
        <div class="empty">
          <p>Pick 2 to 5 cards to see their credits lined up side by side.</p>
        </div>
      ) : (
        <>
          <p class="hint">
            Similar credits share a row; “—” means the card doesn't have one. Your value and
            effective cost use the values you set for each card. Credits change often, so confirm
            the current terms on each issuer's site before deciding.
          </p>
          <div class="compare-scroll" role="region" aria-label="Comparison table" tabIndex={0}>
            <table class="compare">
              <caption class="visually-hidden">Credits by card</caption>
              <thead>
                <tr>
                  <th scope="col">
                    <span class="visually-hidden">Credit</span>
                  </th>
                  {columns.map((c) => (
                    <th key={c.card.id} scope="col" class="compare-card">
                      {c.card.issuer && <span class="card-issuer">{c.card.issuer}</span>}
                      <span class="compare-name">{c.card.name}</span>
                      <span class="compare-actions">
                        <button
                          type="button"
                          class="link-button"
                          aria-label={`Set my values for ${c.card.name}`}
                          onClick={() => setEditing(c.card.id)}
                        >
                          Set my values
                        </button>
                        {wallet.includes(c.card.id) ? (
                          <span class="tag">
                            {c.ownership === 'considering' ? 'Considering' : 'You have it'}
                          </span>
                        ) : (
                          <button
                            type="button"
                            class="link-button"
                            aria-label={`Add to wallet as considering: ${c.card.name}`}
                            onClick={() => store.addCard(c.card.id, undefined, 'considering')}
                          >
                            Add to wallet as considering
                          </button>
                        )}
                        <button
                          type="button"
                          class="link-button"
                          aria-label={`Remove ${c.card.name} from comparison`}
                          onClick={() => store.toggleCompare(c.card.id)}
                        >
                          Remove
                        </button>
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Annual fee</th>
                  {columns.map((c) => (
                    <td key={c.card.id} class="num">
                      {formatUsd(c.feeCents)}
                      {c.isFeeOverridden && <span class="tag tag-custom">Custom</span>}
                    </td>
                  ))}
                </tr>
                {groups.map((g) => (
                  <Fragment key={g.group}>
                    <tr class="group-row">
                      <th scope="colgroup" colSpan={span}>
                        {g.group}
                      </th>
                    </tr>
                    {g.rows.map((row) => (
                      <tr key={row.kind}>
                        <th scope="row">{row.label}</th>
                        {row.cells.map((perks, i) => (
                          <td key={columns[i]?.card.id ?? i}>
                            {perks.length === 0 ? (
                              <span class="none">
                                <span aria-hidden="true">—</span>
                                <span class="visually-hidden">Not offered</span>
                              </span>
                            ) : (
                              perks.map((p) => (
                                <div key={p.id} class="cmp-perk">
                                  <strong>{formatUsd(annualNominalCents(p))}/yr</strong>
                                  <span>{p.name}</span>
                                  <span class="cmp-cadence">{p.cadenceLabel}</span>
                                </div>
                              ))
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                ))}
                <tr class="group-row">
                  <th scope="colgroup" colSpan={span}>
                    Totals
                  </th>
                </tr>
                <tr>
                  <th scope="row">Face value of credits</th>
                  {columns.map((c) => (
                    <td key={c.card.id} class="num">
                      {formatUsd(c.nominalCents)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Your value</th>
                  {columns.map((c) => (
                    <td key={c.card.id} class="num" data-testid={`compare-value-${c.card.id}`}>
                      {formatUsd(c.realizedCents)}
                      {c.unsetCount > 0 && <span class="unset-note">{c.unsetCount} not set</span>}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Effective cost</th>
                  {columns.map((c) => (
                    <td key={c.card.id}>
                      <VerdictPill
                        effectiveCents={c.effectiveCents}
                        verdict={c.verdict}
                        considering={c.ownership === 'considering'}
                        testId={`compare-verdict-${c.card.id}`}
                      />
                      {c.paysInFull !== true && (
                        <PayInFullNote id={`${c.card.id}-compare`} paysInFull={c.paysInFull} />
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          {columns.length === 1 && <p class="hint">Add at least one more card to compare.</p>}
        </>
      )}

      <Modal
        open={editingSummary !== undefined}
        onClose={() => setEditing(null)}
        titleId="edit-values-title"
        title={editingSummary ? `Your values: ${editingSummary.card.name}` : ''}
        wide
      >
        {editingSummary && <CardPanel summary={editingSummary} showTitle={false} />}
      </Modal>
    </section>
  );
}
