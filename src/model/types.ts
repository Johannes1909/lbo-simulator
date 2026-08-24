/**
 * Pure data types for the LBO model. Nothing in src/model may import React
 * or touch the DOM — this file (and everything else under src/model) must
 * run unchanged in a plain Node script.
 *
 * Backward-compatibility rule for this file: every field added after
 * Milestone 1 is OPTIONAL, with the engine falling back to the Milestone 1
 * behavior when it's absent. This is deliberate — Milestone 1's test
 * fixtures construct DealInputs/DebtTranche object literals without any of
 * these fields, and they must keep compiling and producing identical
 * results without being touched.
 */

export type ValuationBasis = 'ebitda' | 'revenue'

export type AmountInput =
  | { mode: 'absolute'; value: number }
  | { mode: 'multipleOfEbitda'; value: number }

/**
 * Interest is either calculated on the average of opening and closing
 * balance for the year (the correct treatment once the tranche amortizes
 * mid-year, but it makes the balance depend on the interest that depends on
 * the balance — a circularity resolved by iteration), or on the balance at
 * the end of the prior year (no circularity, easier to hand-check, but
 * slightly understates interest in years with fast paydown). Reference Case
 * 1 uses 'priorYearEnd' and that stays the default for a new deal.
 */
export type InterestBasis = 'average' | 'priorYearEnd'

export type TrancheType = 'termLoan' | 'revolver' | 'mezzanine' | 'sellerNote'

export type RateType =
  | { kind: 'fixed'; ratePct: number }
  | { kind: 'floating'; marginPct: number; floorPct?: number }

/**
 * A single blended reference rate for the whole deal (every floating-rate
 * tranche adds its own margin on top), overridable year by year. Unlisted
 * years fall back to flatRatePct — this avoids needing to resize an array
 * whenever the hold period changes.
 */
export interface ReferenceRateCurve {
  flatRatePct: number
  overridesByYear: Record<number, number>
}

export interface DebtTranche {
  id: string
  name: string
  /** Lower rank = repaid first in the seniority waterfall and in scheduled amortization. */
  seniorityRank: number
  /** For a revolver, this is the COMMITTED facility limit, not the drawn balance. */
  amount: AmountInput
  /** Fixed-rate coupon. Used when `rate` is unset — kept as the primary field so a Milestone 1 tranche (plain fixed rate) needs no changes. */
  fixedRatePct: number
  /** % of the ORIGINAL principal repaid each year as scheduled amortization. 0 = bullet/endfällig. Not applied to revolvers. */
  scheduledAmortizationPctOfOriginal: number
  /** Share of post-amortization free cash flow this tranche sweeps, 0–100. */
  cashSweepParticipationPct: number

  /** Defaults to 'termLoan' when unset. */
  trancheType?: TrancheType
  /** Overrides fixedRatePct when set — use for a floating-rate tranche (reference rate + margin, optional floor). */
  rate?: RateType
  /** % of the period's coupon paid in cash; the rest capitalizes (PIK). Defaults to 100 (fully cash-pay, Milestone 1 behavior). 0 = fully PIK. */
  cashPayPct?: number
  /** Prepayment penalty %, charged while callProtectionYears is still running. Captured as an input; NOT YET applied to the cash flow — see Methodology. */
  prepaymentPenaltyPct?: number
  callProtectionYears?: number
  /** Not enforced in the engine (no forced refinancing at maturity yet) — used only to warn in the UI if maturity falls before the hold period ends. Defaults to a value beyond any reasonable hold period. */
  maturityYears?: number
  /** % of the tranche's face/committed amount, added to Uses at close. Defaults to 0. */
  arrangementFeePct?: number
  /** Revolver only: fee on the undrawn commitment, % p.a. Defaults to 0. */
  commitmentFeePct?: number
  /** Revolver only: amount already drawn AT CLOSE (funds a Source). Defaults to 0 — "undrawn at close" is the normal case. */
  initialDrawnAmount?: number
  /** For the senior-debt/EBITDA covenant: a security classification, not the waterfall rank — a Term Loan A and B are both senior even at different ranks. Defaults to true for 'termLoan' and 'revolver', false for 'mezzanine' and 'sellerNote'; set explicitly to override. */
  isSeniorDebt?: boolean
}

