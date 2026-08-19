import type { DealInputs, OperatingYear } from './types'

/**
 * Builds the operating plan for years 1..holdPeriodYears. Revenue growth and
 * margin are single flat assumptions in Milestone 1 (per-year override
 * tables arrive in Milestone 3). Working-capital cash outflow is modeled as
 * a % of the year-over-year revenue increase and is clamped at 0 — a
 * revenue decline does not release cash in this simplified mode.
 */
export function computeOperatingPlan(inputs: DealInputs): OperatingYear[] {
  const { operating } = inputs
  const years: OperatingYear[] = []

  let priorRevenue = operating.revenueYear0
  for (let year = 1; year <= inputs.transaction.holdPeriodYears; year++) {
    const revenue = priorRevenue * (1 + operating.revenueGrowthPct / 100)
    const ebitda = revenue * (operating.ebitdaMarginPct / 100)
    const da = revenue * (operating.daPctOfRevenue / 100)
    const ebit = ebitda - da
    const maintenanceCapex = revenue * (operating.maintenanceCapexPctOfRevenue / 100)
    const growthCapex = revenue * (operating.growthCapexPctOfRevenue / 100)
    const capex = maintenanceCapex + growthCapex
    const workingCapitalChange = Math.max(
      0,
      (operating.workingCapitalPctOfRevenueGrowth / 100) * (revenue - priorRevenue),
    )
    const oneOffCosts = operating.oneOffCostsByYear[year - 1] ?? 0

    years.push({
      year,
      revenue,
      ebitda,
      da,
      ebit,
      maintenanceCapex,
      growthCapex,
      capex,
      workingCapitalChange,
      oneOffCosts,
    })

    priorRevenue = revenue
  }

  return years
}
