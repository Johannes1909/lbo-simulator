import { runModel } from '../../model/engine'
import type { DealInputs } from '../../model/types'
import { formatMoney, formatMultiple, formatPercent } from '../format'
import { WarningsPanel } from '../WarningsPanel'

export interface ComparisonCase {
  label: string
  inputs: DealInputs
}

export type ComparisonMetricKey =
  | 'equityInvested'
  | 'exitEquity'
  | 'moneyMultiple'
  | 'irr'
  | 'exitEbitda'
  | 'exitNetDebt'
  | 'netDebtToEbitda'

const METRIC_LABELS: Record<ComparisonMetricKey, string> = {
  equityInvested: 'Equity invested',
  exitEquity: 'Equity at exit',
  moneyMultiple: 'Money multiple',
  irr: 'IRR',
  exitEbitda: 'EBITDA at exit',
  exitNetDebt: 'Net debt at exit',
  netDebtToEbitda: 'Net debt / EBITDA',
}

interface ComputedColumn {
  label: string
  inputs: DealInputs
  output: ReturnType<typeof runModel>
}

function metricValue(column: ComputedColumn, key: ComparisonMetricKey): number | null {
  const { inputs, output } = column
  switch (key) {
    case 'equityInvested':
      return output.sourcesUses.sourcesSponsorEquity
    case 'exitEquity':
      return output.returns.exitEquityValue
    case 'moneyMultiple':
      return output.returns.moneyMultiple
    case 'irr':
      return output.returns.irr === null ? null : output.returns.irr * 100
    case 'exitEbitda':
      return output.operatingYears.find((y) => y.year === inputs.exit.exitYear)?.ebitda ?? null
    case 'exitNetDebt':
      return output.returns.exitNetDebt
    case 'netDebtToEbitda':
      return output.creditMetrics.find((y) => y.year === inputs.exit.exitYear)?.netDebtToEbitda ?? null
  }
}

function formatMetric(key: ComparisonMetricKey, value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—'
  if (key === 'moneyMultiple' || key === 'netDebtToEbitda') return formatMultiple(value)
  if (key === 'irr') return formatPercent(value)
  return formatMoney(value)
}

interface ComparisonTableProps {
  cases: ComparisonCase[]
  metrics?: ComparisonMetricKey[]
}

/**
 * Runs runModel() on each case at render time — nothing here is a stored
 * number. If the engine changes, this table changes with it. Any warnings
 * the model raised for a case (e.g. a liquidity shortfall) are shown below
 * the table automatically, prefixed with that case's label.
 */
export function ComparisonTable({
  cases,
  metrics = ['equityInvested', 'exitEquity', 'moneyMultiple', 'irr'],
}: ComparisonTableProps) {
  const columns: ComputedColumn[] = cases.map((c) => ({
    label: c.label,
    inputs: c.inputs,
    output: runModel(c.inputs),
  }))

  const combinedWarnings = columns.flatMap((c) => c.output.warnings.map((w) => `${c.label} — ${w}`))

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--color-border-strong)' }}>
              <th className="text-left py-2 font-normal" style={{ color: 'var(--color-text-muted)' }}></th>
              {columns.map((c) => (
                <th
                  key={c.label}
                  className="text-right py-2 font-normal"
                  style={{ color: 'var(--color-heading)' }}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((m) => (
              <tr key={m} className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                <th scope="row" className="text-left py-2 font-normal" style={{ color: 'var(--color-text)' }}>
                  {METRIC_LABELS[m]}
                </th>
                {columns.map((c) => (
                  <td
                    key={c.label}
                    className="text-right py-2 font-figures"
                    style={{ color: 'var(--color-text)' }}
                  >
                    {formatMetric(m, metricValue(c, m))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <WarningsPanel warnings={combinedWarnings} />
    </div>
  )
}
