import type { AmountInput, DealInputs, DebtTranche, SourcesUses } from './types'

/**
 * LTM/entry EBITDA — the operating plan's own year-0 revenue times its
 * margin. This is the ONLY definition of entry EBITDA in the app: it is
 * what "LTM EBITDA" displays, what enterprise value is priced against, and
 * what debt tranches are sized against. There used to be a second,
 * separately-stored `transaction.ltmMetric` input alongside this one; the
 * two could silently disagree (a real bug — debt sizing used one, the
 * operating model and value bridge used the other). Removed rather than
 * synced, so there is exactly one EBITDA figure for the whole deal to
 * disagree with itself about.
 */
export function entryEbitda(inputs: DealInputs): number {
  return inputs.operating.revenueYear0 * (inputs.operating.ebitdaMarginPct / 100)
}

export function enterpriseValue(inputs: DealInputs): number {
  return entryEbitda(inputs) * inputs.transaction.entryMultiple
}

/** The EBITDA figure "× EBITDA" tranche sizing is resolved against — same figure as entryEbitda(), see its doc comment. */
export function debtSizingEbitda(inputs: DealInputs): number {
  return entryEbitda(inputs)
}

export function resolveAmount(amount: AmountInput, ebitda0: number): number {
  return amount.mode === 'absolute' ? amount.value : amount.value * ebitda0
}

/** A revolver's `amount` is its COMMITTED limit, not a Source at close — only what's drawn at close funds anything. */
export function resolveTrancheSourceAmount(tranche: DebtTranche, debtEbitda: number): number {
  if (tranche.trancheType === 'revolver') return tranche.initialDrawnAmount ?? 0
  return resolveAmount(tranche.amount, debtEbitda)
}

export function resolveTransactionCosts(inputs: DealInputs, ev: number): number {
  const flatCost = ev * (inputs.transaction.transactionCostsPct / 100)
  const itemized = (inputs.transaction.transactionCostItems ?? []).reduce((sum, item) => {
    return sum + (item.mode === 'pctOfEnterpriseValue' ? ev * (item.value / 100) : item.value)
  }, 0)
  return flatCost + itemized
}

// A plug tranche only exists when sponsor equity is fixed — "then a tranche
// becomes the residual instead" is conditional on that, per the brief.
function resolvePlugTrancheId(inputs: DealInputs): string | undefined {
  return inputs.equity.fixedSponsorEquity !== undefined ? inputs.equity.plugTrancheId : undefined
}

/**
 * Solves the plug tranche's own funded amount — the Sources & Uses residual
 * after every other line is known. `undefined` when there is no plug
 * tranche (fixed sponsor equity unset, no plug tranche chosen, or the
 * chosen id doesn't match an actual tranche).
 *
 * Shared by computeSourcesUses() and the debt schedule
 * (computeDebtAndIncomeSchedule() in debt.ts, via resolveTrancheFaceAmounts()
 * below) so the two can't independently disagree about how large the plug
 * tranche actually is. They used to: debt.ts resolved every tranche,
 * plug included, straight off its own (irrelevant, often stale) `amount`
 * field, so a plug-tranche deal's entire debt schedule, IRR, and value
 * bridge were computed against a different tranche size than the one shown
 * in Sources & Uses.
 */
export function resolvePlugAmount(inputs: DealInputs): number | undefined {
  const plugTrancheId = resolvePlugTrancheId(inputs)
  if (plugTrancheId === undefined) return undefined
  const plugTranche = inputs.financing.tranches.find((t) => t.id === plugTrancheId)
  if (!plugTranche) return undefined

  const ev = enterpriseValue(inputs)
  const debtEbitda = debtSizingEbitda(inputs)
  const usesRefinanceTargetDebt = inputs.transaction.targetNetDebt
  const usesEquityPurchasePrice = ev - usesRefinanceTargetDebt
  const usesTransactionCosts = resolveTransactionCosts(inputs, ev)
  const usesMinCashFunding = inputs.transaction.minCashBalance
  const sourcesManagementRollover = inputs.equity.managementRolloverAmount ?? 0

  let nonPlugTrancheTotal = 0
  let nonPlugFinancingFees = 0
  for (const t of inputs.financing.tranches) {
    if (t.id === plugTrancheId) continue
    const amount = resolveTrancheSourceAmount(t, debtEbitda)
    nonPlugTrancheTotal += amount
    nonPlugFinancingFees += amount * ((t.arrangementFeePct ?? 0) / 100)
  }

  const usesExcludingPlugFee =
    usesEquityPurchasePrice +
    usesRefinanceTargetDebt +
    usesTransactionCosts +
    nonPlugFinancingFees +
    usesMinCashFunding

  const plugFeePct = (plugTranche.arrangementFeePct ?? 0) / 100
  const sourcesSponsorEquity = inputs.equity.fixedSponsorEquity!
  const gapBeforePlugFee =
    usesExcludingPlugFee - sourcesSponsorEquity - sourcesManagementRollover - nonPlugTrancheTotal
  // plugAmount = gap + plugAmount*plugFeePct (the plug funds its own fee too) → solve the fixed point.
  return gapBeforePlugFee / (1 - plugFeePct)
}

