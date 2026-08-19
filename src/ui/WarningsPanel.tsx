import { en } from '../i18n/en'

interface WarningsPanelProps {
  warnings: string[]
}

/** Warnings are plain sentences, not a red dot — the point is to say what happened and why it matters. */
export function WarningsPanel({ warnings }: WarningsPanelProps) {
  if (warnings.length === 0) return null

  return (
    <div
      className="border-l-2 pl-4 py-2"
      style={{ borderColor: 'var(--color-warning)', background: 'var(--color-warning-bg)' }}
      role="alert"
    >
      <h3 className="text-sm mb-2" style={{ color: 'var(--color-warning)' }}>
        {en.warnings.heading}
      </h3>
      <ul className="flex flex-col gap-1 text-sm">
        {warnings.map((w) => (
          <li key={w} style={{ color: 'var(--color-text)' }}>
            {w}
          </li>
        ))}
      </ul>
    </div>
  )
}
