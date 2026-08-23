import type {
  CovenantCheck,
  CovenantMetricKey,
  CovenantSettings,
  CreditMetricsYear,
  DealInputs,
  DebtTranche,
  DebtYear,
  IncomeYear,
  OperatingYear,
} from './types'
import { enterpriseValue } from './sourcesUses'

export const DEFAULT_COVENANT_SETTINGS: CovenantSettings = {
  netDebtToEbitda: { enabled: true, threshold: 6.0 },
  seniorDebtToEbitda: { enabled: false, threshold: 4.0 },
  interestCoverage: { enabled: true, threshold: 2.0 },
  debtServiceCoverage: { enabled: true, threshold: 1.1 },
}

const METRIC_LABELS: Record<CovenantMetricKey, string> = {
  netDebtToEbitda: 'Net debt / EBITDA',
  seniorDebtToEbitda: 'Senior debt / EBITDA',
  interestCoverage: 'Interest coverage',
  debtServiceCoverage: 'Debt service coverage',
}

/** 'max' = value must stay at or below the threshold (leverage); 'min' = value must stay at or above it (coverage). */
const METRIC_DIRECTION: Record<CovenantMetricKey, 'max' | 'min'> = {
  netDebtToEbitda: 'max',
  seniorDebtToEbitda: 'max',
  interestCoverage: 'min',
  debtServiceCoverage: 'min',
}

const formatMultiple = (v: number) => (Number.isFinite(v) ? `${v.toFixed(2)}×` : '—')

function buildCovenantCheck(metric: CovenantMetricKey, value: number, threshold: number): CovenantCheck {
  const direction = METRIC_DIRECTION[metric]
  const label = METRIC_LABELS[metric]

  if (value === Infinity && direction === 'min') {
    // No debt service due at all (e.g. zero cash interest) — unambiguously safe.
    return {
      metric,
      value,
      threshold,
      headroomPct: Infinity,
      breached: false,
      message: `${label} is effectively unlimited (no debt service due) — well within the limit of ${formatMultiple(threshold)}.`,
    }
  }

  const headroomPct =
    direction === 'max' ? ((threshold - value) / threshold) * 100 : ((value - threshold) / threshold) * 100
  const breached = headroomPct < 0
  const relation = direction === 'max' ? (breached ? 'above' : 'below') : breached ? 'below' : 'above'
  const message = `${label} ${formatMultiple(value)} is ${Math.abs(headroomPct).toFixed(0)}% ${relation} the limit of ${formatMultiple(threshold)}.`

  return { metric, value, threshold, headroomPct, breached, message }
}

/**
 * "Senior" here is a security classification, not the waterfall rank — a
 * Term Loan A (rank 1) and a Term Loan B (rank 2) are both senior secured
 * debt, they just repay in a different order relative to each other.
 * Defaults by tranche type; a tranche can override it explicitly.
 */
function isSeniorDebt(tranche: DebtTranche): boolean {
  if (tranche.isSeniorDebt !== undefined) return tranche.isSeniorDebt
  const type = tranche.trancheType ?? 'termLoan'
  return type === 'termLoan' || type === 'revolver'
}

function seniorDebt(debtYear: DebtYear, tranches: DebtTranche[]): number {
  const seniorById = new Map(tranches.map((t) => [t.id, isSeniorDebt(t)]))
  return debtYear.tranches.reduce((sum, ty) => {
    return seniorById.get(ty.trancheId) ? sum + ty.closingBalance : sum
  }, 0)
}

export function computeCreditMetrics(
  inputs: DealInputs,
  operatingYears: OperatingYear[],
  debtYears: DebtYear[],
  incomeYears: IncomeYear[],
): CreditMetricsYear[] {
  const settings = inputs.covenants ?? DEFAULT_COVENANT_SETTINGS
  const entryEv = enterpriseValue(inputs)

  return debtYears.map((dy, i) => {
    const op = operatingYears[i]!
    const income = incomeYears[i]!
    const ebitda = op.ebitda

    const fcfBeforeDebtService =
      op.ebitda - income.taxes - dy.totalCashInterest - dy.totalCommitmentFees - op.capex - op.workingCapitalChange - op.oneOffCosts

    const netDebtToEbitda = ebitda !== 0 ? dy.netDebtClosing / ebitda : NaN
    const seniorDebtToEbitda = ebitda !== 0 ? seniorDebt(dy, inputs.financing.tranches) / ebitda : NaN
    const interestCoverage = dy.totalCashInterest !== 0 ? ebitda / dy.totalCashInterest : Infinity
    const debtServiceDue = dy.totalCashInterest + dy.totalScheduledAmortization
    const debtServiceCoverage = debtServiceDue !== 0 ? fcfBeforeDebtService / debtServiceDue : Infinity
    const freeCashFlowYield = entryEv !== 0 ? (fcfBeforeDebtService / entryEv) * 100 : NaN

    const values: Record<CovenantMetricKey, number> = {
      netDebtToEbitda,
      seniorDebtToEbitda,
      interestCoverage,
      debtServiceCoverage,
    }

    const covenantChecks: CovenantCheck[] = (Object.keys(values) as CovenantMetricKey[])
      .filter((key) => settings[key].enabled && !Number.isNaN(values[key]))
      .map((key) => buildCovenantCheck(key, values[key], settings[key].threshold))

    return {
      year: dy.year,
      netDebtToEbitda,
      seniorDebtToEbitda,
      interestCoverage,
      debtServiceCoverage,
      freeCashFlowYield,
      covenantChecks,
    }
  })
}
