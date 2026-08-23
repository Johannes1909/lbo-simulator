import type { AmountInput, DealInputs, DebtTranche, SourcesUses } from './types'

/**
 * EBITDA implied by the operating plan's own year-0 revenue and margin.
 * This is NOT necessarily the same figure as the transaction's LTM EBITDA
 * input — a real deal's LTM EBITDA (a trailing-twelve-months fact used for
 * pricing) and a forecast model's year-0 base can legitimately differ. Used
 * only as the debt-sizing base when valuationBasis is 'revenue', i.e. when
 * there is no EBITDA transaction input to anchor on instead.
 */
export function entryEbitda(inputs: DealInputs): number {
  return inputs.operating.revenueYear0 * (inputs.operating.ebitdaMarginPct / 100)
}

export function enterpriseValue(inputs: DealInputs): number {
  return inputs.transaction.ltmMetric * inputs.transaction.entryMultiple
}

/**
 * The EBITDA figure "× EBITDA" tranche sizing is sized against. When the
 * deal is valued on an EBITDA basis, this IS the displayed LTM EBITDA —
 * debt is sized off the same trailing EBITDA the entry price is set on, not
 * off a separately-derived operating-model figure that could silently
 * disagree with it. Falls back to the operating model's EBITDA only when
 * the deal is valued on a revenue basis, where there is no EBITDA
 * transaction input to use instead.
 */
export function debtSizingEbitda(inputs: DealInputs): number {
  return inputs.transaction.valuationBasis === 'ebitda'
    ? inputs.transaction.ltmMetric
    : entryEbitda(inputs)
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

export function computeSourcesUses(inputs: DealInputs): SourcesUses {
  const ev = enterpriseValue(inputs)
  const debtEbitda = debtSizingEbitda(inputs)

  const usesRefinanceTargetDebt = inputs.transaction.targetNetDebt
  const usesEquityPurchasePrice = ev - usesRefinanceTargetDebt
  const usesTransactionCosts = resolveTransactionCosts(inputs, ev)
  const usesMinCashFunding = inputs.transaction.minCashBalance
  const sourcesManagementRollover = inputs.equity.managementRolloverAmount ?? 0

  // A plug tranche only exists when sponsor equity is fixed — "then a tranche
  // becomes the residual instead" is conditional on that, per the brief.
  const plugTrancheId =
    inputs.equity.fixedSponsorEquity !== undefined ? inputs.equity.plugTrancheId : undefined

  const nonPlugAmounts = new Map<string, number>()
  let nonPlugTrancheTotal = 0
  let nonPlugFinancingFees = 0
  for (const t of inputs.financing.tranches) {
    if (t.id === plugTrancheId) continue
    const amount = resolveTrancheSourceAmount(t, debtEbitda)
    nonPlugAmounts.set(t.id, amount)
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
    const gapBeforePlugFee =
      usesExcludingPlugFee - sourcesSponsorEquity - sourcesManagementRollover - nonPlugTrancheTotal
    // plugAmount = gap + plugAmount*plugFeePct (the plug funds its own fee too) → solve the fixed point.
    const plugAmount = gapBeforePlugFee / (1 - plugFeePct)
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
