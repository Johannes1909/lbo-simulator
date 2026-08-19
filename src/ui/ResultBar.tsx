import { en } from '../i18n/en'
import type { ModelOutput } from '../model/types'
import { debtSizingEbitda } from '../model/sourcesUses'
import { useDealStore } from '../state/store'
import { AnimatedNumber } from './AnimatedNumber'
import { formatMultiple, formatPercent } from './format'

interface ResultBarProps {
  output: ModelOutput
}

/**
 * Pinned above the scroll area: the numbers that must never require a
 * scroll to see after moving a slider.
 */
export function ResultBar({ output }: ResultBarProps) {
  const inputs = useDealStore((s) => s.inputs)
  const t = en.resultBar

  const entryLeverage = output.sourcesUses.sourcesTrancheTotal / debtSizingEbitda(inputs)
  const exitCredit = output.creditMetrics.find((y) => y.year === inputs.exit.exitYear)
  const exitLeverage = exitCredit?.netDebtToEbitda ?? NaN

  const hasCovenants = false // covenants arrive in Milestone 2 — no false "OK" is shown in the meantime

  return (
    <div
      className="sticky top-14 z-20 border-b px-6 py-3 flex flex-wrap items-center gap-x-8 gap-y-2"
      style={{ background: 'var(--color-bg-panel)', borderColor: 'var(--color-border)' }}
    >
      <div className="flex items-baseline gap-2">
        <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
          {t.irr}
        </span>
        <AnimatedNumber
          value={output.returns.irr !== null ? output.returns.irr * 100 : NaN}
          format={(v) => (Number.isFinite(v) ? formatPercent(v, 1) : '—')}
          className="font-figures text-lg"
        />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
          {t.moneyMultiple}
        </span>
        <AnimatedNumber
          value={output.returns.moneyMultiple ?? NaN}
          format={(v) => (Number.isFinite(v) ? formatMultiple(v) : '—')}
          className="font-figures text-lg"
        />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
          {t.entryLeverage}
        </span>
        <AnimatedNumber
          value={entryLeverage}
          format={(v) => (Number.isFinite(v) ? formatMultiple(v) : '—')}
          className="font-figures text-lg"
        />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
          {t.exitLeverage}
        </span>
        <AnimatedNumber
          value={exitLeverage}
          format={(v) => (Number.isFinite(v) ? formatMultiple(v) : '—')}
          className="font-figures text-lg"
        />
      </div>
      <div className="flex items-center gap-2 ml-auto">
        <span
          className="w-2.5 h-2.5"
          style={{ background: hasCovenants ? 'var(--color-brass)' : 'var(--color-text-muted)' }}
          aria-hidden="true"
        />
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {hasCovenants ? t.covenantOk : t.covenantsPending}
        </span>
      </div>
    </div>
  )
}
