import { useEffect, useRef, useState } from 'react'

interface AnimatedNumberProps {
  value: number
  format: (value: number) => string
  className?: string
}

/**
 * Interpolates the displayed value over 200ms when it changes, so a slider
 * drag reads as change rather than a jump. Skips the animation entirely
 * under prefers-reduced-motion, and for non-finite values (NaN/Infinity —
 * e.g. an undefined IRR) where interpolation makes no sense.
 */
export function AnimatedNumber({ value, format, className }: AnimatedNumberProps) {
  const [display, setDisplay] = useState(value)
  const fromRef = useRef(value)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion || !Number.isFinite(value) || !Number.isFinite(fromRef.current)) {
      setDisplay(value)
      fromRef.current = value
      return
    }

    const from = fromRef.current
    const to = value
    const durationMs = 200
    const start = performance.now()

    function tick(now: number) {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - t, 2)
      setDisplay(from + (to - from) * eased)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        fromRef.current = to
      }
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [value])

  return <span className={className}>{format(display)}</span>
}
