import { en } from '../../i18n/en'
import { enterpriseValue } from '../../model/sourcesUses'
import type { DealInputs, ModelOutput } from '../../model/types'
import { formatMoney } from '../format'

interface ValueSplitChartProps {
  inputs: DealInputs
  output: ModelOutput
}

const WIDTH = 560
const HEIGHT = 240
const MARGIN = { top: 16, right: 16, bottom: 28, left: 48 }

/**
 * Enterprise value at each year, valued at the entry multiple throughout
 * (not the exit assumption) — this isolates the organic value build from
 * multiple-timing effects, which is what "the equity wedge grows" is meant
 * to show.
 */
export function ValueSplitChart({ inputs, output }: ValueSplitChartProps) {
  const t = en.charts.valueSplit
  const entryMultiple = inputs.transaction.entryMultiple

  const points = [
    {
      year: 0,
      ev: enterpriseValue(inputs),
      netDebt: output.sourcesUses.sourcesTrancheTotal - inputs.transaction.minCashBalance,
    },
    ...output.debtYears.map((dy, i) => ({
      year: dy.year,
      ev: output.operatingYears[i]!.ebitda * entryMultiple,
      netDebt: dy.netDebtClosing,
    })),
  ]

  const plotWidth = WIDTH - MARGIN.left - MARGIN.right
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom
  // Scaled to whichever is larger, EV or net debt — at extreme leverage net
  // debt can exceed enterprise value (the company is underwater), and the
  // debt bar needs to fit the plot area rather than overflow it.
  const maxEv = Math.max(1, ...points.map((p) => Math.max(p.ev, p.netDebt)))
  const bandWidth = plotWidth / points.length
  const barWidth = bandWidth * 0.6

  const yFor = (v: number) => MARGIN.top + plotHeight - (v / maxEv) * plotHeight
  const xForIndex = (i: number) => MARGIN.left + i * bandWidth + (bandWidth - barWidth) / 2

  return (
    <div>
      <h3 className="text-base mb-1">{t.title}</h3>
      <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
        {t.subtitle}
      </p>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`${t.title}: equity share of enterprise value grows from ${formatMoney(points[0]!.ev - points[0]!.netDebt)} at close to ${formatMoney(points.at(-1)!.ev - points.at(-1)!.netDebt)} at exit.`}
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
          const netDebt = Math.max(0, p.netDebt)
          const equity = p.ev - p.netDebt
          const debtTop = yFor(netDebt)
          const equityTop = yFor(netDebt + equity)
          return (
            <g key={p.year}>
              <rect
                x={xForIndex(i)}
                y={debtTop}
                width={barWidth}
                height={MARGIN.top + plotHeight - debtTop}
                fill="var(--color-debt)"
              />
              <rect
                x={xForIndex(i)}
                y={equityTop}
                width={barWidth}
                height={Math.max(0, debtTop - equityTop)}
                fill="var(--color-equity)"
              />
            </g>
          )
        })}
        {points.map((p, i) => (
          <text
            key={`label-${p.year}`}
            x={xForIndex(i) + barWidth / 2}
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
          <span className="inline-block w-2.5 h-2.5 mr-1 align-middle" style={{ background: 'var(--color-debt)' }} />
          {t.netDebt}
        </span>
        <span>
          <span className="inline-block w-2.5 h-2.5 mr-1 align-middle" style={{ background: 'var(--color-equity)' }} />
          {t.equity}
        </span>
      </div>
    </div>
  )
}
