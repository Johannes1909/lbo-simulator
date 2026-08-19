import type { DealInputs } from './types'

/**
 * The app opens on the sponsor's hand-calculated reference case (verified
 * 2026-08-15: Sources = Uses at 360.0, IRR 20.20%, money multiple 2.509x).
 * Using a real, independently-checked case as the default — rather than an
 * invented "plausible" one — means the acceptance check is just: open the
 * app, read the numbers off the result bar.
 */
export function buildDefaultDealInputs(): DealInputs {
  return {
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
          // 4.95 × 40.0 LTM EBITDA = 198.0, matching the reference case's absolute amount exactly.
          amount: { mode: 'multipleOfEbitda', value: 4.95 },
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
}
