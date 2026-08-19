import { describe, expect, it } from 'vitest'
import { computeIRR, computeMoneyMultiple } from '../returns'
import type { EquityCashFlow } from '../types'

describe('computeIRR', () => {
  it('solves a simple single-period case exactly', () => {
    // -100 now, +120 in one year => 20% IRR
    const cf: EquityCashFlow[] = [
      { year: 0, amount: -100, label: 'in' },
      { year: 1, amount: 120, label: 'out' },
    ]
    expect(computeIRR(cf)! * 100).toBeCloseTo(20, 4)
  })

  it('matches a known multi-period annuity-style series', () => {
    // -1000 now, +250 for 5 years => IRR ≈ 7.9305% (verified against a closed-form annuity solve)
    const cf: EquityCashFlow[] = [
      { year: 0, amount: -1000, label: 'in' },
      { year: 1, amount: 250, label: 'd1' },
      { year: 2, amount: 250, label: 'd2' },
      { year: 3, amount: 250, label: 'd3' },
      { year: 4, amount: 250, label: 'd4' },
      { year: 5, amount: 250, label: 'd5' },
    ]
    const irr = computeIRR(cf)!
    // NPV at the solved rate must be ~0 — this is the real invariant, not a memorized digit.
    const npv = cf.reduce((sum, c) => sum + c.amount / Math.pow(1 + irr, c.year), 0)
    expect(npv).toBeCloseTo(0, 3)
    expect(irr).toBeGreaterThan(0.07)
    expect(irr).toBeLessThan(0.09)
  })

  it('handles multiple sign changes (interim distribution then further draw)', () => {
    const cf: EquityCashFlow[] = [
      { year: 0, amount: -100, label: 'in' },
      { year: 1, amount: 50, label: 'dist' },
      { year: 2, amount: -20, label: 'follow-on' },
      { year: 3, amount: 100, label: 'exit' },
    ]
    const irr = computeIRR(cf)
    expect(irr).not.toBeNull()
    const npv = cf.reduce((sum, c) => sum + c.amount / Math.pow(1 + irr!, c.year), 0)
    expect(npv).toBeCloseTo(0, 3)
  })

  it('returns null when there is no sign change (all cash flows negative)', () => {
    const cf: EquityCashFlow[] = [
      { year: 0, amount: -100, label: 'in' },
      { year: 1, amount: -10, label: 'more in' },
    ]
    expect(computeIRR(cf)).toBeNull()
  })

  it('returns null when there is no sign change (all cash flows positive)', () => {
    const cf: EquityCashFlow[] = [
      { year: 0, amount: 100, label: 'in' },
      { year: 1, amount: 10, label: 'more in' },
    ]
    expect(computeIRR(cf)).toBeNull()
  })

  it('handles a near-total-loss case within the -99% to +1000% bounds', () => {
    const cf: EquityCashFlow[] = [
      { year: 0, amount: -100, label: 'in' },
      { year: 5, amount: 1, label: 'scraps' },
    ]
    const irr = computeIRR(cf)!
    expect(irr).toBeLessThan(-0.4)
    expect(irr).toBeGreaterThan(-0.99)
  })
})

describe('computeMoneyMultiple', () => {
  it('divides total returned by total invested', () => {
    const cf: EquityCashFlow[] = [
      { year: 0, amount: -162, label: 'in' },
      { year: 5, amount: 406.5, label: 'out' },
    ]
    expect(computeMoneyMultiple(cf)).toBeCloseTo(2.509, 3)
  })

  it('returns null when nothing was invested', () => {
    expect(computeMoneyMultiple([{ year: 0, amount: 0, label: 'x' }])).toBeNull()
  })
})
