import { useState } from 'react'
import { CapitalStructureTab } from './CapitalStructureTab'
import { DebtScheduleTab } from './DebtScheduleTab'
import { OperatingTab } from './OperatingTab'

type FullModelTab = 'capitalStructure' | 'debtSchedule' | 'operating'

const TABS: { id: FullModelTab; label: string }[] = [
  { id: 'capitalStructure', label: 'Capital structure' },
  { id: 'debtSchedule', label: 'Debt schedule' },
  { id: 'operating', label: 'Operating' },
]

export function FullModelView() {
  const [tab, setTab] = useState<FullModelTab>('capitalStructure')

  return (
    <div className="px-6 pb-12">
      <div className="flex gap-6 border-b mb-8" style={{ borderColor: 'var(--color-border)' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id ? 'page' : undefined}
            className="text-sm pb-3 cursor-pointer border-b-2"
            style={{
              color: tab === t.id ? 'var(--color-brass)' : 'var(--color-text-muted)',
              borderColor: tab === t.id ? 'var(--color-brass)' : 'transparent',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'capitalStructure' && <CapitalStructureTab />}
      {tab === 'debtSchedule' && <DebtScheduleTab />}
      {tab === 'operating' && <OperatingTab />}
    </div>
  )
}
