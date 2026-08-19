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
const MARGIN = { top: 16, right: 40, bottom: 28, left: 48 }

export function DeleveragingChart({ inputs, output }: DeleveragingChartProps) {
  const t = en.charts.deleveraging

  const points = [
    {
      year: 0,
      debt: output.sourcesUses.sourcesTrancheTotal,
      leverage: output.sourcesUses.sourcesTrancheTotal / debtSizingEbitda(inputs),
    },
    ...output.debtYears.map((dy, i) => ({
      year: dy.year,
      debt: dy.totalDebtClosing,
      leverage: output.creditMetrics[i]!.netDebtToEbitda,
    })),
  ]

  const plotWidth = WIDTH - MARGIN.left - MARGIN.right
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom

  const maxDebt = Math.max(1, ...points.map((p) => p.debt))
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
        aria-label={`${t.title}: debt balance from ${formatMoney(points[0]!.debt)} at close to ${formatMoney(points.at(-1)!.debt)} at exit, leverage from ${formatMultiple(points[0]!.leverage)} to ${formatMultiple(points.at(-1)!.leverage)}.`}
        className="w-full h-auto"
      >
        <line
          x1={MARGIN.left}
          y1={MARGIN.top + plotHeight}
          x2={WIDTH - MARGIN.right}
          y2={MARGIN.top + plotHeight}
          stroke="var(--color-border)"
        />
        {points.map((p, i) => (
          <rect
            key={p.year}
            x={xForIndex(i) - barWidth / 2}
            y={yForDebt(p.debt)}
            width={barWidth}
            height={MARGIN.top + plotHeight - yForDebt(p.debt)}
            fill="var(--color-debt)"
          />
        ))}
        <path d={linePath} fill="none" stroke="var(--color-brass)" strokeWidth={2} />
        {points.map((p, i) => (
          <circle key={`pt-${p.year}`} cx={xForIndex(i)} cy={yForLeverage(p.leverage)} r={3} fill="var(--color-brass-light)" />
        ))}
        {points.map((p, i) => (
          <text
            key={`label-${p.year}`}
            x={xForIndex(i)}
            y={HEIGHT - 8}
            textAnchor="middle"
            fontSize={10}
            fill="var(--color-text-muted)"
            fontFamily="var(--font-mono)"
          >
            {p.year === 0 ? 'Close' : `Y${p.year}`}
          </text>
        ))}
      </svg>
      <div className="flex gap-4 text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
        <span>
          <span
            className="inline-block w-2.5 h-2.5 mr-1 align-middle"
            style={{ background: 'var(--color-debt)' }}
          />
          Debt balance
        </span>
        <span>
          <span
            className="inline-block w-2.5 h-2.5 mr-1 align-middle"
            style={{ background: 'var(--color-brass)' }}
          />
          Net debt / EBITDA
        </span>
      </div>
    </div>
  )
}
