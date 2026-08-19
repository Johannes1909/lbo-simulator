/**
 * Single source of truth for every slider + typed-number field on the
 * calculator: the slider's own drag range (comfortable, everyday values),
 * the wider range a typed value may reach (for stress-testing extremes),
 * and the step used for both slider dragging and arrow-key nudges. Slider,
 * text field and clamping all read from here so they can never drift apart
 * — a new or changed parameter is one entry.
 */
export interface ParamRange {
  sliderMin: number
  sliderMax: number
  typedMin: number
  typedMax: number
  step: number
  /** Value is rounded to the nearest whole number, from any input source. */
  integer?: boolean
}

export const paramRanges = {
  entryMultiple: { sliderMin: 4, sliderMax: 14, typedMin: 1, typedMax: 30, step: 0.25 },
  ltmEbitda: { sliderMin: 5, sliderMax: 500, typedMin: 0.1, typedMax: 50000, step: 0.1 },
  // 12x EBITDA is far beyond anything a lender would ever finance — typed-only, on purpose: this is where the model is meant to be pushed until it breaks.
  debtMultiple: { sliderMin: 0, sliderMax: 7, typedMin: 0, typedMax: 12, step: 0.05 },
  interestRate: { sliderMin: 0, sliderMax: 15, typedMin: 0, typedMax: 40, step: 0.05 },
  scheduledAmortization: { sliderMin: 0, sliderMax: 20, typedMin: 0, typedMax: 100, step: 0.5 },
  // Hard-capped at 100: sweeping more than the entire free cash flow isn't a stress case, it's a contradiction.
  cashSweepParticipation: { sliderMin: 0, sliderMax: 100, typedMin: 0, typedMax: 100, step: 5 },
  revenueGrowth: { sliderMin: -15, sliderMax: 25, typedMin: -50, typedMax: 100, step: 0.25 },
  // Margin stops short of 100: a company with no cost base at all isn't a business, it's a modelling error.
  ebitdaMargin: { sliderMin: 5, sliderMax: 50, typedMin: 0.1, typedMax: 95, step: 0.25 },
  daPctRevenue: { sliderMin: 0, sliderMax: 20, typedMin: 0, typedMax: 60, step: 0.1 },
  capexPctRevenue: { sliderMin: 0, sliderMax: 25, typedMin: 0, typedMax: 80, step: 0.1 },
  workingCapitalPct: { sliderMin: 0, sliderMax: 40, typedMin: 0, typedMax: 100, step: 0.5 },
  taxRate: { sliderMin: 0, sliderMax: 40, typedMin: 0, typedMax: 60, step: 0.5 },
  holdPeriod: { sliderMin: 1, sliderMax: 10, typedMin: 1, typedMax: 30, step: 1, integer: true },
  exitMultiple: { sliderMin: 4, sliderMax: 14, typedMin: 1, typedMax: 30, step: 0.25 },
} as const satisfies Record<string, ParamRange>

export type ParamKey = keyof typeof paramRanges