export interface TransactionCostItem {
  label: string
  mode: 'pctOfEnterpriseValue' | 'absolute'
  value: number
}

export interface TransactionInputs {
  valuationBasis: ValuationBasis
  entryMultiple: number
  targetNetDebt: number
  /** Flat transaction-cost %, kept for Milestone 1 compatibility — ADDS to transactionCostItems, doesn't replace it. */
  transactionCostsPct: number
  /** Itemized costs (M&A advisory, legal, DD, ...), each own % of EV or absolute. Defaults to none. */
  transactionCostItems?: TransactionCostItem[]
  minCashBalance: number
  holdPeriodYears: number
}

export interface FinancingInputs {
  tranches: DebtTranche[]
  interestBasis: InterestBasis
  /** Circularity solver: stop when the balance changes by less than this between iterations. */
  convergenceTolerance: number
  maxIterationsPerYear: number
  /** Defaults to a flat 3.0% curve with no overrides when unset. */
  referenceRateCurve?: ReferenceRateCurve
}

export interface OperatingInputs {
  revenueYear0: number
  /** Used when revenueGrowthMode is 'flat' or unset — the single growth rate applied to every year. */
  revenueGrowthPct: number
  /** Defaults to 'flat'. 'perYear' reads revenueGrowthByYear instead, falling back to revenueGrowthPct for any year not listed. */
  revenueGrowthMode?: 'flat' | 'perYear'
  /** Index 0 = year 1. Only used when revenueGrowthMode is 'perYear'. */
  revenueGrowthByYear?: number[]
  ebitdaMarginPct: number
  daPctOfRevenue: number
  maintenanceCapexPctOfRevenue: number
  growthCapexPctOfRevenue: number
  /** Working-capital cash outflow as % of the year-over-year revenue increase. Never negative. */
  workingCapitalPctOfRevenueGrowth: number
  taxRatePct: number
  /** Simplified: unlimited NOL carryforward, no usage cap. Documented simplification for Milestone 1. */
  oneOffCostsByYear: number[]
}

export interface ExitInputs {
  exitYear: number
  exitMultiple: number
  /** If true, ignore exitMultiple and reuse entryMultiple. */
  exitMultipleEqualsEntry: boolean
  exitCostsPct: number
}

/**
 * Sweet-equity / ratchet type shape, defined now per the sponsor's brief so
 * it doesn't need reshaping in Milestone 3. NOT wired into the engine yet:
 * with no management participation configured, all equity is a single
 * sponsor class and returns.ts computes a plain sponsor IRR.
 *
 * Structure: the sponsor's money sits mostly in a preference instrument
 * (accruing a fixed coupon, paid back first at exit); a small slice plus
 * all management money buys common shares at nominal value. At exit the
 * preference instrument + accrued coupon is repaid first, then the
 * remainder splits pro-rata by common share ownership. Ratchet stages can
 * step up management's common share % as return thresholds are cleared.
 */
export interface RatchetStage {
  metric: 'irr' | 'moneyMultiple'
  threshold: number
  managementCommonPct: number
}

export interface SweetEquityStructure {
  sponsorPreferenceCouponPct: number
  managementRolloverPct: number
  managementCommonPctAtEntry: number
  ratchetStages: RatchetStage[]
}

export interface EquityInputs {
  /** Undefined = sponsor equity is the plug (Sources & Uses residual). */
  fixedSponsorEquity?: number
  /** Only used when fixedSponsorEquity is also set: which tranche becomes the residual instead. If fixedSponsorEquity is set without this, Sources/Uses imbalance is reported as a warning (Milestone 1 behavior). */
  plugTrancheId?: string
  /** Equity contributed by management via rollover rather than cash — reduces the sponsor's cash equity need. Defaults to 0. */
  managementRolloverAmount?: number
  sweetEquity?: SweetEquityStructure
}

export interface DealInputs {
  transaction: TransactionInputs
  financing: FinancingInputs
  operating: OperatingInputs
  exit: ExitInputs
  equity: EquityInputs
  /** Defaults applied when unset — see engine.ts DEFAULT_COVENANT_SETTINGS. */
  covenants?: CovenantSettings
}

export interface CovenantThreshold {
  enabled: boolean
  threshold: number
}

