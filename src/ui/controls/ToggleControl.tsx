import { useId } from 'react'

interface ToggleControlProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

export function ToggleControl({ label, checked, onChange }: ToggleControlProps) {
  const id = useId()
  return (
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-[var(--color-brass)] w-4 h-4"
      />
      <label htmlFor={id} className="text-sm" style={{ color: 'var(--color-text)' }}>
        {label}
      </label>
    </div>
  )
}
