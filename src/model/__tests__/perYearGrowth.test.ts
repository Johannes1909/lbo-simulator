import { describe, expect, it } from 'vitest'
import { computeOperatingPlan } from '../operating'
import { buildReferenceCaseInputs } from '../presets'
import type { DealInputs } from '../types'

function withGrowth(overrides: Partial<DealInputs['operating']>): DealInputs {
  const base = buildReferenceCaseInputs()
  return { ...base, operating: { ...base.operating, ...overrides } }
}

describe('per-year revenue growth', () => {
  it('flat mode (unset, the Milestone 1/2 default) behaves exactly as before', () => {
    const years = computeOperatingPlan(buildReferenceCaseInputs())
    // Reference Case 1: 200 growing at 6% flat.
    expect(years[0]!.revenue).toBeCloseTo(212.0, 6)
    expect(years[4]!.revenue).toBeCloseTo(200 * Math.pow(1.06, 5), 6)
  })

  it('applies the per-year rate for each listed year and falls back to the flat rate for the rest', () => {
    const inputs = withGrowth({
      revenueGrowthMode: 'perYear',
      revenueGrowthByYear: [6, -20, -20, -20], // year 5 not listed — falls back to revenueGrowthPct (6%)
      revenueGrowthPct: 6,
    })
    const years = computeOperatingPlan(inputs)
    let expected = 200
    const rates = [6, -20, -20, -20, 6]
    const revenues = rates.map((r) => (expected = expected * (1 + r / 100)))
    years.forEach((y, i) => expect(y.revenue).toBeCloseTo(revenues[i]!, 6))
  })

  it('a downturn year produces a real EBITDA decline, not just slower growth', () => {
    const inputs = withGrowth({
      revenueGrowthMode: 'perYear',
      revenueGrowthByYear: [6, -20, -20, -20, 0],
    })
    const years = computeOperatingPlan(inputs)
    expect(years[1]!.ebitda).toBeLessThan(years[0]!.ebitda)
    expect(years[2]!.ebitda).toBeLessThan(years[1]!.ebitda)
  })

  it('switching modes does not lose either the flat value or the per-year table', () => {
    // Simulates the UI round-trip: flat -> perYear -> flat should still have the original flat value,
    // and the per-year array, once set, survives being temporarily not in use.
    const base = buildReferenceCaseInputs()
    const perYear: DealInputs = {
      ...base,
      operating: {
        ...base.operating,
        revenueGrowthMode: 'perYear',
        revenueGrowthByYear: [10, 10, 10, 10, 10],
      },
    }
    const backToFlat: DealInputs = { ...perYear, operating: { ...perYear.operating, revenueGrowthMode: 'flat' } }
    // The flat rate (6%) is untouched by having been in perYear mode.
    expect(backToFlat.operating.revenueGrowthPct).toBe(6)
    // And the per-year table is still there, just not in effect.
    expect(backToFlat.operating.revenueGrowthByYear).toEqual([10, 10, 10, 10, 10])
    expect(computeOperatingPlan(backToFlat)[0]!.revenue).toBeCloseTo(212.0, 6)
  })
})
