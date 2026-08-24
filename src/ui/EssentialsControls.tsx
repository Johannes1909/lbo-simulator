import { en } from '../i18n/en'
import { resolveReferenceRate, resolveTrancheRate } from '../model/debt'
import { debtSizingEbitda, entryEbitda, resolveTrancheSourceAmount } from '../model/sourcesUses'
import type { DealInputs } from '../model/types'
import { useDealStore } from '../state/store'
import { SliderControl } from './controls/SliderControl'
import { paramRanges } from './controls/paramRanges'
import { ToggleControl } from './controls/ToggleControl'
import { formatMultiple, formatNumber, formatPercent } from './format'
import { TableNumberInput } from './fullmodel/tableInputs'

function GrowthModeToggle({
  mode,
  onChange,
}: {
  mode: 'flat' | 'perYear'
  onChange: (mode: 'flat' | 'perYear') => void
}) {
  return (
    <div className="flex border" style={{ borderColor: 'var(--color-border-strong)' }}>
      {(['flat', 'perYear'] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          aria-pressed={mode === m}
          className="text-xs px-2 py-1 cursor-pointer"
          style={{
            color: mode === m ? 'var(--color-bg)' : 'var(--color-text-muted)',
            background: mode === m ? 'var(--color-brass)' : 'transparent',
          }}
        >
          {m === 'flat' ? en.controls.growthFlat : en.controls.growthPerYear}
        </button>
      ))}
    </div>
  )
}

function ControlGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="text-sm uppercase tracking-wide mb-2" style={{ color: 'var(--color-brass)' }}>
        {title}
      </legend>
      {children}
    </fieldset>
  )
}

