import { en } from '../i18n/en'
import type { DealInputs } from '../model/types'
import { useDealStore } from '../state/store'
import { SliderControl } from './controls/SliderControl'
import { paramRanges } from './controls/paramRanges'
import { ToggleControl } from './controls/ToggleControl'
import { formatMultiple, formatNumber, formatPercent } from './format'

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

  const tranche = inputs.financing.tranches[0]

  function update(fn: (draft: DealInputs) => void) {
    updateInputs((prev) => {
      const next: DealInputs = structuredClone(prev)
      fn(next)
      return next
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
          value={inputs.transaction.ltmMetric}
          range={paramRanges.ltmEbitda}
          formatValue={(v) => formatNumber(v, 1)}
          onChange={(v) =>
            update((d) => {
              d.transaction.ltmMetric = v
            })
          }
        />
      </ControlGroup>

      <ControlGroup title={t.financingGroup}>
        {tranche && tranche.amount.mode === 'multipleOfEbitda' && (
          <SliderControl
            label={t.debtMultiple}
            value={tranche.amount.value}
            range={paramRanges.debtMultiple}
            formatValue={(v) => formatMultiple(v)}
            onChange={(v) =>
              update((d) => {
                const tr = d.financing.tranches[0]
                if (tr && tr.amount.mode === 'multipleOfEbitda') tr.amount.value = v
              })
            }
          />
        )}
        {tranche && (
          <>
            <SliderControl
              label={t.interestRate}
              value={tranche.fixedRatePct}
              range={paramRanges.interestRate}
              formatValue={(v) => formatPercent(v, 1)}
              onChange={(v) =>
                update((d) => {
                  const tr = d.financing.tranches[0]
                  if (tr) tr.fixedRatePct = v
                })
              }
            />
            <SliderControl
              label={t.amortizationPct}
              value={tranche.scheduledAmortizationPctOfOriginal}
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
              value={tranche.cashSweepParticipationPct}
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
        <SliderControl
          label={t.daPctRevenue}
          value={inputs.operating.daPctOfRevenue}
          range={paramRanges.daPctRevenue}
          formatValue={(v) => formatPercent(v, 1)}
          onChange={(v) =>
            update((d) => {
              d.operating.daPctOfRevenue = v
            })
          }
        />
        <SliderControl
          label={t.capexPctRevenue}
          value={inputs.operating.maintenanceCapexPctOfRevenue}
          range={paramRanges.capexPctRevenue}
          formatValue={(v) => formatPercent(v, 1)}
          onChange={(v) =>
            update((d) => {
              d.operating.maintenanceCapexPctOfRevenue = v
            })
          }
        />
        <SliderControl
          label={t.workingCapitalPct}
          value={inputs.operating.workingCapitalPctOfRevenueGrowth}
          range={paramRanges.workingCapitalPct}
          formatValue={(v) => formatPercent(v, 1)}
          onChange={(v) =>
            update((d) => {
              d.operating.workingCapitalPctOfRevenueGrowth = v
            })
          }
        />
        <SliderControl
          label={t.taxRate}
          value={inputs.operating.taxRatePct}
          range={paramRanges.taxRate}
          formatValue={(v) => formatPercent(v, 1)}
          onChange={(v) =>
            update((d) => {
              d.operating.taxRatePct = v
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
