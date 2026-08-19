import { describe, expect, it } from 'vitest'
import { runModel } from '../engine'
import type { DealInputs } from '../types'

function baseInputs(overrides: Partial<DealInputs> = {}): DealInputs {
  return {
    transaction: {
      valuationBasis: 'ebitda',
      entryMultiple: 8.0,
      ltmMetric: 50.0,
      targetNetDebt: 0,
      transactionCostsPct: 0,
      minCashBalance: 0,
      holdPeriodYears: 5,
    },
    financing: {
      tranches: [
        {
          id: 'term-loan',
          name: 'Term Loan',
          seniorityRank: 1,
          amount: { mode: 'absolute', value: 220.0 },
          fixedRatePct: 7.0,
          scheduledAmortizationPctOfOriginal: 0,
          cashSweepParticipationPct: 100,
        },
      ],
      interestBasis: 'priorYearEnd',
      convergenceTolerance: 0.001,
      maxIterationsPerYear: 50,
    },
    operating: {
      revenueYear0: 200.0,
      revenueGrowthPct: 6.0,
      ebitdaMarginPct: 20.0,
      daPctOfRevenue: 2.4,
      maintenanceCapexPctOfRevenue: 2.4,
      growthCapexPctOfRevenue: 0,
      workingCapitalPctOfRevenueGrowth: 3.0,
      taxRatePct: 20.0,
      oneOffCostsByYear: [],
    },
    exit: {
      exitYear: 5,
      exitMultiple: 8.0,
      exitMultipleEqualsEntry: false,
      exitCostsPct: 0,
    },
    equity: {},
    ...overrides,
  }
}

