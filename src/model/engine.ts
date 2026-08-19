import { computeValueBridge } from './analytics'
import { computeDebtAndIncomeSchedule } from './debt'
import { computeOperatingPlan } from './operating'
import { computeIRR, computeMoneyMultiple } from './returns'
import { entryEbitda, computeSourcesUses } from './sourcesUses'
import type { CreditMetricsYear, DealInputs, EquityCashFlow, ModelOutput } from './types'

export function runModel(inputs: DealInputs): ModelOutput {
  const warnings: string[] = []

  const sourcesUses = computeSourcesUses(inputs)
  if (Math.abs(sourcesUses.imbalance) > 0.01) {
    warnings.push(
      `Sources & Uses are out of balance by ${sourcesUses.imbalance.toFixed(2)} — check the fixed sponsor equity amount.`,
    )
  }

  const operatingYears = computeOperatingPlan(inputs)
  const { debtYears, incomeYears, warnings: debtWarnings } = computeDebtAndIncomeSchedule(
    inputs,
    operatingYears,
  )
  warnings.push(...debtWarnings)

  const creditMetrics: CreditMetricsYear[] = debtYears.map((dy, i) => {
    const ebitda = operatingYears[i]!.ebitda
    return {
      year: dy.year,
      netDebtToEbitda: ebitda !== 0 ? dy.netDebtClosing / ebitda : NaN,
      interestCoverage: dy.totalInterest !== 0 ? ebitda / dy.totalInterest : Infinity,
    }
  })

  const exitYear = inputs.exit.exitYear
  const exitOperating = operatingYears.find((y) => y.year === exitYear)
  const exitDebt = debtYears.find((y) => y.year === exitYear)
  if (!exitOperating || !exitDebt) {
    warnings.push(
      `Exit year ${exitYear} is outside the modeled hold period (1–${inputs.transaction.holdPeriodYears}) — no exit figures computed.`,
    )
  }

  const exitMultiple = inputs.exit.exitMultipleEqualsEntry
    ? inputs.transaction.entryMultiple
    : inputs.exit.exitMultiple

  const exitEnterpriseValue = exitOperating ? exitOperating.ebitda * exitMultiple : 0
  const exitCosts = exitEnterpriseValue * (inputs.exit.exitCostsPct / 100)
  const exitNetDebt = exitDebt ? exitDebt.netDebtClosing : 0
  const exitEquityValue = exitEnterpriseValue - exitNetDebt - exitCosts

  const sponsorEquity = sourcesUses.sourcesSponsorEquity
  let cashFlows: EquityCashFlow[] = []
  let irr: number | null = null
  let moneyMultiple: number | null = null

  if (sponsorEquity <= 0) {
    warnings.push(
      'Sponsor equity investment is zero or negative — IRR and money multiple are undefined for this case.',
    )
  } else {
    cashFlows = [
      { year: 0, amount: -sponsorEquity, label: 'Entry equity investment' },
      { year: exitYear, amount: exitEquityValue, label: 'Exit proceeds' },
    ]
    irr = computeIRR(cashFlows)
    moneyMultiple = computeMoneyMultiple(cashFlows)
    if (irr === null) {
      warnings.push('IRR could not be solved — no sign change in the equity cash flow series.')
    }
  }

  const valueBridge = computeValueBridge({
    entryEquity: sponsorEquity,
    exitEquity: exitEquityValue,
    entryEbitda: entryEbitda(inputs),
    exitEbitda: exitOperating ? exitOperating.ebitda : 0,
    entryMultiple: inputs.transaction.entryMultiple,
    exitMultiple,
    interimCashFlows: [],
  })

  return {
    sourcesUses,
    operatingYears,
    debtYears,
    incomeYears,
    creditMetrics,
    returns: {
      cashFlows,
      irr,
      moneyMultiple,
      exitEnterpriseValue,
      exitNetDebt,
      exitEquityValue,
      warnings: [],
    },
    valueBridge,
    warnings,
  }
}
