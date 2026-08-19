import type { GlossaryEntry } from '../../content/learn'

interface GlossaryListProps {
  entries: GlossaryEntry[]
}

export function GlossaryList({ entries }: GlossaryListProps) {
  if (entries.length === 0) return null

  return (
    <dl className="flex flex-col gap-3">
      {entries.map((e) => (
        <div key={e.term}>
          <dt className="font-serif text-base" style={{ color: 'var(--color-heading)' }}>
            {e.term}
          </dt>
          <dd className="text-sm" style={{ color: 'var(--color-text)' }}>
            {e.explanation}
          </dd>
        </div>
      ))}
    </dl>
  )
}