/**
 * Every tranche's face/committed amount at close, resolved from its
 * `amount` field — except the plug tranche, which uses resolvePlugAmount()
 * instead of its own (irrelevant) amount field. This is what the debt
 * schedule opens every tranche's balance from; see debt.ts.
 */
export function resolveTrancheFaceAmounts(inputs: DealInputs): Record<string, number> {
  const debtEbitda = debtSizingEbitda(inputs)
  const plugAmount = resolvePlugAmount(inputs)
  const plugTrancheId = plugAmount !== undefined ? resolvePlugTrancheId(inputs) : undefined
  const amounts: Record<string, number> = {}
  for (const t of inputs.financing.tranches) {
    amounts[t.id] = t.id === plugTrancheId ? plugAmount! : resolveAmount(t.amount, debtEbitda)
  }
  return amounts
}

export function computeSourcesUses(inputs: DealInputs): SourcesUses {
  const ev = enterpriseValue(inputs)
  const debtEbitda = debtSizingEbitda(inputs)

  const usesRefinanceTargetDebt = inputs.transaction.targetNetDebt
  const usesEquityPurchasePrice = ev - usesRefinanceTargetDebt
  const usesTransactionCosts = resolveTransactionCosts(inputs, ev)
  const usesMinCashFunding = inputs.transaction.minCashBalance
  const sourcesManagementRollover = inputs.equity.managementRolloverAmount ?? 0

  const plugTrancheId = resolvePlugTrancheId(inputs)

  let nonPlugTrancheTotal = 0
  let nonPlugFinancingFees = 0
  for (const t of inputs.financing.tranches) {
    if (t.id === plugTrancheId) continue
    const amount = resolveTrancheSourceAmount(t, debtEbitda)
    nonPlugTrancheTotal += amount
    nonPlugFinancingFees += amount * ((t.arrangementFeePct ?? 0) / 100)
  }

  const usesExcludingPlugFee =
    usesEquityPurchasePrice +
    usesRefinanceTargetDebt +
    usesTransactionCosts +
    nonPlugFinancingFees +
    usesMinCashFunding

  let sourcesSponsorEquity = 0
  let sourcesTrancheTotal = 0
  let usesFinancingFees = nonPlugFinancingFees

  if (plugTrancheId !== undefined) {
    const plugTranche = inputs.financing.tranches.find((t) => t.id === plugTrancheId)!
    const plugFeePct = (plugTranche.arrangementFeePct ?? 0) / 100
    sourcesSponsorEquity = inputs.equity.fixedSponsorEquity!
    const plugAmount = resolvePlugAmount(inputs)!
    sourcesTrancheTotal = nonPlugTrancheTotal + plugAmount
    usesFinancingFees += plugAmount * plugFeePct
  } else {
    sourcesTrancheTotal = nonPlugTrancheTotal
  }

  const usesTotal = usesExcludingPlugFee + (usesFinancingFees - nonPlugFinancingFees)

  if (plugTrancheId === undefined) {
    sourcesSponsorEquity =
      inputs.equity.fixedSponsorEquity ?? usesTotal - sourcesTrancheTotal - sourcesManagementRollover
  }

  const sourcesTotal = sourcesTrancheTotal + sourcesManagementRollover + sourcesSponsorEquity

  return {
    usesEquityPurchasePrice,
    usesRefinanceTargetDebt,
    usesTransactionCosts,
    usesFinancingFees,
    usesMinCashFunding,
    usesTotal,
    sourcesTrancheTotal,
    sourcesManagementRollover,
    sourcesSponsorEquity,
    sourcesTotal,
    imbalance: sourcesTotal - usesTotal,
  }
}
