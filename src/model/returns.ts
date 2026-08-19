import type { EquityCashFlow } from './types'

const IRR_LOWER_BOUND = -0.99
const IRR_UPPER_BOUND = 10 // +1000%
const IRR_TOLERANCE = 1e-7
const IRR_MAX_ITERATIONS = 200

function npv(rate: number, cashFlows: EquityCashFlow[]): number {
  return cashFlows.reduce((sum, cf) => sum + cf.amount / Math.pow(1 + rate, cf.year), 0)
}

/**
 * IRR by bisection, not the closed-form two-cash-flow formula — that
 * formula is wrong the moment interim distributions exist. Requires a sign
 * change between the bounds; returns null (no unique IRR) if there isn't one,
 * e.g. all cash flows are the same sign.
 */
export function computeIRR(cashFlows: EquityCashFlow[]): number | null {
  let lo = IRR_LOWER_BOUND
  let hi = IRR_UPPER_BOUND
  let fLo = npv(lo, cashFlows)
  const fHi = npv(hi, cashFlows)

  if (fLo === 0) return lo
  if (fHi === 0) return hi
  if (fLo * fHi > 0) return null

  for (let i = 0; i < IRR_MAX_ITERATIONS; i++) {
    const mid = (lo + hi) / 2
    const fMid = npv(mid, cashFlows)

    if (Math.abs(fMid) < 1e-9 || (hi - lo) / 2 < IRR_TOLERANCE) {
      return mid
    }

    if (fLo * fMid < 0) {
      hi = mid
    } else {
      lo = mid
      fLo = fMid
    }
  }

  return (lo + hi) / 2
}

export function computeMoneyMultiple(
  cashFlows: EquityCashFlow[],
): number | null {
  const invested = cashFlows.filter((cf) => cf.amount < 0).reduce((sum, cf) => sum - cf.amount, 0)
  const returned = cashFlows.filter((cf) => cf.amount > 0).reduce((sum, cf) => sum + cf.amount, 0)
  if (invested <= 0) return null
  return returned / invested
}
