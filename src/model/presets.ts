import { DEFAULT_COVENANT_SETTINGS } from './covenants'
import type { DealInputs, DebtTranche } from './types'

export type PresetId = 'referenceCase' | 'europeanMidMarket'

/**
 * The sponsor's hand-calculated Reference Case 1 (verified in Excel,
 * 2026-08-15): Sources = Uses at 360.0, IRR 20.20%, money multiple 2.509x.
 * This is the SINGLE definition of that case — the reference-case test and
 * the app's default startup state both build from this function, not from
 * two separately hand-typed copies. That's deliberate: it's the only way
 * "the app opens on the wrong numbers" and "the test passes" can't both be
 * true at once without being caught immediately.
 */
export function buildReferenceCaseInputs(): DealInputs {
  return {
    transaction: {
      valuationBasis: 'ebitda',
      entryMultiple: 9.0,
      ltmMetric: 40.0,
      targetNetDebt: 0,
      transactionCostsPct: 0,
      minCashBalance: 0,
      holdPeriodYears: 5,
    },
    financing: {
      tranches: [
        {
          id: 'term-loan',
          name: 'Term Loan',
          seniorityRank: 1,
          amount: { mode: 'absolute', value: 198.0 },
          fixedRatePct: 7.0,
          scheduledAmortizationPctOfOriginal: 0,
          cashSweepParticipationPct: 100,
        },
      ],
      interestBasis: 'priorYearEnd',
      convergenceTolerance: 0.001,
      maxIterationsPerYear: 50,
    },
    operating: {
      revenueYear0: 200.0,
      revenueGrowthPct: 6.0,
      ebitdaMarginPct: 20.0,
      daPctOfRevenue: 2.4,
      maintenanceCapexPctOfRevenue: 2.4,
      growthCapexPctOfRevenue: 0,
      workingCapitalPctOfRevenueGrowth: 3.0,
      taxRatePct: 20.0,
      oneOffCostsByYear: [],
    },
    exit: {
      exitYear: 5,
      exitMultiple: 9.0,
      exitMultipleEqualsEntry: false,
      exitCostsPct: 0,
    },
    equity: {},
  }
}

/**
 * A realistic European mid-market capital structure (per sponsor brief,
 * Milestone 2): TLA + TLB + revolver + mezzanine + an unused seller note,
 * all floating off a 3.0% reference rate except the fixed-rate mezzanine.
 * Operating assumptions match Reference Case 1's so the LTM EBITDA shown
 * is always the exact figure debt is sized against — see
 * debtSizingEbitda() in sourcesUses.ts.
 */
export function buildEuropeanMidMarketInputs(): DealInputs {
  const tranches: DebtTranche[] = [
    {
      id: 'term-loan-a',
      name: 'Term Loan A',
      seniorityRank: 1,
      trancheType: 'termLoan',
      amount: { mode: 'multipleOfEbitda', value: 2.0 },
      fixedRatePct: 6.25,
      rate: { kind: 'floating', marginPct: 3.25 },
      cashPayPct: 100,
      scheduledAmortizationPctOfOriginal: 5,
      cashSweepParticipationPct: 100,
      maturityYears: 6,
    },
    {
      id: 'term-loan-b',
      name: 'Term Loan B',
      seniorityRank: 2,
      trancheType: 'termLoan',
      amount: { mode: 'multipleOfEbitda', value: 2.0 },
      fixedRatePct: 7.0,
      rate: { kind: 'floating', marginPct: 4.0 },
      cashPayPct: 100,
      scheduledAmortizationPctOfOriginal: 0,
      cashSweepParticipationPct: 100,
      maturityYears: 7,
    },
    {
      id: 'revolver',
      name: 'Revolver',
      seniorityRank: 1,
      trancheType: 'revolver',
      amount: { mode: 'multipleOfEbitda', value: 0.5 },
      fixedRatePct: 6.0,
      rate: { kind: 'floating', marginPct: 3.0 },
      cashPayPct: 100,
      scheduledAmortizationPctOfOriginal: 0,
      cashSweepParticipationPct: 0,
      commitmentFeePct: 0.5,
      initialDrawnAmount: 0,
      maturityYears: 6,
    },
    {
      id: 'mezzanine',
      name: 'Mezzanine',
      seniorityRank: 3,
      trancheType: 'mezzanine',
      amount: { mode: 'multipleOfEbitda', value: 1.0 },
      fixedRatePct: 10.0,
      rate: { kind: 'fixed', ratePct: 10.0 },
      cashPayPct: 60,
      scheduledAmortizationPctOfOriginal: 0,
      cashSweepParticipationPct: 0,
      maturityYears: 8,
    },
    {
      id: 'seller-note',
      name: "Seller's Note",
      seniorityRank: 4,
      trancheType: 'sellerNote',
      amount: { mode: 'absolute', value: 0 },
      fixedRatePct: 5.0,
      rate: { kind: 'fixed', ratePct: 5.0 },
      cashPayPct: 100,
      scheduledAmortizationPctOfOriginal: 0,
      cashSweepParticipationPct: 0,
      maturityYears: 8,
    },
  ]

  return {
    transaction: {
      valuationBasis: 'ebitda',
      entryMultiple: 9.0,
      ltmMetric: 40.0,
      targetNetDebt: 0,
      transactionCostsPct: 0,
      transactionCostItems: [
        { label: 'M&A advisory', mode: 'pctOfEnterpriseValue', value: 0 },
        { label: 'Legal', mode: 'pctOfEnterpriseValue', value: 0 },
        { label: 'Due diligence', mode: 'pctOfEnterpriseValue', value: 0 },
      ],
      minCashBalance: 2.0,
      holdPeriodYears: 5,
    },
    financing: {
      tranches,
      interestBasis: 'priorYearEnd',
      convergenceTolerance: 0.001,
      maxIterationsPerYear: 50,
      referenceRateCurve: { flatRatePct: 3.0, overridesByYear: {} },
    },
    operating: {
      revenueYear0: 200.0,
      revenueGrowthPct: 6.0,
      ebitdaMarginPct: 20.0,
      daPctOfRevenue: 2.4,
      maintenanceCapexPctOfRevenue: 2.4,
      growthCapexPctOfRevenue: 0,
      workingCapitalPctOfRevenueGrowth: 3.0,
      taxRatePct: 20.0,
      oneOffCostsByYear: [],
    },
    exit: {
      exitYear: 5,
      exitMultiple: 9.0,
      exitMultipleEqualsEntry: false,
      exitCostsPct: 0,
    },
    equity: {},
    covenants: DEFAULT_COVENANT_SETTINGS,
  }
}

export interface PresetDefinition {
  id: PresetId
  label: string
  build: () => DealInputs
}

export const PRESETS: PresetDefinition[] = [
  { id: 'referenceCase', label: 'Reference case', build: buildReferenceCaseInputs },
  { id: 'europeanMidMarket', label: 'European mid-market', build: buildEuropeanMidMarketInputs },
]

export function buildPresetInputs(id: PresetId): DealInputs {
  return (PRESETS.find((p) => p.id === id) ?? PRESETS[0]!).build()
}
