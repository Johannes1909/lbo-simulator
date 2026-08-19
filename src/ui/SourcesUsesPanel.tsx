import { en } from '../i18n/en'
import type { SourcesUses } from '../model/types'
import { formatMoney } from './format'

interface SourcesUsesPanelProps {
  sourcesUses: SourcesUses
}

/**
 * Every line that goes into the equity check has to be visible here —
 * transaction costs and the minimum cash funded at close must never
 * disappear silently into the "equity invested" figure.
 */
export function SourcesUsesPanel({ sourcesUses }: SourcesUsesPanelProps) {
  const t = en.sourcesUses

  const usesRows = [
    { label: t.equityPurchasePrice, value: sourcesUses.usesEquityPurchasePrice },
    { label: t.refinanceTargetDebt, value: sourcesUses.usesRefinanceTargetDebt },
    { label: t.transactionCosts, value: sourcesUses.usesTransactionCosts },
    { label: t.minCashFunding, value: sourcesUses.usesMinCashFunding },
  ]
  const sourcesRows = [
    { label: t.debtTranches, value: sourcesUses.sourcesTrancheTotal },
    { label: t.sponsorEquity, value: sourcesUses.sourcesSponsorEquity },
  ]

  return (
    <div className="border-t border-b py-4" style={{ borderColor: 'var(--color-border)' }}>
      <h3 className="text-base px-0">{t.title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 pt-3 text-sm">
        <div>
          <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>
            {t.uses}
          </div>
          {usesRows.map((r) => (
            <div key={r.label} className="flex justify-between py-0.5">
              <span style={{ color: 'var(--color-text)' }}>{r.label}</span>
              <span className="font-figures">{formatMoney(r.value)}</span>
            </div>
          ))}
          <div
            className="flex justify-between py-0.5 mt-1 border-t pt-1"
            style={{ borderColor: 'var(--color-border-strong)' }}
          >
            <span style={{ color: 'var(--color-heading)' }}>{t.total}</span>
            <span className="font-figures" style={{ color: 'var(--color-heading)' }}>
              {formatMoney(sourcesUses.usesTotal)}
            </span>
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>
            {t.sources}
          </div>
          {sourcesRows.map((r) => (
            <div key={r.label} className="flex justify-between py-0.5">
              <span style={{ color: 'var(--color-text)' }}>{r.label}</span>
              <span className="font-figures">{formatMoney(r.value)}</span>
            </div>
          ))}
          <div
            className="flex justify-between py-0.5 mt-1 border-t pt-1"
            style={{ borderColor: 'var(--color-border-strong)' }}
          >
            <span style={{ color: 'var(--color-heading)' }}>{t.total}</span>
            <span className="font-figures" style={{ color: 'var(--color-heading)' }}>
              {formatMoney(sourcesUses.sourcesTotal)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
