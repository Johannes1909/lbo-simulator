import { describe, expect, it } from 'vitest'
import { computeSourcesUses, enterpriseValue } from '../sourcesUses'
import type { DealInputs } from '../types'

/**
 * Reproduces the exact input values that were live in the Milestone 1 app
 * defaults when the sponsor found the discrepancy (2026-08-15): entry
 * multiple 8.5x, LTM EBITDA 25.0, a tranche sized at 4.5x EBITDA, 2%
 * transaction costs, 3.0 minimum cash — with revenueYear0=100 and
 * ebitdaMarginPct=22% (so the operating model's own EBITDA, 22.0, silently
 * disagreed with the displayed "LTM EBITDA" of 25.0).
 */
const buggyDefaultsSnapshot: DealInputs = {
  transaction: {
    valuationBasis: 'ebitda',
    entryMultiple: 8.5,
    ltmMetric: 25.0,
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

  it('a tranche sized "× EBITDA" uses the SAME EBITDA figure the transaction displays as LTM EBITDA', () => {
    const result = computeSourcesUses(buggyDefaultsSnapshot)
    const trancheMultiple = 4.5
    const expectedTrancheAmount = trancheMultiple * buggyDefaultsSnapshot.transaction.ltmMetric
    // Pre-fix this used the operating model's own year-0 EBITDA (100 * 22% = 22.0),
    // not the displayed LTM EBITDA of 25.0 — an 11.5% understatement of debt.
    expect(result.sourcesTrancheTotal).toBeCloseTo(expectedTrancheAmount, 2)
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
