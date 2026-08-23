import type { DebtTranche } from '../../model/types'

export function buildBlankTranche(id: string): DebtTranche {
  return {
    id,
    name: 'New tranche',
    seniorityRank: 1,
    trancheType: 'termLoan',
    amount: { mode: 'multipleOfEbitda', value: 1.0 },
    fixedRatePct: 7.0,
    rate: { kind: 'fixed', ratePct: 7.0 },
    cashPayPct: 100,
    scheduledAmortizationPctOfOriginal: 0,
    cashSweepParticipationPct: 100,
    maturityYears: 7,
  }
}
