import type { AmountInput, DealInputs, SourcesUses } from './types'

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

export function computeSourcesUses(inputs: DealInputs): SourcesUses {
  const ev = enterpriseValue(inputs)
  const debtEbitda = debtSizingEbitda(inputs)

  const usesRefinanceTargetDebt = inputs.transaction.targetNetDebt
  const usesEquityPurchasePrice = ev - usesRefinanceTargetDebt
  const usesTransactionCosts = ev * (inputs.transaction.transactionCostsPct / 100)
  const usesMinCashFunding = inputs.transaction.minCashBalance
  const usesTotal =
    usesEquityPurchasePrice + usesRefinanceTargetDebt + usesTransactionCosts + usesMinCashFunding

  const sourcesTrancheTotal = inputs.financing.tranches.reduce(
    (sum, tranche) => sum + resolveAmount(tranche.amount, debtEbitda),
    0,
  )

  const sourcesSponsorEquity =
    inputs.equity.fixedSponsorEquity ?? usesTotal - sourcesTrancheTotal
  const sourcesTotal = sourcesTrancheTotal + sourcesSponsorEquity

  return {
    usesEquityPurchasePrice,
    usesRefinanceTargetDebt,
    usesTransactionCosts,
    usesMinCashFunding,
    usesTotal,
    sourcesTrancheTotal,
    sourcesSponsorEquity,
    sourcesTotal,
    imbalance: sourcesTotal - usesTotal,
  }
}
