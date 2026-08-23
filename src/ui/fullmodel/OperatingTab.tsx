import { en } from '../../i18n/en'
import type { DealInputs } from '../../model/types'
import { useDealStore } from '../../state/store'
import { SliderControl } from '../controls/SliderControl'
import { paramRanges } from '../controls/paramRanges'
import { formatPercent } from '../format'
import { TableNumberInput } from './tableInputs'

/**
 * The four sliders that moved out of Essentials (per Milestone 1 acceptance
 * feedback), plus per-year one-off costs — the only per-year operating
 * override available before Milestone 3's full operating-plan tables.
 */
export function OperatingTab() {
  const inputs = useDealStore((s) => s.inputs)
  const updateInputs = useDealStore((s) => s.updateInputs)
  const t = en.controls

  function update(fn: (draft: DealInputs) => void) {
    updateInputs((prev) => {
      const next = structuredClone(prev)
      fn(next)
      return next
    })
  }

  const years = Array.from({ length: inputs.transaction.holdPeriodYears }, (_, i) => i + 1)

  return (
    <div className="flex flex-col gap-10 max-w-md">
      <section className="flex flex-col gap-4">
        <h2 className="text-xl mb-2">Operating plan detail</h2>
        <SliderControl
          label={t.daPctRevenue}
          value={inputs.operating.daPctOfRevenue}
          range={paramRanges.daPctRevenue}
          formatValue={(v) => formatPercent(v, 1)}
          onChange={(v) => update((d) => (d.operating.daPctOfRevenue = v))}
        />
        <SliderControl
          label={t.capexPctRevenue}
          value={inputs.operating.maintenanceCapexPctOfRevenue}
          range={paramRanges.capexPctRevenue}
          formatValue={(v) => formatPercent(v, 1)}
          onChange={(v) => update((d) => (d.operating.maintenanceCapexPctOfRevenue = v))}
        />
        <SliderControl
          label={t.workingCapitalPct}
          value={inputs.operating.workingCapitalPctOfRevenueGrowth}
          range={paramRanges.workingCapitalPct}
          formatValue={(v) => formatPercent(v, 1)}
          onChange={(v) => update((d) => (d.operating.workingCapitalPctOfRevenueGrowth = v))}
        />
        <SliderControl
          label={t.taxRate}
          value={inputs.operating.taxRatePct}
          range={paramRanges.taxRate}
          formatValue={(v) => formatPercent(v, 1)}
          onChange={(v) => update((d) => (d.operating.taxRatePct = v))}
        />
      </section>

      <section>
        <h2 className="text-xl mb-1">One-off costs</h2>
        <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
          Cash costs in a specific year (restructuring, integration, a downturn) — not tax-deductible in this
          version, subtracted directly from free cash flow. Revenue growth can be set per year on the calculator
          (Uniform/Per year toggle); per-year overrides for margin, capex and working capital arrive in
          Milestone 3.
        </p>
        <div className="flex flex-col gap-2">
          {years.map((year) => (
            <div key={year} className="flex items-center gap-3 text-sm">
              <span className="w-16" style={{ color: 'var(--color-text-muted)' }}>
                Year {year}
              </span>
              <TableNumberInput
                value={inputs.operating.oneOffCostsByYear[year - 1] ?? 0}
                onChange={(v) =>
                  update((d) => {
                    const arr = [...d.operating.oneOffCostsByYear]
                    while (arr.length < year) arr.push(0)
                    arr[year - 1] = v
                    d.operating.oneOffCostsByYear = arr
                  })
                }
                step={0.5}
                ariaLabel={`One-off cost, year ${year}`}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
