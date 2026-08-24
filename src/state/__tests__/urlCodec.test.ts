import { describe, expect, it } from 'vitest'
import { decodeDealState, encodeDealState } from '../urlCodec'
import type { DealInputs } from '../../model/types'

const sample: DealInputs = {
  transaction: {
    valuationBasis: 'ebitda',
    entryMultiple: 9.0,
    targetNetDebt: 12.5,
    transactionCostsPct: 1.5,
    minCashBalance: 5,
    holdPeriodYears: 5,
  },
  financing: {
    tranches: [
      {
        id: 'term-loan',
        name: 'Term Loan',
        seniorityRank: 1,
        amount: { mode: 'multipleOfEbitda', value: 4.5 },
        fixedRatePct: 7.0,
        scheduledAmortizationPctOfOriginal: 5,
        cashSweepParticipationPct: 100,
      },
    ],
    interestBasis: 'average',
    convergenceTolerance: 0.001,
    maxIterationsPerYear: 50,
  },
  operating: {
    revenueYear0: 200.0,
    revenueGrowthPct: 6.0,
    ebitdaMarginPct: 20.0,
    daPctOfRevenue: 2.4,
    maintenanceCapexPctOfRevenue: 2.0,
    growthCapexPctOfRevenue: 0.4,
    workingCapitalPctOfRevenueGrowth: 3.0,
    taxRatePct: 20.0,
    oneOffCostsByYear: [0, 2.5, 0, 0, 0],
  },
  exit: {
    exitYear: 5,
    exitMultiple: 9.0,
    exitMultipleEqualsEntry: false,
    exitCostsPct: 1.0,
  },
  equity: {
    fixedSponsorEquity: 162,
  },
}

describe('URL state codec', () => {
  it('round-trips a full deal state exactly', () => {
    const encoded = encodeDealState(sample)
    const decoded = decodeDealState(encoded)
    expect(decoded).toEqual(sample)
  })

  it('produces a URL-safe string with no characters requiring escaping', () => {
    const encoded = encodeDealState(sample)
    expect(encoded).toMatch(/^[A-Za-z0-9\-$+/=]*$/)
  })

  it('returns null for garbage input instead of throwing', () => {
    expect(decodeDealState('not-a-valid-encoded-state')).toBeNull()
  })
})
