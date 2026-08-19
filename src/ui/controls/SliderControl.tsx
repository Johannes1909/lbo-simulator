import { useEffect, useId, useRef, useState } from 'react'
import { en } from '../../i18n/en'
import type { ParamRange } from './paramRanges'

interface SliderControlProps {
  label: string
  value: number
  range: ParamRange
  onChange: (value: number) => void
  formatValue: (value: number) => string
  disabled?: boolean
}

/** Accepts "," or "." as the decimal separator; anything else non-numeric is rejected (null), not coerced. */
function parseTypedNumber(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.')
  if (normalized === '') return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

const HINT_DURATION_MS = 3000

/**
 * A slider plus its value, editable as text. Typing is unformatted and
 * uncommitted until Enter or blur; Escape discards it. The typed range is
 * deliberately wider than the slider's drag range (see paramRanges.ts) —
 * a typed value beyond the slider's own bounds just pins the thumb at
 * whichever end it's nearest to, while the field keeps showing the real
 * number.
 */
export function SliderControl({
  label,
  value,
  range,
  onChange,
  formatValue,
  disabled,
}: SliderControlProps) {
  const sliderId = useId()
  const fieldId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const cancelRef = useRef(false)
  const hintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const [hint, setHint] = useState<string | null>(null)

  useEffect(() => {
    if (isEditing) inputRef.current?.select()
  }, [isEditing])

  useEffect(() => {
    return () => {
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current)
    }
  }, [])

  function showHint(clamped: number) {
    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current)
    setHint(`${en.controls.adjustedTo} ${formatValue(clamped)}`)
    hintTimeoutRef.current = setTimeout(() => setHint(null), HINT_DURATION_MS)
  }

  function applyClampedChange(nextRaw: number): number {
    const rounded = range.integer ? Math.round(nextRaw) : nextRaw
    let clamped = rounded
    if (rounded < range.typedMin) clamped = range.typedMin
    else if (rounded > range.typedMax) clamped = range.typedMax
    if (clamped !== rounded) showHint(clamped)
    if (clamped !== value) onChange(clamped)
    return clamped
  }

  function commit() {
    const parsed = parseTypedNumber(editText)
    if (parsed === null) {
      // Invalid input: revert silently, no error message.
      setIsEditing(false)
      return
    }
    applyClampedChange(parsed)
    setIsEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.currentTarget.blur()
    } else if (e.key === 'Escape') {
      cancelRef.current = true
      e.currentTarget.blur()
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      const magnitude = e.shiftKey ? range.step * 10 : range.step
      const delta = e.key === 'ArrowUp' ? magnitude : -magnitude
      const next = applyClampedChange(value + delta)
      if (isEditing) setEditText(String(next))
    }
  }

  function handleBlur() {
    if (cancelRef.current) {
      cancelRef.current = false
      setIsEditing(false)
      return
    }
    commit()
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <label htmlFor={sliderId} className="text-sm" style={{ color: 'var(--color-text)' }}>
          {label}
        </label>
        <input
          ref={inputRef}
          id={fieldId}
          type="text"
          inputMode="decimal"
          aria-label={label}
          disabled={disabled}
          value={isEditing ? editText : formatValue(value)}
          onFocus={() => {
            setIsEditing(true)
            setEditText(String(range.integer ? Math.round(value) : value))
          }}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className="font-figures text-sm text-right w-24 bg-transparent border-0 px-0"
          style={{ color: 'var(--color-brass)' }}
        />
      </div>
      <input
        id={sliderId}
        type="range"
        min={range.sliderMin}
        max={range.sliderMax}
        step={range.step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={formatValue(value)}
        className="w-full accent-[var(--color-brass)]"
      />
      <div className="h-4">
        {hint && (
          <p className="text-xs transition-opacity" style={{ color: 'var(--color-text-muted)' }}>
            {hint}
          </p>
        )}
      </div>
    </div>
  )
}
