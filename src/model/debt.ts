import { debtSizingEbitda, resolveAmount } from './sourcesUses'
import type {
  DealInputs,
  DebtTranche,
  DebtYear,
  IncomeYear,
  OperatingYear,
  TrancheYear,
} from './types'

interface WaterfallResult {
  mandatoryPaid: Record<string, number>
  sweepPaid: Record<string, number>
  closingBalances: Record<string, number>
  cashClosing: number
}

/**
 * Mandatory amortization, then cash sweep of the excess above the minimum
 * cash balance, both applied strictly in seniority rank order. Milestone 1
 * has no revolver: if available cash can't even cover mandatory
 * amortization, cash is allowed to fall below the minimum (or negative) and
 * the shortfall is reported rather than silently plugged.
 */
function applyWaterfall(
  tranches: DebtTranche[],
  openingBalances: Record<string, number>,
  originalAmounts: Record<string, number>,
  availableCash: number,
  minCashBalance: number,
): WaterfallResult {
  const sorted = [...tranches].sort((a, b) => a.seniorityRank - b.seniorityRank)

  let mandatoryCapacity = Math.max(0, availableCash)
  const mandatoryPaid: Record<string, number> = {}
  const balanceAfterMandatory: Record<string, number> = { ...openingBalances }
  for (const t of sorted) {
    const scheduled = originalAmounts[t.id]! * (t.scheduledAmortizationPctOfOriginal / 100)
    const payable = Math.min(scheduled, balanceAfterMandatory[t.id]!, mandatoryCapacity)
    mandatoryPaid[t.id] = payable
    balanceAfterMandatory[t.id]! -= payable
    mandatoryCapacity -= payable
  }
  const totalMandatoryPaid = Object.values(mandatoryPaid).reduce((a, b) => a + b, 0)
  const cashAfterMandatory = availableCash - totalMandatoryPaid

  let excessPool = Math.max(0, cashAfterMandatory - minCashBalance)
  const sweepPaid: Record<string, number> = {}
  const closingBalances: Record<string, number> = { ...balanceAfterMandatory }
  for (const t of sorted) {
    if (excessPool <= 0) {
      sweepPaid[t.id] = 0
      continue
    }
    const cap = balanceAfterMandatory[t.id]!
    const amount = Math.min(excessPool, cap) * (t.cashSweepParticipationPct / 100)
    sweepPaid[t.id] = amount
    closingBalances[t.id]! -= amount
    excessPool -= amount
  }
  const totalSweepPaid = Object.values(sweepPaid).reduce((a, b) => a + b, 0)

  return {
    mandatoryPaid,
    sweepPaid,
    closingBalances,
    cashClosing: cashAfterMandatory - totalSweepPaid,
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
  const { tranches, interestBasis, convergenceTolerance, maxIterationsPerYear } = inputs.financing
  const debtEbitda = debtSizingEbitda(inputs)
  const originalAmounts: Record<string, number> = {}
  let trancheBalances: Record<string, number> = {}
  for (const t of tranches) {
    const amount = resolveAmount(t.amount, debtEbitda)
    originalAmounts[t.id] = amount
    trancheBalances[t.id] = amount
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

    let totalInterest = 0
    let ebt = 0
    let taxableIncome = 0
    let taxes = 0
    let netIncome = 0
    let nolClosing = nolCarryforward
    let waterfall: WaterfallResult = {
      mandatoryPaid: {},
      sweepPaid: {},
      closingBalances: { ...openingBalances },
      cashClosing: cashOpening,
    }

    while (iterations < maxIterationsPerYear) {
      iterations++

      const interestByTranche: Record<string, number> = {}
      for (const t of tranches) {
        const rate = t.fixedRatePct / 100
        const opening = openingBalances[t.id]!
        const closing = closingGuess[t.id]!
        interestByTranche[t.id] =
          interestBasis === 'average' ? rate * ((opening + closing) / 2) : rate * opening
      }
      totalInterest = Object.values(interestByTranche).reduce((a, b) => a + b, 0)

      ebt = op.ebit - totalInterest
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
        op.ebitda - taxes - totalInterest - op.capex - op.workingCapitalChange - op.oneOffCosts
      const availableCash = cashOpening + fcf

      waterfall = applyWaterfall(
        tranches,
        openingBalances,
        originalAmounts,
        availableCash,
        inputs.transaction.minCashBalance,
      )

      let maxDiff = 0
      for (const t of tranches) {
        maxDiff = Math.max(
          maxDiff,
          Math.abs(waterfall.closingBalances[t.id]! - closingGuess[t.id]!),
        )
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

    const shortfall = Math.max(0, inputs.transaction.minCashBalance - cashBalance)
    if (shortfall > 0.005) {
      warnings.push(
        `Year ${op.year}: cash flow does not cover debt service — liquidity falls ${shortfall.toFixed(2)} short of the minimum cash balance (no revolver in Milestone 1).`,
      )
    }

    const trancheYears: TrancheYear[] = tranches.map((t) => ({
      trancheId: t.id,
      openingBalance: openingBalances[t.id]!,
      interest:
        interestBasis === 'average'
          ? (t.fixedRatePct / 100) * ((openingBalances[t.id]! + waterfall.closingBalances[t.id]!) / 2)
          : (t.fixedRatePct / 100) * openingBalances[t.id]!,
      scheduledAmortization: waterfall.mandatoryPaid[t.id] ?? 0,
      cashSweepAmortization: waterfall.sweepPaid[t.id] ?? 0,
      closingBalance: waterfall.closingBalances[t.id]!,
    }))

    const totalDebtClosing = Object.values(waterfall.closingBalances).reduce((a, b) => a + b, 0)

    debtYears.push({
      year: op.year,
      tranches: trancheYears,
      totalInterest,
      totalDebtOpening,
      totalDebtClosing,
      cashOpening,
      cashClosing: cashBalance,
      netDebtClosing: totalDebtClosing - cashBalance,
      liquidityShortfall: shortfall,
      convergenceIterations: iterations,
      convergenceWarning: !converged,
    })

    incomeYears.push({
      year: op.year,
      ebit: op.ebit,
      interestExpense: totalInterest,
      ebt,
      taxableIncome,
      taxes,
      netIncome,
      nolCarryforwardClosing: nolClosing,
    })
  }

  return { debtYears, incomeYears, warnings }
}