export interface CovenantSettings {
  /** Max. */
  netDebtToEbitda: CovenantThreshold
  /** Max. "Senior" is a security classification (see DebtTranche.isSeniorDebt), not the seniorityRank used for the waterfall — a Term Loan A and a Term Loan B are both senior secured debt even though they have different waterfall ranks. */
  seniorDebtToEbitda: CovenantThreshold
  /** Min. */
  interestCoverage: CovenantThreshold
  /** Min. */
  debtServiceCoverage: CovenantThreshold
}

export interface SourcesUses {
  usesEquityPurchasePrice: number
  usesRefinanceTargetDebt: number
  usesTransactionCosts: number
  /** Sum of arrangementFeePct across tranches. 0 for tranches that don't set it. */
  usesFinancingFees: number
  usesMinCashFunding: number
  usesTotal: number
  sourcesTrancheTotal: number
  sourcesManagementRollover: number
  sourcesSponsorEquity: number
  sourcesTotal: number
  /** sourcesTotal - usesTotal; a passing model keeps this within 0.01. */
  imbalance: number
}

export interface OperatingYear {
  year: number
  revenue: number
  ebitda: number
  da: number
  ebit: number
  maintenanceCapex: number
  growthCapex: number
  capex: number
  workingCapitalChange: number
  oneOffCosts: number
}

export interface TrancheYear {
  trancheId: string
  openingBalance: number
  /** Total interest (cash + PIK), kept for Milestone 1 compatibility. */
  interest: number
  cashInterest: number
  pikInterest: number
  scheduledAmortization: number
  cashSweepAmortization: number
  /** Revolver only: draw and priority-repayment this period. */
  revolverDrawn: number
  revolverRepaid: number
  commitmentFeePaid: number
  /** Charged on cashSweepAmortization + revolverRepaid while still within callProtectionYears — never on scheduledAmortization or a maturity payoff. */
  prepaymentPenaltyPaid: number
  closingBalance: number
}

export interface DebtYear {
  year: number
  tranches: TrancheYear[]
  /** Total interest, cash + PIK — kept for Milestone 1 compatibility (equals totalCashInterest when there's no PIK). */
  totalInterest: number
  totalCashInterest: number
  totalPikInterest: number
  totalCommitmentFees: number
  totalScheduledAmortization: number
  totalPrepaymentPenalties: number
  totalDebtOpening: number
  totalDebtClosing: number
  cashOpening: number
  cashClosing: number
  netDebtClosing: number
  liquidityShortfall: number
  convergenceIterations: number
  convergenceWarning: boolean
}

export interface IncomeYear {
  year: number
  ebit: number
  interestExpense: number
  ebt: number
  taxableIncome: number
  taxes: number
  netIncome: number
  nolCarryforwardClosing: number
}

export type CovenantMetricKey = 'netDebtToEbitda' | 'seniorDebtToEbitda' | 'interestCoverage' | 'debtServiceCoverage'

export interface CovenantCheck {
  metric: CovenantMetricKey
  value: number
  threshold: number
  /** Positive = comfortable headroom, negative = breached, in both directions (max- and min-type covenants). */
  headroomPct: number
  breached: boolean
  message: string
}

export interface CreditMetricsYear {
  year: number
  netDebtToEbitda: number
  seniorDebtToEbitda: number
  interestCoverage: number
  debtServiceCoverage: number
  freeCashFlowYield: number
  /** Only the covenants enabled in DealInputs.covenants. */
  covenantChecks: CovenantCheck[]
}

export interface EquityCashFlow {
  year: number
  amount: number
  label: string
}

export interface ReturnsResult {
  cashFlows: EquityCashFlow[]
  irr: number | null
  moneyMultiple: number | null
  exitEnterpriseValue: number
  exitNetDebt: number
  exitEquityValue: number
  warnings: string[]
}

export interface ValueBridge {
  entryEquity: number
  ebitdaGrowthEffect: number
  multipleEffect: number
  deleveragingEffect: number
  interimDistributionsEffect: number
  exitEquity: number
  /** entryEquity + all effects; must equal exitEquity within 0.01. */
  reconciledTotal: number
}

export interface ModelOutput {
  sourcesUses: SourcesUses
  operatingYears: OperatingYear[]
  debtYears: DebtYear[]
  incomeYears: IncomeYear[]
  creditMetrics: CreditMetricsYear[]
  returns: ReturnsResult
  valueBridge: ValueBridge
  warnings: string[]
}
