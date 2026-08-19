/**
 * Pure data types for the LBO model. Nothing in src/model may import React
 * or touch the DOM — this file (and everything else under src/model) must
 * run unchanged in a plain Node script.
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
 * slightly understates interest in years with fast paydown).
 */
export type InterestBasis = 'average' | 'priorYearEnd'

/**
 * Milestone 1 supports a single, fixed-rate, cash-pay tranche with optional
 * straight-line scheduled amortization and cash sweep participation.
 * Floating rates, PIK, revolver draws, call protection and multi-tranche
 * seniority waterfalls arrive in Milestone 2 — the array shape here is
 * already set up for that so the schedule logic doesn't need to be rebuilt.
 */
export interface DebtTranche {
  id: string
  name: string
  /** Lower rank = repaid first in the seniority waterfall. */
  seniorityRank: number
  amount: AmountInput
  fixedRatePct: number
  /** % of the ORIGINAL principal repaid each year as scheduled amortization. 0 = bullet/endfällig. */
  scheduledAmortizationPctOfOriginal: number
  /** Share of post-amortization free cash flow this tranche sweeps, 0–1. */
  cashSweepParticipationPct: number
}

export interface TransactionInputs {
  valuationBasis: ValuationBasis
  entryMultiple: number
  /** LTM EBITDA or LTM revenue at entry, matching valuationBasis. */
  ltmMetric: number
  targetNetDebt: number
  transactionCostsPct: number
  minCashBalance: number
  holdPeriodYears: number
}

export interface FinancingInputs {
  tranches: DebtTranche[]
  interestBasis: InterestBasis
  /** Circularity solver: stop when the balance changes by less than this between iterations. */
  convergenceTolerance: number
  maxIterationsPerYear: number
}

export interface OperatingInputs {
  revenueYear0: number
  revenueGrowthPct: number
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
 * it doesn't need reshaping in Milestone 3. NOT wired into the Milestone 1
 * engine: with no management participation configured, all equity is a
 * single sponsor class and returns.ts computes a plain sponsor IRR.
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
  sweetEquity?: SweetEquityStructure
}

export interface DealInputs {
  transaction: TransactionInputs
  financing: FinancingInputs
  operating: OperatingInputs
  exit: ExitInputs
  equity: EquityInputs
}

export interface SourcesUses {
  usesEquityPurchasePrice: number
  usesRefinanceTargetDebt: number
  usesTransactionCosts: number
  usesMinCashFunding: number
  usesTotal: number
  sourcesTrancheTotal: number
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
  interest: number
  scheduledAmortization: number
  cashSweepAmortization: number
  closingBalance: number
}

export interface DebtYear {
  year: number
  tranches: TrancheYear[]
  totalInterest: number
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

export interface CreditMetricsYear {
  year: number
  netDebtToEbitda: number
  interestCoverage: number
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
