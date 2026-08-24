import { resolveTrancheFaceAmounts } from './sourcesUses'
import type {
  DealInputs,
  DebtTranche,
  DebtYear,
  IncomeYear,
  OperatingYear,
  ReferenceRateCurve,
  TrancheYear,
} from './types'

const DEFAULT_REFERENCE_RATE_PCT = 3.0

export function resolveReferenceRate(curve: ReferenceRateCurve | undefined, year: number): number {
  if (!curve) return DEFAULT_REFERENCE_RATE_PCT
  return curve.overridesByYear[year] ?? curve.flatRatePct
}

/** Falls back to fixedRatePct when `rate` is unset — a Milestone 1 tranche needs no changes to keep working. */
export function resolveTrancheRate(
  tranche: DebtTranche,
  curve: ReferenceRateCurve | undefined,
  year: number,
): number {
  if (tranche.rate?.kind === 'floating') {
    const raw = resolveReferenceRate(curve, year) + tranche.rate.marginPct
    return tranche.rate.floorPct !== undefined ? Math.max(raw, tranche.rate.floorPct) : raw
  }
  if (tranche.rate?.kind === 'fixed') return tranche.rate.ratePct
  return tranche.fixedRatePct
}

interface InterestSplit {
  cash: number
  pik: number
}

function computeInterestSplit(
  tranche: DebtTranche,
  openingBalance: number,
  closingGuess: number,
  interestBasis: 'average' | 'priorYearEnd',
  curve: ReferenceRateCurve | undefined,
  year: number,
): InterestSplit {
  const ratePct = resolveTrancheRate(tranche, curve, year)
  const basisBalance = interestBasis === 'average' ? (openingBalance + closingGuess) / 2 : openingBalance
  const totalInterest = (ratePct / 100) * basisBalance
  const cashPayPct = tranche.cashPayPct ?? 100
  return {
    cash: totalInterest * (cashPayPct / 100),
    pik: totalInterest * ((100 - cashPayPct) / 100),
  }
}

interface WaterfallResult {
  balanceAfterPik: Record<string, number>
  mandatoryPaid: Record<string, number>
  revolverDrawn: Record<string, number>
  revolverRepaid: Record<string, number>
  sweepPaid: Record<string, number>
  prepaymentPenaltyPaid: Record<string, number>
  closingBalances: Record<string, number>
  cashClosing: number
  liquidityShortfall: number
}

/**
 * Charged on any VOLUNTARY early repayment — cash sweep or a revolver
 * paydown — while still inside the tranche's call-protection window; never
 * on scheduled amortization, and never once the protection period has
 * passed. Sponsor's convention: % × the amount actually repaid.
 */
function penaltyRateFor(tranche: DebtTranche, year: number): number {
  const protectionYears = tranche.callProtectionYears ?? 0
  if (year > protectionYears) return 0
  return (tranche.prepaymentPenaltyPct ?? 0) / 100
}

/**
 * One period's waterfall, strictly in the order the brief specifies: cash
 * interest and PIK capitalization happen before this is called (the caller
 * needs the interest split to compute free cash flow first); this function
 * covers steps 3–7: commitment fee, scheduled amortization by rank, a
 * revolver draw if cash still won't cover the minimum, then — on the
 * excess side — revolver paydown first, then cash sweep by rank and
 * participation, each netted against its own prepayment penalty so the
 * penalty is funded from the same pool ahead of the next tranche in rank,
 * without ever overdrawing it. No tranche balance ever goes below zero; a
 * shortfall the revolver can't cover is reported, never silently absorbed.
 */
