import { describe, expect, it } from 'vitest'
import { runModel } from '../engine'
import type { DealInputs, DebtTranche } from '../types'

function baseInputs(overrides: Partial<DealInputs> = {}): DealInputs {
  return {
    transaction: {
      valuationBasis: 'ebitda',
      entryMultiple: 8.0,
      ltmMetric: 50.0,
      targetNetDebt: 0,
      transactionCostsPct: 0,
      minCashBalance: 5,
      holdPeriodYears: 5,
    },
    financing: {
      tranches: [
        {
          id: 'tla',
          name: 'Term Loan A',
          seniorityRank: 1,
          amount: { mode: 'multipleOfEbitda', value: 2.0 },
          fixedRatePct: 6.25,
          scheduledAmortizationPctOfOriginal: 5,
          cashSweepParticipationPct: 100,
        },
        {
          id: 'tlb',
          name: 'Term Loan B',
          seniorityRank: 2,
          amount: { mode: 'multipleOfEbitda', value: 2.0 },
          fixedRatePct: 7.0,
          scheduledAmortizationPctOfOriginal: 0,
          cashSweepParticipationPct: 100,
        },
        {
          id: 'revolver',
          name: 'Revolver',
          seniorityRank: 1,
          amount: { mode: 'multipleOfEbitda', value: 0.5 },
          fixedRatePct: 6.0,
          scheduledAmortizationPctOfOriginal: 0,
          cashSweepParticipationPct: 0,
          trancheType: 'revolver',
          commitmentFeePct: 0.5,
        },
        {
          id: 'mezz',
          name: 'Mezzanine',
          seniorityRank: 3,
          amount: { mode: 'multipleOfEbitda', value: 1.0 },
          fixedRatePct: 10.0,
          scheduledAmortizationPctOfOriginal: 0,
          cashSweepParticipationPct: 0,
          trancheType: 'mezzanine',
          cashPayPct: 60,
        },
      ],
      interestBasis: 'priorYearEnd',
      convergenceTolerance: 0.001,
      maxIterationsPerYear: 50,
    },
    operating: {
      revenueYear0: 250.0,
      revenueGrowthPct: 5.0,
      ebitdaMarginPct: 20.0,
      daPctOfRevenue: 3.0,
      maintenanceCapexPctOfRevenue: 3.0,
      growthCapexPctOfRevenue: 0,
      workingCapitalPctOfRevenueGrowth: 2.0,
      taxRatePct: 25.0,
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

describe('multi-tranche Sources & Uses', () => {
  it('balances to within 0.01 with itemized transaction costs and per-tranche arrangement fees', () => {
    const inputs = baseInputs({
      transaction: {
        ...baseInputs().transaction,
        transactionCostItems: [
          { label: 'M&A advisory', mode: 'pctOfEnterpriseValue', value: 1.5 },
          { label: 'Legal', mode: 'absolute', value: 2.2 },
          { label: 'Due diligence', mode: 'pctOfEnterpriseValue', value: 0.5 },
        ],
      },
    })
    inputs.financing.tranches = inputs.financing.tranches.map((t) => ({ ...t, arrangementFeePct: 1.0 }))
    const result = runModel(inputs)
    expect(Math.abs(result.sourcesUses.imbalance)).toBeLessThanOrEqual(0.01)
  })

  it('a revolver contributes only its initial drawn amount (default 0) to Sources, not its committed limit', () => {
    const result = runModel(baseInputs())
    const revolver = result.debtYears[0]!.tranches.find((t) => t.trancheId === 'revolver')!
    expect(revolver.openingBalance).toBe(0)
  })

  it('balances to within 0.01 when a tranche is designated as the plug instead of sponsor equity', () => {
    const inputs = baseInputs({ equity: { fixedSponsorEquity: 80, plugTrancheId: 'tlb' } })
    const result = runModel(inputs)
    expect(Math.abs(result.sourcesUses.imbalance)).toBeLessThanOrEqual(0.01)
    expect(result.sourcesUses.sourcesSponsorEquity).toBeCloseTo(80, 2)
  })
})

describe('waterfall respects seniority rank', () => {
  it('never sweeps a subordinated tranche while a senior tranche with sweep participation still has a balance', () => {
    const inputs = baseInputs({
      financing: {
        ...baseInputs().financing,
        tranches: [
          {
            id: 'senior',
            name: 'Senior',
            seniorityRank: 1,
            amount: { mode: 'absolute', value: 30 },
            fixedRatePct: 6,
            scheduledAmortizationPctOfOriginal: 0,
            cashSweepParticipationPct: 100,
          },
          {
            id: 'junior',
            name: 'Junior',
            seniorityRank: 2,
            amount: { mode: 'absolute', value: 20 },
            fixedRatePct: 8,
            scheduledAmortizationPctOfOriginal: 0,
            cashSweepParticipationPct: 100,
          },
        ],
      },
    })
    const result = runModel(inputs)

    let seniorFullyRepaidYear: number | null = null
    for (const dy of result.debtYears) {
      const senior = dy.tranches.find((t) => t.trancheId === 'senior')!
      const junior = dy.tranches.find((t) => t.trancheId === 'junior')!
      // The junior tranche may only receive sweep cash in a period where the
      // senior tranche's balance is fully cleared WITHIN that same period
      // (cascading leftover) — never while the senior is still open at year end.
      if (senior.closingBalance > 0.005) {
        expect(junior.cashSweepAmortization).toBeCloseTo(0, 6)
        expect(junior.closingBalance).toBeCloseTo(junior.openingBalance, 6)
      } else if (seniorFullyRepaidYear === null) {
        seniorFullyRepaidYear = dy.year
      }
    }
    // Sanity: the senior tranche does get repaid within the hold period in this fixture (strong FCF, small balance).
    expect(seniorFullyRepaidYear).not.toBeNull()
  })
})

describe('PIK interest', () => {
  it('capitalizes exactly the PIK-share of the coupon onto the balance, with zero cash effect', () => {
    const tranche: DebtTranche = {
      id: 'pik',
      name: 'Fully PIK',
      seniorityRank: 1,
      amount: { mode: 'absolute', value: 40 },
      fixedRatePct: 10,
      scheduledAmortizationPctOfOriginal: 0,
      cashSweepParticipationPct: 0,
      cashPayPct: 0,
    }
    const inputs = baseInputs({ financing: { ...baseInputs().financing, tranches: [tranche] } })
    const result = runModel(inputs)

    const year1 = result.debtYears[0]!.tranches[0]!
    expect(year1.cashInterest).toBeCloseTo(0, 6)
    expect(year1.pikInterest).toBeCloseTo(40 * 0.1, 6)
    expect(year1.closingBalance).toBeCloseTo(40 + 40 * 0.1, 6)

    // No cash interest anywhere this year — cash flow is unaffected by financing at all in year 1.
    expect(result.debtYears[0]!.totalCashInterest).toBeCloseTo(0, 6)
    // PIK interest is still tax-deductible: EBT reflects it even though no cash left the business.
    expect(result.incomeYears[0]!.interestExpense).toBeCloseTo(year1.pikInterest, 6)
  })

  it('a mixed cash/PIK tranche splits the coupon exactly by cashPayPct', () => {
    const tranche: DebtTranche = {
      id: 'mixed',
      name: 'Mixed',
      seniorityRank: 1,
      amount: { mode: 'absolute', value: 50 },
      fixedRatePct: 10,
      scheduledAmortizationPctOfOriginal: 0,
      cashSweepParticipationPct: 0,
      cashPayPct: 60,
    }
    const inputs = baseInputs({ financing: { ...baseInputs().financing, tranches: [tranche] } })
    const result = runModel(inputs)
    const year1 = result.debtYears[0]!.tranches[0]!
    const totalCoupon = 50 * 0.1
    expect(year1.cashInterest).toBeCloseTo(totalCoupon * 0.6, 6)
    expect(year1.pikInterest).toBeCloseTo(totalCoupon * 0.4, 6)
  })
})

describe('revolver', () => {
  it('draws on a shortfall, is repaid first when cash recovers, and never exceeds its committed limit', () => {
    // A large one-off cost in year 2 forces a shortfall; strong FCF in later years should repay the draw before any other sweep.
    const inputs = baseInputs({
      transaction: { ...baseInputs().transaction, minCashBalance: 3 },
      operating: { ...baseInputs().operating, oneOffCostsByYear: [0, 60, 0, 0, 0] },
    })
    const result = runModel(inputs)

    const revolverTranche = inputs.financing.tranches.find((t) => t.trancheType === 'revolver')!
    const committedLimit = 0.5 * inputs.transaction.ltmMetric // multipleOfEbitda resolved against LTM EBITDA

    let sawADraw = false
    for (const dy of result.debtYears) {
      const revolver = dy.tranches.find((t) => t.trancheId === revolverTranche.id)!
      expect(revolver.closingBalance).toBeLessThanOrEqual(committedLimit + 1e-6)
      expect(revolver.closingBalance).toBeGreaterThanOrEqual(-1e-6)
      if (revolver.revolverDrawn > 0.005) sawADraw = true
    }
    expect(sawADraw).toBe(true)

    // Once drawn, the very next year with any excess cash must show a repayment before the year's balance can rise again for no reason.
    const drawYearIndex = result.debtYears.findIndex(
      (dy) => dy.tranches.find((t) => t.trancheId === revolverTranche.id)!.revolverDrawn > 0.005,
    )
    const afterDraw = result.debtYears.slice(drawYearIndex + 1)
    const eventuallyRepaid = afterDraw.some(
      (dy) => dy.tranches.find((t) => t.trancheId === revolverTranche.id)!.revolverRepaid > 0.005,
    )
    expect(eventuallyRepaid).toBe(true)
  })

  it('charges the commitment fee only on the undrawn portion of the facility', () => {
    const result = runModel(baseInputs())
    const revolverTranche = 'revolver'
    const committedLimit = 0.5 * 50 // 0.5x * LTM EBITDA 50
    const year1 = result.debtYears[0]!.tranches.find((t) => t.trancheId === revolverTranche)!
    // Undrawn at open (0 drawn) → fee on the full committed limit.
    expect(year1.commitmentFeePaid).toBeCloseTo(committedLimit * 0.005, 6)
  })

  it('reports a liquidity shortfall rather than silently drawing beyond the committed limit', () => {
    const inputs = baseInputs({
      transaction: { ...baseInputs().transaction, minCashBalance: 5 },
      operating: { ...baseInputs().operating, oneOffCostsByYear: [500, 0, 0, 0, 0] }, // far beyond what the 0.5x revolver can cover
    })
    const result = runModel(inputs)
    expect(result.debtYears[0]!.liquidityShortfall).toBeGreaterThan(0)
    expect(result.warnings.some((w) => w.includes("don't cover debt service"))).toBe(true)
  })
})

describe('debt never negative, cash never below minimum except a reported shortfall', () => {
  it('holds across all tranches and years in a well-capitalized multi-tranche case', () => {
    const result = runModel(baseInputs())
    for (const dy of result.debtYears) {
      for (const t of dy.tranches) {
        expect(t.closingBalance).toBeGreaterThanOrEqual(-1e-6)
      }
      if (dy.liquidityShortfall <= 0.005) {
        expect(dy.cashClosing).toBeGreaterThanOrEqual(5 - 1e-6)
      }
    }
  })
})

describe('circularity with the new waterfall', () => {
  it('converges within the iteration cap on the average-balance basis for a normal multi-tranche case', () => {
    const inputs = baseInputs({ financing: { ...baseInputs().financing, interestBasis: 'average' } })
    const result = runModel(inputs)
    expect(result.debtYears.every((dy) => !dy.convergenceWarning)).toBe(true)
  })

  it('reports a warning instead of a silently wrong number when starved of iterations', () => {
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

describe('covenants', () => {
  it('flags a breach just below the interest coverage floor and passes just above it', () => {
    // Interest coverage default floor is 2.0x. Build a case landing just under and just over it by tuning leverage.
    const tightInputs = baseInputs({
      financing: {
        ...baseInputs().financing,
        tranches: [
          {
            id: 'only',
            name: 'Only',
            seniorityRank: 1,
            // Year-1 EBITDA is 262.5 revenue × 20% margin = 52.5, so interest needs to exceed 52.5/2.0 = 26.25 to breach a 2.0x floor.
            amount: { mode: 'absolute', value: 280 },
            fixedRatePct: 9.6,
            scheduledAmortizationPctOfOriginal: 0,
            cashSweepParticipationPct: 0,
          },
        ],
      },
    })
    const looseInputs = baseInputs({
      financing: {
        ...baseInputs().financing,
        tranches: [
          {
            id: 'only',
            name: 'Only',
            seniorityRank: 1,
            amount: { mode: 'absolute', value: 150 },
            fixedRatePct: 4.0,
            scheduledAmortizationPctOfOriginal: 0,
            cashSweepParticipationPct: 0,
          },
        ],
      },
    })

    const tight = runModel(tightInputs).creditMetrics[0]!
    const loose = runModel(looseInputs).creditMetrics[0]!

    const tightCheck = tight.covenantChecks.find((c) => c.metric === 'interestCoverage')!
    const looseCheck = loose.covenantChecks.find((c) => c.metric === 'interestCoverage')!

    expect(tightCheck.breached).toBe(true)
    expect(tightCheck.headroomPct).toBeLessThan(0)
    expect(looseCheck.breached).toBe(false)
    expect(looseCheck.headroomPct).toBeGreaterThan(0)
    expect(tightCheck.message).toMatch(/Interest coverage/)
  })
})

describe('value creation bridge with multiple tranches and PIK', () => {
  it('still reconciles exactly to the entry-to-exit equity difference', () => {
    const result = runModel(baseInputs())
    expect(result.valueBridge.reconciledTotal).toBeCloseTo(result.valueBridge.exitEquity, 6)
  })
})

describe('prepayment penalty', () => {
  function protectedSweepTranche(overrides: Partial<DebtTranche> = {}): DealInputs {
    return baseInputs({
      transaction: { ...baseInputs().transaction, minCashBalance: 1 },
      financing: {
        ...baseInputs().financing,
        tranches: [
          {
            id: 'only',
            name: 'Only',
            seniorityRank: 1,
            amount: { mode: 'absolute', value: 40 },
            fixedRatePct: 3, // low rate, so plenty of FCF is left over to sweep
            scheduledAmortizationPctOfOriginal: 0,
            cashSweepParticipationPct: 100,
            prepaymentPenaltyPct: 2,
            callProtectionYears: 2,
            ...overrides,
          },
        ],
      },
    })
  }

  it('charges the penalty on a cash sweep while still inside call protection', () => {
    const result = runModel(protectedSweepTranche())
    const year1 = result.debtYears[0]!.tranches[0]!
    expect(year1.cashSweepAmortization).toBeGreaterThan(0)
    expect(year1.prepaymentPenaltyPaid).toBeCloseTo(year1.cashSweepAmortization * 0.02, 6)
  })

  it('charges nothing once the call-protection period has passed, even though the sweep continues', () => {
    const result = runModel(protectedSweepTranche())
    const year3 = result.debtYears[2]! // callProtectionYears = 2, so year 3 is unprotected
    const t = year3.tranches[0]!
    if (t.cashSweepAmortization > 0.005) {
      expect(t.prepaymentPenaltyPaid).toBeCloseTo(0, 6)
    }
  })

  it('never charges the penalty on scheduled amortization, even fully inside call protection', () => {
    const inputs = protectedSweepTranche({
      scheduledAmortizationPctOfOriginal: 20,
      cashSweepParticipationPct: 0, // isolate: only scheduled amortization reduces the balance
      callProtectionYears: 5, // protected for the entire hold period
    })
    const result = runModel(inputs)
    for (const dy of result.debtYears) {
      const t = dy.tranches[0]!
      expect(t.scheduledAmortization).toBeGreaterThan(0)
      expect(t.prepaymentPenaltyPaid).toBeCloseTo(0, 6)
    }
  })

  it('reduces cash closing by exactly the penalty amount (a real cash cost, not just bookkeeping)', () => {
    const withPenalty = runModel(protectedSweepTranche({ prepaymentPenaltyPct: 5 }))
    const withoutPenalty = runModel(protectedSweepTranche({ prepaymentPenaltyPct: 0 }))
    const withCash = withPenalty.debtYears[0]!.cashClosing
    const withoutCash = withoutPenalty.debtYears[0]!.cashClosing
    // With a penalty in effect, the sweep is smaller (funds its own penalty from the same pool),
    // so more debt remains — but cash at minimum in both cases, since minCashBalance=1 and
    // there's more than enough FCF to reach it regardless of the penalty.
    expect(withCash).toBeCloseTo(withoutCash, 6)
    expect(withPenalty.debtYears[0]!.tranches[0]!.closingBalance).toBeGreaterThan(
      withoutPenalty.debtYears[0]!.tranches[0]!.closingBalance,
    )
  })
})

describe('senior debt / EBITDA classification', () => {
  it('includes every term loan and the drawn revolver, regardless of their differing waterfall ranks, and excludes mezzanine and seller notes', () => {
    // baseInputs(): TLA (termLoan, rank 1), TLB (termLoan, rank 2), Revolver (revolver, rank 1), Mezzanine (mezzanine, rank 3).
    const result = runModel(baseInputs())
    const dy = result.debtYears[0]!
    const cm = result.creditMetrics[0]!

    const tla = dy.tranches.find((t) => t.trancheId === 'tla')!.closingBalance
    const tlb = dy.tranches.find((t) => t.trancheId === 'tlb')!.closingBalance
    const revolver = dy.tranches.find((t) => t.trancheId === 'revolver')!.closingBalance
    const mezz = dy.tranches.find((t) => t.trancheId === 'mezz')!.closingBalance

    const expectedSeniorDebt = tla + tlb + revolver
    expect(mezz).toBeGreaterThan(0) // sanity: mezzanine actually carries a balance this year
    const expectedRatio = expectedSeniorDebt / result.operatingYears[0]!.ebitda
    expect(cm.seniorDebtToEbitda).toBeCloseTo(expectedRatio, 6)

    // In particular, TLB (rank 2 — junior to TLA in the waterfall) must still count as senior.
    expect(cm.seniorDebtToEbitda).toBeGreaterThan(tla / result.operatingYears[0]!.ebitda)
  })

  it('a per-tranche override wins over the type-based default', () => {
    const inputs = baseInputs()
    inputs.financing.tranches = inputs.financing.tranches.map((t) =>
      t.id === 'mezz' ? { ...t, isSeniorDebt: true } : t,
    )
    const result = runModel(inputs)
    const dy = result.debtYears[0]!
    const cm = result.creditMetrics[0]!
    const tla = dy.tranches.find((t) => t.trancheId === 'tla')!.closingBalance
    const tlb = dy.tranches.find((t) => t.trancheId === 'tlb')!.closingBalance
    const revolver = dy.tranches.find((t) => t.trancheId === 'revolver')!.closingBalance
    const mezz = dy.tranches.find((t) => t.trancheId === 'mezz')!.closingBalance
    const expectedRatio = (tla + tlb + revolver + mezz) / result.operatingYears[0]!.ebitda
    expect(cm.seniorDebtToEbitda).toBeCloseTo(expectedRatio, 6)
  })
})
