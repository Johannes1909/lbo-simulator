import { en } from '../../i18n/en'
import type { ValueBridge } from '../../model/types'
import { formatMoney } from '../format'

interface ValueBridgeChartProps {
  bridge: ValueBridge
}

const WIDTH = 560
const HEIGHT = 260
const MARGIN = { top: 20, right: 16, bottom: 48, left: 48 }

interface Step {
  label: string
  delta: number
  isTotal: boolean
}

export function ValueBridgeChart({ bridge }: ValueBridgeChartProps) {
  const t = en.charts.valueBridge

  const steps: Step[] = [
    { label: t.entryEquity, delta: bridge.entryEquity, isTotal: true },
    { label: t.ebitdaGrowth, delta: bridge.ebitdaGrowthEffect, isTotal: false },
    { label: t.multipleChange, delta: bridge.multipleEffect, isTotal: false },
    { label: t.deleveraging, delta: bridge.deleveragingEffect, isTotal: false },
    { label: t.exitEquity, delta: bridge.exitEquity, isTotal: true },
  ]

  let running = 0
  const bars = steps.map((s, i) => {
    const isLast = i === steps.length - 1
    const start = s.isTotal ? 0 : running
    const end = s.isTotal ? s.delta : running + s.delta
    if (!isLast) running = end
    return { ...s, start: Math.min(start, end), end: Math.max(start, end), value: s.delta }
  })

  const plotWidth = WIDTH - MARGIN.left - MARGIN.right
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom
  const maxValue = Math.max(...bars.map((b) => b.end), bridge.entryEquity, bridge.exitEquity)
  const bandWidth = plotWidth / bars.length
  const barWidth = bandWidth * 0.6

  const yFor = (v: number) => MARGIN.top + plotHeight - (v / maxValue) * plotHeight
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
        aria-label={`${t.title}: from ${formatMoney(bridge.entryEquity)} entry equity to ${formatMoney(bridge.exitEquity)} exit equity — ${t.ebitdaGrowth} ${formatMoney(bridge.ebitdaGrowthEffect)}, ${t.multipleChange} ${formatMoney(bridge.multipleEffect)}, ${t.deleveraging} ${formatMoney(bridge.deleveragingEffect)}.`}
        className="w-full h-auto"
      >
        <line
          x1={MARGIN.left}
          y1={MARGIN.top + plotHeight}
          x2={WIDTH - MARGIN.right}
          y2={MARGIN.top + plotHeight}
          stroke="var(--color-border)"
        />
        {bars.map((b, i) => (
          <rect
            key={b.label}
            x={xForIndex(i)}
            y={yFor(b.end)}
            width={barWidth}
            height={Math.max(1, yFor(b.start) - yFor(b.end))}
            fill={b.isTotal ? 'var(--color-equity)' : 'var(--color-debt)'}
          />
        ))}
        {bars.map((b, i) => (
          <text
            key={`val-${b.label}`}
            x={xForIndex(i) + barWidth / 2}
            y={yFor(b.end) - 6}
            textAnchor="middle"
            fontSize={10}
            fontFamily="var(--font-mono)"
            fill="var(--color-heading)"
          >
            {formatMoney(b.value, 0)}
          </text>
        ))}
        {bars.map((b, i) => (
          <text
            key={`label-${b.label}`}
            x={xForIndex(i) + barWidth / 2}
            y={HEIGHT - 26}
            textAnchor="middle"
            fontSize={10}
            fill="var(--color-text-muted)"
          >
            {b.label}
          </text>
        ))}
      </svg>
    </div>
  )
}
