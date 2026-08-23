import { debtSizingEbitda, enterpriseValue } from '../../model/sourcesUses'
import type { DealInputs, TransactionCostItem } from '../../model/types'
import { useDealStore } from '../../state/store'
import { useModelOutput } from '../../state/useModelOutput'
import { formatMoney } from '../format'
import { buildBlankTranche } from './blankTranche'
import { TrancheEditor } from './TrancheEditor'
import { TableCheckbox, TableNumberInput, TableSelect, TableTextInput } from './tableInputs'

function newTrancheId(): string {
  return `tranche-${Math.random().toString(36).slice(2, 9)}`
}

export function CapitalStructureTab() {
  const inputs = useDealStore((s) => s.inputs)
  const updateInputs = useDealStore((s) => s.updateInputs)
  const output = useModelOutput()

  const debtEbitda = debtSizingEbitda(inputs)
  const ev = enterpriseValue(inputs)
  const costItems = inputs.transaction.transactionCostItems ?? []
  const exitYear = inputs.exit.exitYear
  const exitDebtYear = output.debtYears.find((dy) => dy.year === exitYear)

  function update(fn: (draft: DealInputs) => void) {
    updateInputs((prev) => {
      const next = structuredClone(prev)
      fn(next)
      return next
    })
  }

  const sponsorEquityFixed = inputs.equity.fixedSponsorEquity !== undefined

  // Per-tranche Sources amount for display: every tranche's own resolved
  // amount, except the designated plug tranche, which is whatever's left of
  // sourcesTrancheTotal after the others — computeSourcesUses only exposes
  // the aggregate, so the plug's individual share is derived here.
  const nonPlugAmountById = new Map<string, number>()
  let nonPlugSum = 0
  for (const t of inputs.financing.tranches) {
    if (t.id === inputs.equity.plugTrancheId) continue
    const amount = t.trancheType === 'revolver' ? (t.initialDrawnAmount ?? 0) : t.amount.mode === 'absolute' ? t.amount.value : t.amount.value * debtEbitda
    nonPlugAmountById.set(t.id, amount)
    nonPlugSum += amount
  }
  const trancheDisplayAmount = (id: string) =>
    id === inputs.equity.plugTrancheId ? output.sourcesUses.sourcesTrancheTotal - nonPlugSum : (nonPlugAmountById.get(id) ?? 0)

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h2 className="text-xl mb-4">Sources &amp; Uses</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6 text-sm">
          <div>
            <h3 className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-muted)' }}>
              Uses
            </h3>
            <div className="flex justify-between py-1">
              <span>Equity purchase price</span>
              <span className="font-figures">{formatMoney(output.sourcesUses.usesEquityPurchasePrice)}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span>Refinance target net debt</span>
              <TableNumberInput
                value={inputs.transaction.targetNetDebt}
                onChange={(v) => update((d) => (d.transaction.targetNetDebt = v))}
                step={0.5}
                ariaLabel="Refinance target net debt"
              />
            </div>
            {costItems.map((item, i) => (
              <div key={i} className="flex flex-wrap justify-between items-center py-1 gap-2">
                <TableTextInput
                  value={item.label}
                  onChange={(v) =>
                    update((d) => {
                      d.transaction.transactionCostItems![i]!.label = v
                    })
                  }
                  width="w-28"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <TableSelect
                    value={item.mode}
                    onChange={(v) =>
                      update((d) => {
                        d.transaction.transactionCostItems![i]!.mode = v as TransactionCostItem['mode']
                      })
                    }
                    options={[
                      { value: 'pctOfEnterpriseValue', label: '% of EV' },
                      { value: 'absolute', label: 'Absolute' },
                    ]}
                  />
                  <TableNumberInput
                    value={item.value}
                    onChange={(v) =>
                      update((d) => {
                        d.transaction.transactionCostItems![i]!.value = v
                      })
                    }
                    step={0.1}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      update((d) => {
                        d.transaction.transactionCostItems!.splice(i, 1)
                      })
                    }
                    className="text-xs underline cursor-pointer"
                    style={{ color: 'var(--color-warning)' }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                update((d) => {
                  d.transaction.transactionCostItems = [
                    ...(d.transaction.transactionCostItems ?? []),
                    { label: 'New cost item', mode: 'pctOfEnterpriseValue', value: 0 },
                  ]
                })
              }
              className="text-xs underline cursor-pointer mt-1"
              style={{ color: 'var(--color-brass)' }}
            >
              + Add transaction cost item
            </button>
            <div className="flex justify-between py-1 mt-2">
              <span>Financing fees (arrangement)</span>
              <span className="font-figures">{formatMoney(output.sourcesUses.usesFinancingFees)}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span>Minimum cash funded</span>
              <TableNumberInput
                value={inputs.transaction.minCashBalance}
                onChange={(v) => update((d) => (d.transaction.minCashBalance = v))}
                step={0.5}
                ariaLabel="Minimum cash funded"
              />
            </div>
            <div className="flex justify-between py-1 mt-1 border-t pt-1" style={{ borderColor: 'var(--color-border-strong)' }}>
              <span style={{ color: 'var(--color-heading)' }}>Total</span>
              <span className="font-figures" style={{ color: 'var(--color-heading)' }}>
                {formatMoney(output.sourcesUses.usesTotal)}
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-muted)' }}>
              Sources
            </h3>
            {inputs.financing.tranches.map((t) => (
              <div key={t.id} className="flex justify-between py-1">
                <span>
                  {t.name}
                  {t.id === inputs.equity.plugTrancheId && (
                    <span className="text-xs ml-1" style={{ color: 'var(--color-text-muted)' }}>
                      (plug)
                    </span>
                  )}
                </span>
                <span className="font-figures">{formatMoney(trancheDisplayAmount(t.id))}</span>
              </div>
            ))}
            <div className="flex justify-between items-center py-1">
              <span>Management rollover</span>
              <TableNumberInput
                value={inputs.equity.managementRolloverAmount ?? 0}
                onChange={(v) => update((d) => (d.equity.managementRolloverAmount = v))}
                step={0.5}
                ariaLabel="Management rollover"
              />
            </div>
            <div className="flex justify-between items-center py-1 gap-2">
              <span className="flex items-center gap-2">
                Sponsor equity
                <TableCheckbox
                  checked={sponsorEquityFixed}
                  onChange={(checked) =>
                    update((d) => {
                      if (checked) d.equity.fixedSponsorEquity = output.sourcesUses.sourcesSponsorEquity
                      else {
                        delete d.equity.fixedSponsorEquity
                        delete d.equity.plugTrancheId
                      }
                    })
                  }
                  ariaLabel="Fix sponsor equity"
                />
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  fix
                </span>
              </span>
              {sponsorEquityFixed ? (
                <TableNumberInput
                  value={inputs.equity.fixedSponsorEquity ?? 0}
                  onChange={(v) => update((d) => (d.equity.fixedSponsorEquity = v))}
                  step={1}
                  ariaLabel="Fixed sponsor equity amount"
                />
              ) : (
                <span className="font-figures">{formatMoney(output.sourcesUses.sourcesSponsorEquity)}</span>
              )}
            </div>
            {sponsorEquityFixed && (
              <div className="flex justify-between items-center py-1">
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Plug tranche (flexes to balance)
                </span>
                <TableSelect
                  value={inputs.equity.plugTrancheId ?? ''}
                  onChange={(v) => update((d) => (d.equity.plugTrancheId = v || undefined))}
                  options={[
                    { value: '', label: 'None' },
                    ...inputs.financing.tranches.map((t) => ({ value: t.id, label: t.name })),
                  ]}
                  ariaLabel="Plug tranche"
                />
              </div>
            )}
            <div className="flex justify-between py-1 mt-1 border-t pt-1" style={{ borderColor: 'var(--color-border-strong)' }}>
              <span style={{ color: 'var(--color-heading)' }}>Total</span>
              <span className="font-figures" style={{ color: 'var(--color-heading)' }}>
                {formatMoney(output.sourcesUses.sourcesTotal)}
              </span>
            </div>
          </div>
        </div>

        <p
          className="mt-4 text-sm"
          style={{ color: Math.abs(output.sourcesUses.imbalance) <= 0.01 ? 'var(--color-text-muted)' : 'var(--color-warning)' }}
        >
          {Math.abs(output.sourcesUses.imbalance) <= 0.01
            ? `Balanced — Sources = Uses = ${formatMoney(output.sourcesUses.usesTotal)}.`
            : `Out of balance by ${formatMoney(output.sourcesUses.imbalance)}.`}
        </p>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl">Debt tranches</h2>
          <button
            type="button"
            onClick={() =>
              update((d) => {
                d.financing.tranches.push(buildBlankTranche(newTrancheId()))
              })
            }
            className="text-sm border px-3 py-1.5 cursor-pointer"
            style={{ borderColor: 'var(--color-brass)', color: 'var(--color-brass)' }}
          >
            + Add tranche
          </button>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            <div className="flex gap-3 px-0 pb-1 text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
              <span className="w-5" />
              <span className="w-40">Name</span>
              <span className="w-28">Type</span>
              <span className="w-14">Rank</span>
              <span className="flex-1 text-right">Amount</span>
              <span className="w-28 text-right">Rate</span>
              <span className="w-28 text-right">Balance at exit</span>
            </div>
            {inputs.financing.tranches.map((t) => {
              const exitBalance = exitDebtYear?.tranches.find((ty) => ty.trancheId === t.id)?.closingBalance ?? null
              const matures = (t.maturityYears ?? Infinity) < inputs.transaction.holdPeriodYears
              return (
                <TrancheEditor
                  key={t.id}
                  tranche={t}
                  debtEbitda={debtEbitda}
                  closingBalanceAtExit={exitBalance}
                  maturesBeforeHoldEnd={matures}
                  onChange={(next) =>
                    update((d) => {
                      const idx = d.financing.tranches.findIndex((x) => x.id === t.id)
                      if (idx >= 0) d.financing.tranches[idx] = next
                    })
                  }
                  onDuplicate={() =>
                    update((d) => {
                      const idx = d.financing.tranches.findIndex((x) => x.id === t.id)
                      if (idx >= 0) {
                        const copy = structuredClone(d.financing.tranches[idx]!)
                        copy.id = newTrancheId()
                        copy.name = `${copy.name} (copy)`
                        d.financing.tranches.splice(idx + 1, 0, copy)
                      }
                    })
                  }
                  onRemove={() =>
                    update((d) => {
                      d.financing.tranches = d.financing.tranches.filter((x) => x.id !== t.id)
                    })
                  }
                />
              )
            })}
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl mb-4">Reference rate curve</h2>
        <div className="flex items-center gap-3 text-sm">
          <span>Flat reference rate (%)</span>
          <TableNumberInput
            value={inputs.financing.referenceRateCurve?.flatRatePct ?? 3.0}
            onChange={(v) =>
              update((d) => {
                d.financing.referenceRateCurve = {
                  flatRatePct: v,
                  overridesByYear: d.financing.referenceRateCurve?.overridesByYear ?? {},
                }
              })
            }
            step={0.1}
          />
        </div>
        <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
          Applies to every floating-rate tranche (each adds its own margin on top). Used for {ev > 0 ? 'this deal' : 'the deal'};
          per-year overrides can be set once needed.
        </p>
        {inputs.financing.tranches.length > 0 && (
          <div className="mt-4 flex flex-col gap-1">
            {Array.from({ length: inputs.transaction.holdPeriodYears }, (_, i) => i + 1).map((year) => (
              <div key={year} className="flex items-center gap-3 text-sm">
                <span className="w-16" style={{ color: 'var(--color-text-muted)' }}>
                  Year {year}
                </span>
                <TableNumberInput
                  value={
                    inputs.financing.referenceRateCurve?.overridesByYear[year] ??
                    inputs.financing.referenceRateCurve?.flatRatePct ??
                    3.0
                  }
                  onChange={(v) =>
                    update((d) => {
                      const curve = d.financing.referenceRateCurve ?? { flatRatePct: 3.0, overridesByYear: {} }
                      curve.overridesByYear[year] = v
                      d.financing.referenceRateCurve = curve
                    })
                  }
                  step={0.1}
                />
                {inputs.financing.referenceRateCurve?.overridesByYear[year] !== undefined && (
                  <button
                    type="button"
                    onClick={() =>
                      update((d) => {
                        if (d.financing.referenceRateCurve) delete d.financing.referenceRateCurve.overridesByYear[year]
                      })
                    }
                    className="text-xs underline cursor-pointer"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    Reset to flat
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
