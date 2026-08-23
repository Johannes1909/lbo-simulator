import type { DealInputs, OperatingYear } from './types'

/**
 * Revenue growth is a single flat rate by default, or an individually
 * settable value per year (revenueGrowthMode 'perYear') — the one per-year
 * override brought forward from Milestone 3 ahead of schedule, specifically
 * so a downturn year can be modeled and the revolver/waterfall logic tested
 * against it. Any year not listed in revenueGrowthByYear falls back to the
 * flat rate. Margin, capex and working capital stay single flat assumptions
 * until Milestone 3's full per-year tables.
 */
export function resolveRevenueGrowthPct(inputs: DealInputs, year: number): number {
  const { operating } = inputs
  if (operating.revenueGrowthMode === 'perYear') {
    return operating.revenueGrowthByYear?.[year - 1] ?? operating.revenueGrowthPct
  }
  return operating.revenueGrowthPct
}

/**
 * Builds the operating plan for years 1..holdPeriodYears. Working-capital
 * cash outflow is modeled as a % of the year-over-year revenue increase and
 * is clamped at 0 — a revenue decline does not release cash in this
 * simplified mode.
 */
export function computeOperatingPlan(inputs: DealInputs): OperatingYear[] {
  const { operating } = inputs
  const years: OperatingYear[] = []

  let priorRevenue = operating.revenueYear0
  for (let year = 1; year <= inputs.transaction.holdPeriodYears; year++) {
    const growthPct = resolveRevenueGrowthPct(inputs, year)
    const revenue = priorRevenue * (1 + growthPct / 100)
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
