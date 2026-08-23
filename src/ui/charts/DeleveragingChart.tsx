import { en } from '../../i18n/en'
import { debtSizingEbitda } from '../../model/sourcesUses'
import type { DealInputs, ModelOutput } from '../../model/types'
import { formatMoney, formatMultiple } from '../format'

interface DeleveragingChartProps {
  inputs: DealInputs
  output: ModelOutput
}

const WIDTH = 560
const HEIGHT = 240
const MARGIN = { top: 16, right: 40, bottom: 44, left: 48 }
const RANK_COLOR_COUNT = 5

/** Cycles through the 5 debt-rank shades if there are more tranches than shades. */
function colorForRankPosition(position: number): string {
  return `var(--color-debt-rank-${(position % RANK_COLOR_COUNT) + 1})`
}

export function DeleveragingChart({ inputs, output }: DeleveragingChartProps) {
  const t = en.charts.deleveraging

  const tranchesByRank = [...inputs.financing.tranches].sort((a, b) => a.seniorityRank - b.seniorityRank)
  const colorByTrancheId = new Map(tranchesByRank.map((tr, i) => [tr.id, colorForRankPosition(i)]))

  const points = [
    {
      year: 0,
      label: 'Close',
      balances: output.debtYears[0]
        ? new Map(output.debtYears[0].tranches.map((ty) => [ty.trancheId, ty.openingBalance]))
        : new Map<string, number>(),
      leverage: output.sourcesUses.sourcesTrancheTotal / debtSizingEbitda(inputs),
    },
    ...output.debtYears.map((dy, i) => ({
      year: dy.year,
      label: `Y${dy.year}`,
      balances: new Map(dy.tranches.map((ty) => [ty.trancheId, ty.closingBalance])),
      leverage: output.creditMetrics[i]!.netDebtToEbitda,
    })),
  ]

  const totalDebtAt = (p: (typeof points)[number]) =>
    tranchesByRank.reduce((sum, tr) => sum + (p.balances.get(tr.id) ?? 0), 0)

  const plotWidth = WIDTH - MARGIN.left - MARGIN.right
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom

  const maxDebt = Math.max(1, ...points.map(totalDebtAt))
  const maxLeverage = Math.max(0.1, ...points.map((p) => (Number.isFinite(p.leverage) ? p.leverage : 0)))

  const bandWidth = plotWidth / points.length
  const barWidth = bandWidth * 0.55

  const xForIndex = (i: number) => MARGIN.left + i * bandWidth + bandWidth / 2
  const yForDebt = (v: number) => MARGIN.top + plotHeight - (v / maxDebt) * plotHeight
  const yForLeverage = (v: number) => MARGIN.top + plotHeight - (v / maxLeverage) * plotHeight

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xForIndex(i)} ${yForLeverage(p.leverage)}`)
    .join(' ')

  return (
    <div>
      <h3 className="text-base mb-1">{t.title}</h3>
      <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
        {t.subtitle}
      </p>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`${t.title}: debt balance from ${formatMoney(totalDebtAt(points[0]!))} at close to ${formatMoney(totalDebtAt(points.at(-1)!))} at exit, leverage from ${formatMultiple(points[0]!.leverage)} to ${formatMultiple(points.at(-1)!.leverage)}.`}
        className="w-full h-auto"
      >
        <line
          x1={MARGIN.left}
          y1={MARGIN.top + plotHeight}
          x2={WIDTH - MARGIN.right}
          y2={MARGIN.top + plotHeight}
          stroke="var(--color-border)"
        />
        {points.map((p, i) => {
          let stackedSoFar = 0
          return (
            <g key={p.year}>
              {tranchesByRank.map((tr) => {
                const balance = p.balances.get(tr.id) ?? 0
                const y = yForDebt(stackedSoFar + balance)
                const height = Math.max(0, yForDebt(stackedSoFar) - y)
                stackedSoFar += balance
                if (balance <= 0) return null
                return (
                  <rect
                    key={tr.id}
                    x={xForIndex(i) - barWidth / 2}
                    y={y}
                    width={barWidth}
                    height={height}
                    fill={colorByTrancheId.get(tr.id)}
                  />
                )
              })}
            </g>
          )
        })}
        <path d={linePath} fill="none" stroke="var(--color-brass)" strokeWidth={2} />
        {points.map((p, i) => (
          <circle key={`pt-${p.year}`} cx={xForIndex(i)} cy={yForLeverage(p.leverage)} r={3} fill="var(--color-brass-light)" />
        ))}
        {points.map((p, i) => (
          <text
            key={`label-${p.year}`}
            x={xForIndex(i)}
            y={HEIGHT - 30}
            textAnchor="middle"
            fontSize={10}
            fill="var(--color-text-muted)"
            fontFamily="var(--font-mono)"
          >
            {p.label}
          </text>
        ))}
      </svg>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
        {tranchesByRank.map((tr, i) => (
          <span key={tr.id}>
            <span
              className="inline-block w-2.5 h-2.5 mr-1 align-middle"
              style={{ background: colorForRankPosition(i) }}
            />
            {tr.name}
          </span>
        ))}
        <span>
          <span className="inline-block w-2.5 h-2.5 mr-1 align-middle" style={{ background: 'var(--color-brass)' }} />
          Net debt / EBITDA
        </span>
      </div>
    </div>
  )
}
