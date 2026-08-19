/**
 * Banking-style number formatting: thousands separators, parentheses for
 * negative values (not a minus sign), tabular monospace figures.
 * US/international format (1,234.56) — chosen because the UI targets an
 * international audience of bankers and recruiters, per sponsor decision.
 */
const numberFormatter = (decimals: number) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

function wrapNegative(value: number, formatted: string): string {
  return value < 0 ? `(${formatted})` : formatted
}

export function formatNumber(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return '—'
  return wrapNegative(value, numberFormatter(decimals).format(Math.abs(value)))
}

/** Currency-style figure (no symbol — the unit lives in the panel/column header). */
export function formatMoney(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return '—'
  return wrapNegative(value, numberFormatter(decimals).format(Math.abs(value)))
}

export function formatPercent(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return '—'
  return wrapNegative(value, `${numberFormatter(decimals).format(Math.abs(value))}%`)
}

export function formatMultiple(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return '—'
  return wrapNegative(value, `${numberFormatter(decimals).format(Math.abs(value))}×`)
}
