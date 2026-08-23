/** Compact, immediate-commit inputs for dense table/form contexts — simpler than the calculator's typed sliders, appropriate for the Full Model tables. */

export function TableNumberInput({
  value,
  onChange,
  step = 0.1,
  min,
  max,
  width = 'w-20',
  disabled,
  ariaLabel,
}: {
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
  max?: number
  width?: string
  disabled?: boolean
  ariaLabel?: string
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      aria-label={ariaLabel}
      value={Number.isFinite(value) ? value : 0}
      step={step}
      min={min}
      max={max}
      disabled={disabled}
      onChange={(e) => {
        const v = e.target.valueAsNumber
        if (Number.isFinite(v)) onChange(v)
      }}
      className={`font-figures text-sm text-right bg-transparent border-b px-1 py-0.5 ${width}`}
      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
    />
  )
}

export function TableTextInput({
  value,
  onChange,
  width = 'w-32',
  ariaLabel,
}: {
  value: string
  onChange: (v: string) => void
  width?: string
  ariaLabel?: string
}) {
  return (
    <input
      type="text"
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`text-sm bg-transparent border-b px-1 py-0.5 ${width}`}
      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
    />
  )
}

export function TableSelect<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  ariaLabel?: string
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="text-sm bg-transparent border-b px-1 py-0.5"
      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} style={{ color: '#000' }}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function TableCheckbox({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  ariaLabel?: string
}) {
  return (
    <input
      type="checkbox"
      aria-label={ariaLabel}
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="accent-[var(--color-brass)] w-4 h-4"
    />
  )
}