describe('boundary and edge cases', () => {
  it('handles zero leverage (100% equity): debt stays at 0, all cash accumulates', () => {
    const inputs = baseInputs({
      financing: {
        tranches: [],
        interestBasis: 'priorYearEnd',
        convergenceTolerance: 0.001,
        maxIterationsPerYear: 50,
      },
    })
    const result = runModel(inputs)

    for (const dy of result.debtYears) {
      expect(dy.totalDebtClosing).toBe(0)
      expect(dy.netDebtClosing).toBeLessThan(0) // net cash position, growing
    }
    expect(result.sourcesUses.sourcesSponsorEquity).toBeCloseTo(result.sourcesUses.usesTotal, 2)
    expect(result.returns.irr).not.toBeNull()
    expect(result.returns.moneyMultiple).not.toBeNull()
  })

  it('handles 100% debt financing: zero sponsor equity, IRR/MoM undefined, debt never negative', () => {
    const inputs = baseInputs({
      transaction: {
        valuationBasis: 'ebitda',
        entryMultiple: 8.0,
        ltmMetric: 50.0,
        targetNetDebt: 0,
        transactionCostsPct: 0,
        minCashBalance: 0,
        holdPeriodYears: 5,
      },
      financing: {
        tranches: [
          {
            id: 'term-loan',
            name: 'Term Loan',
            seniorityRank: 1,
            amount: { mode: 'absolute', value: 400.0 }, // = full EV (8 * 50), so equity plug is 0
            fixedRatePct: 7.0,
            scheduledAmortizationPctOfOriginal: 0,
            cashSweepParticipationPct: 100,
          },
        ],
        interestBasis: 'priorYearEnd',
        convergenceTolerance: 0.001,
        maxIterationsPerYear: 50,
      },
    })
    const result = runModel(inputs)

    expect(result.sourcesUses.sourcesSponsorEquity).toBeCloseTo(0, 2)
    expect(result.returns.irr).toBeNull()
    expect(result.returns.moneyMultiple).toBeNull()
    expect(result.warnings.some((w) => w.includes('zero or negative'))).toBe(true)
    for (const dy of result.debtYears) {
      for (const t of dy.tranches) {
        expect(t.closingBalance).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('handles negative revenue growth without producing NaN or throwing', () => {
    const inputs = baseInputs({
      operating: {
        revenueYear0: 200.0,
        revenueGrowthPct: -5.0,
        ebitdaMarginPct: 20.0,
        daPctOfRevenue: 2.4,
        maintenanceCapexPctOfRevenue: 2.4,
        growthCapexPctOfRevenue: 0,
        workingCapitalPctOfRevenueGrowth: 3.0,
        taxRatePct: 20.0,
        oneOffCostsByYear: [],
      },
    })
    const result = runModel(inputs)

    let priorRevenue = inputs.operating.revenueYear0
    for (const op of result.operatingYears) {
      expect(op.revenue).toBeLessThan(priorRevenue)
      expect(Number.isFinite(op.ebitda)).toBe(true)
      expect(op.workingCapitalChange).toBe(0) // declining revenue never releases cash in this mode
      priorRevenue = op.revenue
    }
    expect(Number.isFinite(result.returns.exitEquityValue)).toBe(true)
  })

  it('handles a 1-year hold period', () => {
    const inputs = baseInputs({
      transaction: { ...baseInputs().transaction, holdPeriodYears: 1 },
      exit: { exitYear: 1, exitMultiple: 8.0, exitMultipleEqualsEntry: false, exitCostsPct: 0 },
    })
    const result = runModel(inputs)

    expect(result.operatingYears).toHaveLength(1)
    expect(result.debtYears).toHaveLength(1)
    expect(result.returns.irr).not.toBeNull()
  })

  it('never lets a tranche balance go negative under an aggressive sweep', () => {
    const inputs = baseInputs({
      financing: {
        tranches: [
          {
            id: 'term-loan',
            name: 'Term Loan',
            seniorityRank: 1,
            amount: { mode: 'absolute', value: 40.0 }, // small balance, repaid well before year 5
            fixedRatePct: 7.0,
            scheduledAmortizationPctOfOriginal: 0,
            cashSweepParticipationPct: 100,
          },
        ],
        interestBasis: 'priorYearEnd',
        convergenceTolerance: 0.001,
        maxIterationsPerYear: 50,
      },
    })
    const result = runModel(inputs)

    for (const dy of result.debtYears) {
      for (const t of dy.tranches) {
        expect(t.closingBalance).toBeGreaterThanOrEqual(0)
      }
    }
    // once the tranche is fully repaid, surplus cash must accumulate, not vanish
    const lastYear = result.debtYears.at(-1)!
    expect(lastYear.totalDebtClosing).toBe(0)
    expect(lastYear.cashClosing).toBeGreaterThan(0)
  })

  it('keeps cash at or above the minimum balance in a well-capitalized case', () => {
    const inputs = baseInputs({
      transaction: { ...baseInputs().transaction, minCashBalance: 5 },
    })
    const result = runModel(inputs)
    for (const dy of result.debtYears) {
      expect(dy.cashClosing).toBeGreaterThanOrEqual(5 - 1e-6)
    }
  })

  it('balances Sources & Uses to within 0.01 across varied inputs', () => {
    const scenarios = [
      baseInputs(),
      baseInputs({ transaction: { ...baseInputs().transaction, transactionCostsPct: 2.5, targetNetDebt: 30, minCashBalance: 10 } }),
      baseInputs({ transaction: { ...baseInputs().transaction, holdPeriodYears: 3 } }),
    ]
    for (const inputs of scenarios) {
      const result = runModel(inputs)
      expect(Math.abs(result.sourcesUses.imbalance)).toBeLessThanOrEqual(0.01)
    }
  })

  it('reconciles the value bridge exactly for varied inputs, not just the reference case', () => {
    const scenarios = [
      baseInputs(),
      baseInputs({ exit: { exitYear: 5, exitMultiple: 10, exitMultipleEqualsEntry: false, exitCostsPct: 2 } }),
      baseInputs({ operating: { ...baseInputs().operating, revenueGrowthPct: -3 } }),
      baseInputs({ transaction: { ...baseInputs().transaction, holdPeriodYears: 3 }, exit: { exitYear: 3, exitMultiple: 8, exitMultipleEqualsEntry: false, exitCostsPct: 0 } }),
    ]
    for (const inputs of scenarios) {
      const result = runModel(inputs)
      expect(result.valueBridge.reconciledTotal).toBeCloseTo(result.valueBridge.exitEquity, 6)
    }
  })

  it('converges within the iteration cap for the average-balance interest basis in a normal case', () => {
    const inputs = baseInputs({
      financing: { ...baseInputs().financing, interestBasis: 'average' },
    })
    const result = runModel(inputs)
    for (const dy of result.debtYears) {
      expect(dy.convergenceWarning).toBe(false)
    }
    expect(result.warnings.some((w) => w.includes('did not converge'))).toBe(false)
  })

  it('reports a warning instead of a silently wrong number when convergence is artificially starved', () => {
    const inputs = baseInputs({
      financing: {
        ...baseInputs().financing,
        interestBasis: 'average',
        maxIterationsPerYear: 1,
        convergenceTolerance: 1e-12,
      },
    })
    const result = runModel(inputs)
    expect(result.debtYears.some((dy) => dy.convergenceWarning)).toBe(true)
    expect(result.warnings.some((w) => w.includes('did not converge'))).toBe(true)
  })
})