function runWaterfall(
  tranches: DebtTranche[],
  openingBalances: Record<string, number>,
  pikByTranche: Record<string, number>,
  originalAmounts: Record<string, number>,
  availableCashBeforeDebtService: number,
  minCashBalance: number,
  year: number,
): WaterfallResult {
  const sorted = [...tranches].sort((a, b) => a.seniorityRank - b.seniorityRank)

  const balanceAfterPik: Record<string, number> = {}
  for (const t of tranches) {
    balanceAfterPik[t.id] = openingBalances[t.id]! + (pikByTranche[t.id] ?? 0)
  }

  // Step 4: scheduled amortization by rank (revolvers don't amortize on a fixed schedule).
  let mandatoryCapacity = Math.max(0, availableCashBeforeDebtService)
  const mandatoryPaid: Record<string, number> = {}
  const runningBalance: Record<string, number> = { ...balanceAfterPik }
  for (const t of sorted) {
    if (t.trancheType === 'revolver') {
      mandatoryPaid[t.id] = 0
      continue
    }
    const scheduled = originalAmounts[t.id]! * (t.scheduledAmortizationPctOfOriginal / 100)
    const payable = Math.min(scheduled, runningBalance[t.id]!, mandatoryCapacity)
    mandatoryPaid[t.id] = payable
    runningBalance[t.id]! -= payable
    mandatoryCapacity -= payable
  }
  const totalMandatoryPaid = Object.values(mandatoryPaid).reduce((a, b) => a + b, 0)
  const cashAfterMandatory = availableCashBeforeDebtService - totalMandatoryPaid

  // Step 5: shortfall — draw the revolver(s), in rank order, up to committed capacity.
  let remainingShortfall = Math.max(0, minCashBalance - cashAfterMandatory)
  let cashAfterRevolverDraws = cashAfterMandatory
  const revolverDrawn: Record<string, number> = {}
  for (const t of sorted) {
    if (t.trancheType !== 'revolver') continue
    if (remainingShortfall <= 0) {
      revolverDrawn[t.id] = 0
      continue
    }
    const committedLimit = originalAmounts[t.id]!
    const capacity = Math.max(0, committedLimit - runningBalance[t.id]!)
    const draw = Math.min(remainingShortfall, capacity)
    revolverDrawn[t.id] = draw
    runningBalance[t.id]! += draw
    cashAfterRevolverDraws += draw
    remainingShortfall -= draw
  }
  const liquidityShortfall = remainingShortfall

  const prepaymentPenaltyPaid: Record<string, number> = {}
  for (const t of tranches) prepaymentPenaltyPaid[t.id] = 0

  // Step 6: excess above the minimum — repay drawn revolver(s) first, then sweep by rank.
  // Each repayment is sized so repay + its own penalty never exceeds the pool.
  let excessAboveMin = Math.max(0, cashAfterRevolverDraws - minCashBalance)
  const revolverRepaid: Record<string, number> = {}
  for (const t of sorted) {
    if (t.trancheType !== 'revolver') continue
    if (excessAboveMin <= 0) {
      revolverRepaid[t.id] = 0
      continue
    }
    const penaltyRate = penaltyRateFor(t, year)
    const affordable = penaltyRate > 0 ? excessAboveMin / (1 + penaltyRate) : excessAboveMin
    const repay = Math.min(affordable, runningBalance[t.id]!)
    const penalty = repay * penaltyRate
    revolverRepaid[t.id] = repay
    prepaymentPenaltyPaid[t.id] += penalty
    runningBalance[t.id]! -= repay
    excessAboveMin -= repay + penalty
  }

  const sweepPaid: Record<string, number> = {}
  const closingBalances: Record<string, number> = { ...runningBalance }
  let excessForSweep = excessAboveMin
  for (const t of sorted) {
    if (t.trancheType === 'revolver') {
      sweepPaid[t.id] = 0
      continue
    }
    if (excessForSweep <= 0) {
      sweepPaid[t.id] = 0
      continue
    }
    const penaltyRate = penaltyRateFor(t, year)
    const cap = runningBalance[t.id]!
    const affordable = penaltyRate > 0 ? excessForSweep / (1 + penaltyRate) : excessForSweep
    const amount = Math.min(affordable, cap) * (t.cashSweepParticipationPct / 100)
    const penalty = amount * penaltyRate
    sweepPaid[t.id] = amount
    prepaymentPenaltyPaid[t.id] += penalty
    closingBalances[t.id]! -= amount
    excessForSweep -= amount + penalty
  }
  const totalSweepPaid = Object.values(sweepPaid).reduce((a, b) => a + b, 0)
  const totalRevolverRepaid = Object.values(revolverRepaid).reduce((a, b) => a + b, 0)
  const totalPrepaymentPenalties = Object.values(prepaymentPenaltyPaid).reduce((a, b) => a + b, 0)

  return {
    balanceAfterPik,
    mandatoryPaid,
    revolverDrawn,
    revolverRepaid,
    sweepPaid,
    prepaymentPenaltyPaid,
    closingBalances,
    cashClosing: cashAfterRevolverDraws - totalRevolverRepaid - totalSweepPaid - totalPrepaymentPenalties,
    liquidityShortfall,
  }
}

