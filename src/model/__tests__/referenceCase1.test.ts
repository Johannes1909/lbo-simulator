import { describe, expect, it } from 'vitest'
import { runModel } from '../engine'
import type { DealInputs } from '../types'

/**
 * Hand-calculated reference case, provided and independently verified by
 * the sponsor in Excel (2026-08-15). Deliberately minimal: no target net
 * debt, no transaction costs, a single bullet tranche with a 100% cash
 * sweep, interest on the PRIOR YEAR-END balance (not average — this is the
 * one case where that non-default switch is exercised, precisely because it
 * removes the circularity and makes the case hand-checkable). If any figure
 * here is ever off by more than rounding, the bug is in the code, not this
 * fixture.
 */
const referenceCase1Inputs: DealInputs = {
  transaction: {
    valuationBasis: 'ebitda',
    entryMultiple: 9.0,
    ltmMetric: 40.0,
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
        amount: { mode: 'absolute', value: 198.0 },
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
    exitMultiple: 9.0,
    exitMultipleEqualsEntry: false,
    exitCostsPct: 0,
  },
  equity: {},
}

describe('reference case 1', () => {
  const result = runModel(referenceCase1Inputs)

  it('balances Sources & Uses exactly', () => {
    expect(result.sourcesUses.usesTotal).toBeCloseTo(360.0, 2)
    expect(result.sourcesUses.sourcesTotal).toBeCloseTo(360.0, 2)
    expect(result.sourcesUses.sourcesTrancheTotal).toBeCloseTo(198.0, 2)
    expect(result.sourcesUses.sourcesSponsorEquity).toBeCloseTo(162.0, 2)
    expect(result.sourcesUses.imbalance).toBeCloseTo(0, 2)
  })

  const expectedYears = [
    { revenue: 212.0, ebitda: 42.4, ebit: 37.31, interest: 13.86, ebt: 23.45, taxes: 4.69, netIncome: 18.76, fcf: 18.4, debtClosing: 179.6, ndToEbitda: 4.24, coverage: 3.06 },
    { revenue: 224.72, ebitda: 44.94, ebit: 39.55, interest: 12.57, ebt: 26.98, taxes: 5.4, netIncome: 21.58, fcf: 21.2, debtClosing: 158.4, ndToEbitda: 3.52, coverage: 3.57 },
    { revenue: 238.2, ebitda: 47.64, ebit: 41.92, interest: 11.09, ebt: 30.84, taxes: 6.17, netIncome: 24.67, fcf: 24.26, debtClosing: 134.13, ndToEbitda: 2.82, coverage: 4.3 },
    { revenue: 252.5, ebitda: 50.5, ebit: 44.44, interest: 9.39, ebt: 35.05, taxes: 7.01, netIncome: 28.04, fcf: 27.61, debtClosing: 106.52, ndToEbitda: 2.11, coverage: 5.38 },
    { revenue: 267.65, ebitda: 53.53, ebit: 47.11, interest: 7.46, ebt: 39.65, taxes: 7.93, netIncome: 31.72, fcf: 31.26, debtClosing: 75.26, ndToEbitda: 1.41, coverage: 7.18 },
  ]

  expectedYears.forEach((expected, i) => {
    it(`year ${i + 1} matches the hand-calculated figures`, () => {
      const op = result.operatingYears[i]!
      const debt = result.debtYears[i]!
      const income = result.incomeYears[i]!
      const credit = result.creditMetrics[i]!

      expect(op.revenue).toBeCloseTo(expected.revenue, 1)
      expect(op.ebitda).toBeCloseTo(expected.ebitda, 1)
      expect(op.ebit).toBeCloseTo(expected.ebit, 1)
      expect(income.interestExpense).toBeCloseTo(expected.interest, 1)
      expect(income.ebt).toBeCloseTo(expected.ebt, 1)
      expect(income.taxes).toBeCloseTo(expected.taxes, 1)
      expect(income.netIncome).toBeCloseTo(expected.netIncome, 1)
      expect(debt.totalDebtClosing).toBeCloseTo(expected.debtClosing, 1)
      expect(debt.cashClosing).toBeCloseTo(0, 2)
      expect(credit.netDebtToEbitda).toBeCloseTo(expected.ndToEbitda, 1)
      expect(credit.interestCoverage).toBeCloseTo(expected.coverage, 1)

      const impliedFcf = debt.totalDebtOpening - debt.totalDebtClosing
      expect(impliedFcf).toBeCloseTo(expected.fcf, 1)
    })
  })

  it('produces the expected exit figures', () => {
    expect(result.returns.exitEnterpriseValue).toBeCloseTo(481.76, 1)
    expect(result.returns.exitNetDebt).toBeCloseTo(75.26, 1)
    expect(result.returns.exitEquityValue).toBeCloseTo(406.5, 1)
    expect(result.returns.moneyMultiple).toBeCloseTo(2.509, 2)
    expect(result.returns.irr).not.toBeNull()
    expect(result.returns.irr! * 100).toBeCloseTo(20.2, 1)
  })

  it('reconciles the value bridge to the exact equity difference', () => {
    const bridge = result.valueBridge
    expect(bridge.ebitdaGrowthEffect).toBeCloseTo(121.76, 1)
    expect(bridge.multipleEffect).toBeCloseTo(0, 2)
    expect(bridge.deleveragingEffect).toBeCloseTo(122.74, 1)
    expect(bridge.reconciledTotal).toBeCloseTo(bridge.exitEquity, 6)
    expect(bridge.exitEquity - bridge.entryEquity).toBeCloseTo(244.5, 1)
  })

  it('reports no warnings for this clean case', () => {
    expect(result.warnings).toEqual([])
  })
})