export function EssentialsControls() {
  const inputs = useDealStore((s) => s.inputs)
  const updateInputs = useDealStore((s) => s.updateInputs)
  const t = en.controls

  const primaryTranche = inputs.financing.tranches[0]
  const debtEbitda = debtSizingEbitda(inputs)
  // Funded debt only — an undrawn revolver commitment doesn't count, so this
  // lines up with what Sources & Uses actually shows as "Debt tranches".
  const totalDebtMultiple =
    debtEbitda > 0
      ? inputs.financing.tranches.reduce((sum, tr) => sum + resolveTrancheSourceAmount(tr, debtEbitda), 0) / debtEbitda
      : 0

  function update(fn: (draft: DealInputs) => void) {
    updateInputs((prev) => {
      const next: DealInputs = structuredClone(prev)
      fn(next)
      return next
    })
  }

  /** Scales every tranche's amount proportionally (funded amount as the basis) so the total (in × EBITDA) becomes `nextTotal` — keeps the capital structure's relative mix intact, including the revolver's committed size. */
  function scaleAllTranches(nextTotal: number) {
    update((d) => {
      const ebitda = debtSizingEbitda(d)
      if (ebitda <= 0 || d.financing.tranches.length === 0) return
      const currentTotal =
        d.financing.tranches.reduce((sum, tr) => sum + resolveTrancheSourceAmount(tr, ebitda), 0) / ebitda
      if (currentTotal > 0) {
        const scale = nextTotal / currentTotal
        for (const tr of d.financing.tranches) tr.amount.value *= scale
      } else {
        const first = d.financing.tranches[0]!
        first.amount = { mode: 'multipleOfEbitda', value: nextTotal }
      }
    })
  }

  return (
    <div className="flex flex-col gap-8">
      <ControlGroup title={t.transactionGroup}>
        <SliderControl
          label={t.entryMultiple}
          value={inputs.transaction.entryMultiple}
          range={paramRanges.entryMultiple}
          formatValue={(v) => formatMultiple(v)}
          onChange={(v) =>
            update((d) => {
              d.transaction.entryMultiple = v
              if (d.exit.exitMultipleEqualsEntry) d.exit.exitMultiple = v
            })
          }
        />
        <SliderControl
          label={t.ltmEbitda}
          value={entryEbitda(inputs)}
          range={paramRanges.ltmEbitda}
          formatValue={(v) => formatNumber(v, 1)}
          onChange={(v) =>
            update((d) => {
              // LTM EBITDA is derived (revenueYear0 × margin), not stored — so
              // this slider back-solves revenueYear0 for the chosen EBITDA,
              // leaving the margin untouched. Margin can't reach exactly 0 via
              // its own slider, but an imported/linked case could set it there;
              // guard the division rather than writing NaN into the state.
              if (d.operating.ebitdaMarginPct > 0) {
                d.operating.revenueYear0 = v / (d.operating.ebitdaMarginPct / 100)
              }
            })
          }
        />
      </ControlGroup>

      <ControlGroup title={t.financingGroup}>
        {inputs.financing.tranches.length > 0 && (
          <SliderControl
            label={t.debtMultiple}
            value={totalDebtMultiple}
            range={paramRanges.debtMultiple}
            formatValue={(v) => formatMultiple(v)}
            onChange={scaleAllTranches}
          />
        )}
        {primaryTranche && (
          <>
            <SliderControl
              label={t.interestRate}
              value={resolveTrancheRate(primaryTranche, inputs.financing.referenceRateCurve, 1)}
              range={paramRanges.interestRate}
              formatValue={(v) => formatPercent(v, 1)}
              onChange={(v) =>
                update((d) => {
                  const primary = d.financing.tranches[0]
                  if (!primary) return
                  // Displayed value is the effective rate (reference + margin
                  // for a floating tranche, the flat rate for a fixed one) —
                  // not fixedRatePct, which a floating tranche never reads
                  // (that was Befund 3: this slider used to write a field the
                  // engine ignored). Multiple tranches move together
                  // proportionally, the same mechanism the debt-amount slider
                  // uses in scaleAllTranches() below.
                  const currentRate = resolveTrancheRate(primary, d.financing.referenceRateCurve, 1)
                  if (currentRate <= 0) {
                    if (primary.rate?.kind === 'floating') {
                      const ref = resolveReferenceRate(d.financing.referenceRateCurve, 1)
                      primary.rate.marginPct = Math.max(0, v - ref)
                    } else {
                      primary.fixedRatePct = v
                      if (primary.rate?.kind === 'fixed') primary.rate.ratePct = v
                    }
                    return
                  }
                  const scale = v / currentRate
                  for (const tr of d.financing.tranches) {
                    if (tr.rate?.kind === 'floating') {
                      tr.rate.marginPct = Math.max(0, tr.rate.marginPct * scale)
                    } else {
                      tr.fixedRatePct *= scale
                      if (tr.rate?.kind === 'fixed') tr.rate.ratePct *= scale
                    }
                  }
                })
              }
            />
            <SliderControl
              label={t.amortizationPct}
              value={primaryTranche.scheduledAmortizationPctOfOriginal}
              range={paramRanges.scheduledAmortization}
              formatValue={(v) => formatPercent(v, 1)}
              onChange={(v) =>
                update((d) => {
                  const tr = d.financing.tranches[0]
                  if (tr) tr.scheduledAmortizationPctOfOriginal = v
                })
              }
            />
            <SliderControl
              label={t.cashSweepPct}
              value={primaryTranche.cashSweepParticipationPct}
              range={paramRanges.cashSweepParticipation}
              formatValue={(v) => formatPercent(v, 0)}
              onChange={(v) =>
                update((d) => {
                  const tr = d.financing.tranches[0]
                  if (tr) tr.cashSweepParticipationPct = v
                })
              }
            />
          </>
        )}
      </ControlGroup>

      <ControlGroup title={t.operatingGroup}>
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <span className="text-sm" style={{ color: 'var(--color-text)' }}>
              {t.revenueGrowth}
            </span>
            <GrowthModeToggle
              mode={inputs.operating.revenueGrowthMode ?? 'flat'}
              onChange={(mode) =>
                update((d) => {
                  if (mode === 'perYear' && (d.operating.revenueGrowthByYear?.length ?? 0) === 0) {
                    d.operating.revenueGrowthByYear = Array.from(
                      { length: d.transaction.holdPeriodYears },
                      () => d.operating.revenueGrowthPct,
                    )
                  }
                  d.operating.revenueGrowthMode = mode
                })
              }
            />
          </div>

          {(inputs.operating.revenueGrowthMode ?? 'flat') === 'flat' ? (
            <SliderControl
              label={t.revenueGrowth}
              value={inputs.operating.revenueGrowthPct}
              range={paramRanges.revenueGrowth}
              formatValue={(v) => formatPercent(v, 1)}
              onChange={(v) =>
                update((d) => {
                  d.operating.revenueGrowthPct = v
                })
              }
            />
          ) : (
            <div className="flex flex-col gap-1.5">
              {Array.from({ length: inputs.transaction.holdPeriodYears }, (_, i) => i + 1).map((year) => (
                <div key={year} className="flex items-center gap-3">
                  <span className="text-xs w-14" style={{ color: 'var(--color-text-muted)' }}>
                    Year {year}
                  </span>
                  <TableNumberInput
                    value={inputs.operating.revenueGrowthByYear?.[year - 1] ?? inputs.operating.revenueGrowthPct}
                    onChange={(v) =>
                      update((d) => {
                        const arr = d.operating.revenueGrowthByYear
                          ? [...d.operating.revenueGrowthByYear]
                          : Array.from({ length: d.transaction.holdPeriodYears }, () => d.operating.revenueGrowthPct)
                        while (arr.length < year) arr.push(d.operating.revenueGrowthPct)
                        arr[year - 1] = v
                        d.operating.revenueGrowthByYear = arr
                      })
                    }
                    step={0.5}
                    width="w-20"
                    ariaLabel={`Revenue growth, year ${year}`}
                  />
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    %
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <SliderControl
          label={t.ebitdaMargin}
          value={inputs.operating.ebitdaMarginPct}
          range={paramRanges.ebitdaMargin}
          formatValue={(v) => formatPercent(v, 1)}
          onChange={(v) =>
            update((d) => {
              d.operating.ebitdaMarginPct = v
            })
          }
        />
      </ControlGroup>

      <ControlGroup title={t.exitGroup}>
        <SliderControl
          label={t.holdPeriodYears}
          value={inputs.transaction.holdPeriodYears}
          range={paramRanges.holdPeriod}
          formatValue={(v) => formatNumber(v, 0)}
          onChange={(v) =>
            update((d) => {
              d.transaction.holdPeriodYears = v
              d.exit.exitYear = v
            })
          }
        />
        <ToggleControl
          label={t.exitEqualsEntry}
          checked={inputs.exit.exitMultipleEqualsEntry}
          onChange={(checked) =>
            update((d) => {
              d.exit.exitMultipleEqualsEntry = checked
              if (checked) d.exit.exitMultiple = d.transaction.entryMultiple
            })
          }
        />
        {!inputs.exit.exitMultipleEqualsEntry && (
          <SliderControl
            label={t.exitMultiple}
            value={inputs.exit.exitMultiple}
            range={paramRanges.exitMultiple}
            formatValue={(v) => formatMultiple(v)}
            onChange={(v) =>
              update((d) => {
                d.exit.exitMultiple = v
              })
            }
          />
        )}
      </ControlGroup>
    </div>
  )
}
