import { en } from '../i18n/en'
import { formatMoney, formatMultiple, formatNumber } from './format'

interface TombstoneProps {
  entryMultiple: number
  enterpriseValue: number
  equityInvested: number
  holdPeriodYears: number
  exitMultiple: number
}

/** The brass-framed deal plaque. The one place a gradient is allowed. */
export function Tombstone({
  entryMultiple,
  enterpriseValue,
  equityInvested,
  holdPeriodYears,
  exitMultiple,
}: TombstoneProps) {
  const t = en.tombstone

  const fields: { label: string; value: string }[] = [
    { label: t.entryMultiple, value: formatMultiple(entryMultiple) },
    { label: t.enterpriseValue, value: formatMoney(enterpriseValue) },
    { label: t.equityInvested, value: formatMoney(equityInvested) },
    { label: t.holdPeriod, value: `${formatNumber(holdPeriodYears, 0)} ${t.years}` },
    { label: t.exitMultiple, value: formatMultiple(exitMultiple) },
  ]

  return (
    <div
      className="border p-6"
      style={{
        borderColor: 'var(--color-brass)',
        background:
          'linear-gradient(155deg, var(--color-bg-panel-raised) 0%, var(--color-bg-panel) 100%)',
      }}
    >
      <div
        className="pb-4 mb-4 text-center border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <h2 className="text-xl tracking-wide" style={{ color: 'var(--color-brass)' }}>
          {t.heading}
        </h2>
      </div>
      <dl className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {fields.map((f) => (
          <div key={f.label} className="text-center">
            <dt className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>
              {f.label}
            </dt>
            <dd className="font-figures text-lg" style={{ color: 'var(--color-heading)' }}>
              {f.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
