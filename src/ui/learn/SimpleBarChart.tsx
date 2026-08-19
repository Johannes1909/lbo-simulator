interface Bar {
  label: string
  value: number
}

interface SimpleBarChartProps {
  bars: Bar[]
  formatValue: (value: number) => string
  /** Defaults to the brass accent; pass 'debt' to use the steel-blue debt color instead. */
  color?: 'brass' | 'debt'
}

const WIDTH = 480
const HEIGHT = 200
const MARGIN = { top: 24, right: 16, bottom: 28, left: 16 }

/** For 2–4 values side by side — e.g. a metric under two or three assumptions. Not for time series (use the calculator's charts for that). */
export function SimpleBarChart({ bars, formatValue, color = 'brass' }: SimpleBarChartProps) {
  const plotWidth = WIDTH - MARGIN.left - MARGIN.right
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom
  const maxValue = Math.max(1, ...bars.map((b) => Math.abs(b.value)))
  const bandWidth = plotWidth / bars.length
  const barWidth = bandWidth * 0.55
  const fill = color === 'debt' ? 'var(--color-debt)' : 'var(--color-brass-light)'

  const xForIndex = (i: number) => MARGIN.left + i * bandWidth + (bandWidth - barWidth) / 2
  const yFor = (v: number) => MARGIN.top + plotHeight - (Math.max(0, v) / maxValue) * plotHeight

  const ariaLabel = bars.map((b) => `${b.label}: ${formatValue(b.value)}`).join(', ')

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={ariaLabel} className="w-full h-auto">
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
          y={yFor(b.value)}
          width={barWidth}
          height={Math.max(1, MARGIN.top + plotHeight - yFor(b.value))}
          fill={fill}
        />
      ))}
      {bars.map((b, i) => (
        <text
          key={`val-${b.label}`}
          x={xForIndex(i) + barWidth / 2}
          y={yFor(b.value) - 6}
          textAnchor="middle"
          fontSize={11}
          fontFamily="var(--font-mono)"
          fill="var(--color-heading)"
        >
          {formatValue(b.value)}
        </text>
      ))}
      {bars.map((b, i) => (
        <text
          key={`label-${b.label}`}
          x={xForIndex(i) + barWidth / 2}
          y={HEIGHT - 8}
          textAnchor="middle"
          fontSize={11}
          fill="var(--color-text-muted)"
        >
          {b.label}
        </text>
      ))}
    </svg>
  )
}
