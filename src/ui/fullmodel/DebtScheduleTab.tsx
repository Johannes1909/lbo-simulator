import type { TrancheYear } from '../../model/types'
import { useDealStore } from '../../state/store'
import { useModelOutput } from '../../state/useModelOutput'
import { formatMoney, formatMultiple, formatPercent } from '../format'
import { WarningsPanel } from '../WarningsPanel'

type TrancheRow = [string, (ty: TrancheYear) => number]

export function DebtScheduleTab() {
  const inputs = useDealStore((s) => s.inputs)
  const output = useModelOutput()

  const years = output.operatingYears.map((y) => y.year)
  const tranches = inputs.financing.tranches

  return (
    <div className="flex flex-col gap-10">
      <WarningsPanel warnings={output.warnings} />

      {tranches.map((t) => (
        <section key={t.id}>
          <h3 className="text-base mb-2">{t.name}</h3>
          <div className="overflow-x-auto">
            <table className="text-sm border-collapse w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--color-border-strong)' }}>
                  <th className="text-left py-1 font-normal" style={{ color: 'var(--color-text-muted)' }}></th>
                  {years.map((y) => (
                    <th key={y} className="text-right py-1 font-normal px-3" style={{ color: 'var(--color-text-muted)' }}>
                      Y{y}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="font-figures">
                {(
                  [
                    ['Opening balance', (ty) => ty.openingBalance],
                    ['Cash interest', (ty) => ty.cashInterest],
                    ['PIK interest', (ty) => ty.pikInterest],
                    ...(t.trancheType === 'revolver'
                      ? ([
                          ['Drawn', (ty) => ty.revolverDrawn],
                          ['Repaid', (ty) => ty.revolverRepaid],
                          ['Commitment fee', (ty) => ty.commitmentFeePaid],
                        ] satisfies TrancheRow[])
                      : ([
                          ['Scheduled amortization', (ty) => ty.scheduledAmortization],
                          ['Cash sweep', (ty) => ty.cashSweepAmortization],
                        ] satisfies TrancheRow[])),
                    ['Closing balance', (ty) => ty.closingBalance],
                  ] satisfies TrancheRow[]
                ).map(([label, getValue]) => (
                  <tr key={label} className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <td className="py-1" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-sans)' }}>
                      {label}
                    </td>
                    {output.debtYears.map((dy) => {
                      const ty = dy.tranches.find((x) => x.trancheId === t.id)
                      return (
                        <td key={dy.year} className="text-right py-1 px-3">
                          {ty ? formatMoney(getValue(ty)) : '—'}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <section>
        <h3 className="text-base mb-2">Total debt</h3>
        <div className="overflow-x-auto">
          <table className="text-sm border-collapse w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--color-border-strong)' }}>
                <th className="text-left py-1 font-normal" style={{ color: 'var(--color-text-muted)' }}></th>
                {years.map((y) => (
                  <th key={y} className="text-right py-1 font-normal px-3" style={{ color: 'var(--color-text-muted)' }}>
                    Y{y}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="font-figures">
              {(
                [
                  ['Total debt closing', (dy: (typeof output.debtYears)[number]) => dy.totalDebtClosing],
                  ['Cash closing', (dy) => dy.cashClosing],
                  ['Net debt closing', (dy) => dy.netDebtClosing],
                ] as [string, (dy: (typeof output.debtYears)[number]) => number][]
              ).map(([label, getValue]) => (
                <tr key={label} className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                  <td className="py-1" style={{ color: 'var(--color-heading)', fontFamily: 'var(--font-sans)' }}>
                    {label}
                  </td>
                  {output.debtYears.map((dy) => (
                    <td key={dy.year} className="text-right py-1 px-3">
                      {formatMoney(getValue(dy))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="text-base mb-2">Credit metrics &amp; covenants</h3>
        <div className="overflow-x-auto">
          <table className="text-sm border-collapse w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--color-border-strong)' }}>
                <th className="text-left py-1 font-normal" style={{ color: 'var(--color-text-muted)' }}></th>
                {years.map((y) => (
                  <th key={y} className="text-right py-1 font-normal px-3" style={{ color: 'var(--color-text-muted)' }}>
                    Y{y}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="font-figures">
              <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                <td className="py-1" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-sans)' }}>
                  Net debt / EBITDA
                </td>
                {output.creditMetrics.map((cm) => (
                  <td key={cm.year} className="text-right py-1 px-3">
                    {formatMultiple(cm.netDebtToEbitda)}
                  </td>
                ))}
              </tr>
              <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                <td className="py-1" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-sans)' }}>
                  Senior debt / EBITDA
                </td>
                {output.creditMetrics.map((cm) => (
                  <td key={cm.year} className="text-right py-1 px-3">
                    {formatMultiple(cm.seniorDebtToEbitda)}
                  </td>
                ))}
              </tr>
              <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                <td className="py-1" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-sans)' }}>
                  Interest coverage
                </td>
                {output.creditMetrics.map((cm) => (
                  <td key={cm.year} className="text-right py-1 px-3">
                    {formatMultiple(cm.interestCoverage)}
                  </td>
                ))}
              </tr>
              <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                <td className="py-1" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-sans)' }}>
                  Debt service coverage
                </td>
                {output.creditMetrics.map((cm) => (
                  <td key={cm.year} className="text-right py-1 px-3">
                    {formatMultiple(cm.debtServiceCoverage)}
                  </td>
                ))}
              </tr>
              <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                <td className="py-1" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-sans)' }}>
                  Free cash flow yield
                </td>
                {output.creditMetrics.map((cm) => (
                  <td key={cm.year} className="text-right py-1 px-3">
                    {formatPercent(cm.freeCashFlowYield, 1)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          {output.creditMetrics.flatMap((cm) =>
            cm.covenantChecks
              .filter((c) => c.breached)
              .map((c) => (
                <p key={`${cm.year}-${c.metric}`} className="text-sm" style={{ color: 'var(--color-warning)' }}>
                  Year {cm.year}: {c.message}
                </p>
              )),
          )}
          {output.creditMetrics.every((cm) => cm.covenantChecks.every((c) => !c.breached)) && (
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              No covenant breaches over the hold period.
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
