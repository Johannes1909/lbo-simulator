import { describe, expect, it } from 'vitest'
import { computeSourcesUses, debtSizingEbitda, enterpriseValue, entryEbitda } from '../sourcesUses'
import type { DealInputs } from '../types'

/**
 * Reproduces the exact input values that were live in the Milestone 1 app
 * defaults when the sponsor found the discrepancy (2026-08-15): entry
 * multiple 8.5x, a tranche sized at 4.5x EBITDA, 2% transaction costs, 3.0
 * minimum cash — with revenueYear0=100 and ebitdaMarginPct=22%. At the
 * time, the deal was priced and sized off a separate `transaction.ltmMetric`
 * field (then 25.0) instead of off this operating-model EBITDA (22.0); see
 * the test below for how that was fixed.
 */
const buggyDefaultsSnapshot: DealInputs = {
  transaction: {
    valuationBasis: 'ebitda',
    entryMultiple: 8.5,
    targetNetDebt: 0,
    transactionCostsPct: 2.0,
    minCashBalance: 3.0,
    holdPeriodYears: 5,
  },
  financing: {
    tranches: [
      {
        id: 'senior-term-loan',
        name: 'Senior Term Loan',
        seniorityRank: 1,
        amount: { mode: 'multipleOfEbitda', value: 4.5 },
        fixedRatePct: 6.5,
        scheduledAmortizationPctOfOriginal: 5,
        cashSweepParticipationPct: 75,
      },
    ],
    interestBasis: 'average',
    convergenceTolerance: 0.001,
    maxIterationsPerYear: 50,
  },
  operating: {
    revenueYear0: 100.0,
    revenueGrowthPct: 5.0,
    ebitdaMarginPct: 22.0,
    daPctOfRevenue: 3.0,
    maintenanceCapexPctOfRevenue: 3.0,
    growthCapexPctOfRevenue: 1.0,
    workingCapitalPctOfRevenueGrowth: 2.0,
    taxRatePct: 25.0,
    oneOffCostsByYear: [],
  },
  exit: {
    exitYear: 5,
    exitMultiple: 8.5,
    exitMultipleEqualsEntry: true,
    exitCostsPct: 1.5,
  },
  equity: {},
}

describe('Sources & Uses invariants', () => {
  it('Sources total equals Uses total (always true by construction of the equity plug)', () => {
    const result = computeSourcesUses(buggyDefaultsSnapshot)
    expect(result.sourcesTotal).toBeCloseTo(result.usesTotal, 2)
  })

  it('enterpriseValue() and debtSizingEbitda() always resolve to the same EBITDA figure as entryEbitda()', () => {
    // History (2026-08-15): LTM EBITDA used to live in its own field,
    // transaction.ltmMetric, separate from the operating plan's
    // revenueYear0 × ebitdaMarginPct. The two could silently disagree — on
    // this exact fixture, debt was sized off ltmMetric (25.0) while the
    // operating model, and every year built from it, ran off 22.0 (100 ×
    // 22%). An 11.5% overstatement of debt capacity relative to the
    // EBITDA the rest of the model actually used.
    //
    // Fixed not by syncing the two fields but by removing the second one:
    // `ltmMetric` no longer exists on TransactionInputs, so a DealInputs
    // value cannot express two different entry-EBITDA figures at once.
    // entryEbitda() is the sole source; this test fails the moment any
    // function in this file is changed to read a second, independent
    // EBITDA basis again.
    const ebitda = entryEbitda(buggyDefaultsSnapshot)
    expect(debtSizingEbitda(buggyDefaultsSnapshot)).toBe(ebitda)
    expect(enterpriseValue(buggyDefaultsSnapshot)).toBe(ebitda * buggyDefaultsSnapshot.transaction.entryMultiple)

    const result = computeSourcesUses(buggyDefaultsSnapshot)
    const trancheMultiple = 4.5
    expect(result.sourcesTrancheTotal).toBeCloseTo(trancheMultiple * ebitda, 2)
  })

  it('equity invested = EV + transaction costs + min cash funded − debt raised', () => {
    const result = computeSourcesUses(buggyDefaultsSnapshot)
    const ev = enterpriseValue(buggyDefaultsSnapshot)
    const costs =
      ev * (buggyDefaultsSnapshot.transaction.transactionCostsPct / 100) +
      buggyDefaultsSnapshot.transaction.minCashBalance
    const expectedEquity = ev + costs - result.sourcesTrancheTotal
    expect(result.sourcesSponsorEquity).toBeCloseTo(expectedEquity, 2)
  })
})