export interface DebtScheduleResult {
  debtYears: DebtYear[]
  incomeYears: IncomeYear[]
  warnings: string[]
}

export function computeDebtAndIncomeSchedule(
  inputs: DealInputs,
  operatingYears: OperatingYear[],
): DebtScheduleResult {
  const { tranches, interestBasis, convergenceTolerance, maxIterationsPerYear, referenceRateCurve } =
    inputs.financing
  // Face amounts, including the plug tranche's solved residual — the same
  // figures Sources & Uses displays, not each tranche's own `amount` field
  // read in isolation (a plug tranche's `amount` is a placeholder; its real
  // size only exists as the S&U residual).
  const faceAmounts = resolveTrancheFaceAmounts(inputs)

  const originalAmounts: Record<string, number> = {}
  let trancheBalances: Record<string, number> = {}
  for (const t of tranches) {
    const resolved = faceAmounts[t.id]!
    originalAmounts[t.id] = resolved
    trancheBalances[t.id] = t.trancheType === 'revolver' ? (t.initialDrawnAmount ?? 0) : resolved
  }

  let cashBalance = inputs.transaction.minCashBalance
  let nolCarryforward = 0
  const warnings: string[] = []
  const debtYears: DebtYear[] = []
  const incomeYears: IncomeYear[] = []

  for (const op of operatingYears) {
    const openingBalances = { ...trancheBalances }
    const cashOpening = cashBalance
    const totalDebtOpening = Object.values(openingBalances).reduce((a, b) => a + b, 0)

    let closingGuess = { ...openingBalances }
    let iterations = 0
    let converged = tranches.length === 0

    let cashInterestByTranche: Record<string, number> = {}
    let pikInterestByTranche: Record<string, number> = {}
    let totalCashInterest = 0
    let totalPikInterest = 0
    let totalCommitmentFees = 0
    let ebt = 0
    let taxableIncome = 0
    let taxes = 0
    let netIncome = 0
    let nolClosing = nolCarryforward
    let waterfall: WaterfallResult = {
      balanceAfterPik: { ...openingBalances },
      mandatoryPaid: {},
      revolverDrawn: {},
      revolverRepaid: {},
      sweepPaid: {},
      prepaymentPenaltyPaid: {},
      closingBalances: { ...openingBalances },
      cashClosing: cashOpening,
      liquidityShortfall: 0,
    }

    while (iterations < maxIterationsPerYear) {
      iterations++

      cashInterestByTranche = {}
      pikInterestByTranche = {}
      for (const t of tranches) {
        const split = computeInterestSplit(
          t,
          openingBalances[t.id]!,
          closingGuess[t.id]!,
          interestBasis,
          referenceRateCurve,
          op.year,
        )
        cashInterestByTranche[t.id] = split.cash
        pikInterestByTranche[t.id] = split.pik
      }
      totalCashInterest = Object.values(cashInterestByTranche).reduce((a, b) => a + b, 0)
      totalPikInterest = Object.values(pikInterestByTranche).reduce((a, b) => a + b, 0)

      totalCommitmentFees = 0
      for (const t of tranches) {
        if (t.trancheType !== 'revolver') continue
        const undrawnOpening = originalAmounts[t.id]! - openingBalances[t.id]!
        totalCommitmentFees += ((t.commitmentFeePct ?? 0) / 100) * Math.max(0, undrawnOpening)
      }

      ebt = op.ebit - (totalCashInterest + totalPikInterest)
      if (ebt >= 0) {
        const nolUsed = Math.min(nolCarryforward, ebt)
        taxableIncome = ebt - nolUsed
        taxes = taxableIncome * (inputs.operating.taxRatePct / 100)
        netIncome = ebt - taxes
        nolClosing = nolCarryforward - nolUsed
      } else {
        taxableIncome = 0
        taxes = 0
        netIncome = ebt
        nolClosing = nolCarryforward - ebt
      }

      const fcf =
        op.ebitda -
        taxes -
        totalCashInterest -
        totalCommitmentFees -
        op.capex -
        op.workingCapitalChange -
        op.oneOffCosts
      const availableCash = cashOpening + fcf

      waterfall = runWaterfall(
        tranches,
        openingBalances,
        pikInterestByTranche,
        originalAmounts,
        availableCash,
        inputs.transaction.minCashBalance,
        op.year,
      )

      let maxDiff = 0
      for (const t of tranches) {
        maxDiff = Math.max(maxDiff, Math.abs(waterfall.closingBalances[t.id]! - closingGuess[t.id]!))
      }
      closingGuess = waterfall.closingBalances

      if (maxDiff < convergenceTolerance) {
        converged = true
        break
      }
    }

    if (!converged) {
      warnings.push(
        `Year ${op.year}: interest/debt circularity did not converge within ${maxIterationsPerYear} iterations — figures shown are the last iteration, not a solved value.`,
      )
    }

    trancheBalances = waterfall.closingBalances
    cashBalance = waterfall.cashClosing
    nolCarryforward = nolClosing

    if (waterfall.liquidityShortfall > 0.005) {
      warnings.push(
        `Year ${op.year}: cash flow and available revolver capacity don't cover debt service — liquidity falls ${waterfall.liquidityShortfall.toFixed(2)} short of the minimum cash balance.`,
      )
    }

    // Recompute each tranche's reported interest from the converged (not the last-guessed) closing
    // balance, same as Milestone 1 — the difference is within the convergence tolerance.
    const trancheYears: TrancheYear[] = tranches.map((t) => {
      const split = computeInterestSplit(
        t,
        openingBalances[t.id]!,
        waterfall.closingBalances[t.id]!,
        interestBasis,
        referenceRateCurve,
        op.year,
      )
      return {
        trancheId: t.id,
        openingBalance: openingBalances[t.id]!,
        interest: split.cash + split.pik,
        cashInterest: split.cash,
        pikInterest: split.pik,
        scheduledAmortization: waterfall.mandatoryPaid[t.id] ?? 0,
        cashSweepAmortization: waterfall.sweepPaid[t.id] ?? 0,
        revolverDrawn: waterfall.revolverDrawn[t.id] ?? 0,
        revolverRepaid: waterfall.revolverRepaid[t.id] ?? 0,
        commitmentFeePaid:
          t.trancheType === 'revolver'
            ? ((t.commitmentFeePct ?? 0) / 100) *
              Math.max(0, originalAmounts[t.id]! - openingBalances[t.id]!)
            : 0,
        prepaymentPenaltyPaid: waterfall.prepaymentPenaltyPaid[t.id] ?? 0,
        closingBalance: waterfall.closingBalances[t.id]!,
      }
    })

    const totalDebtClosing = Object.values(waterfall.closingBalances).reduce((a, b) => a + b, 0)
    const totalScheduledAmortization = Object.values(waterfall.mandatoryPaid).reduce((a, b) => a + b, 0)
    const totalPrepaymentPenalties = Object.values(waterfall.prepaymentPenaltyPaid).reduce((a, b) => a + b, 0)

    debtYears.push({
      year: op.year,
      tranches: trancheYears,
      totalInterest: totalCashInterest + totalPikInterest,
      totalCashInterest,
      totalPikInterest,
      totalCommitmentFees,
      totalScheduledAmortization,
      totalPrepaymentPenalties,
      totalDebtOpening,
      totalDebtClosing,
      cashOpening,
      cashClosing: cashBalance,
      netDebtClosing: totalDebtClosing - cashBalance,
      liquidityShortfall: waterfall.liquidityShortfall,
      convergenceIterations: iterations,
      convergenceWarning: !converged,
    })

    incomeYears.push({
      year: op.year,
      ebit: op.ebit,
      interestExpense: totalCashInterest + totalPikInterest,
      ebt,
      taxableIncome,
      taxes,
      netIncome,
      nolCarryforwardClosing: nolClosing,
    })
  }

  return { debtYears, incomeYears, warnings }
}
