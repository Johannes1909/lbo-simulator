import type { EquityCashFlow, ValueBridge } from './types'

export interface ValueBridgeParams {
  entryEquity: number
  exitEquity: number
  entryEbitda: number
  exitEbitda: number
  entryMultiple: number
  exitMultiple: number
  /** All equity cash flows strictly between entry and exit (dividends, recaps). Empty in Milestone 1. */
  interimCashFlows: EquityCashFlow[]
}

/**
 * Decomposes the equity value change into EBITDA growth, multiple change,
 * and everything else (paydown of debt, transaction costs, working-capital
 * and capex effects) bucketed as "deleveraging & other". That bucket is
 * computed as the residual — exit minus entry minus the two priced effects
 * minus interim distributions — so the bridge reconciles to the equity
 * difference exactly, by construction, rather than by chance.
 */
export function computeValueBridge(params: ValueBridgeParams): ValueBridge {
  const {
    entryEquity,
    exitEquity,
    entryEbitda,
    exitEbitda,
    entryMultiple,
    exitMultiple,
    interimCashFlows,
  } = params

  const ebitdaGrowthEffect = (exitEbitda - entryEbitda) * entryMultiple
  const multipleEffect = exitEbitda * (exitMultiple - entryMultiple)
  const interimDistributionsEffect = interimCashFlows.reduce((sum, cf) => sum + cf.amount, 0)

  const deleveragingEffect =
    exitEquity - entryEquity - ebitdaGrowthEffect - multipleEffect - interimDistributionsEffect

  const reconciledTotal =
    entryEquity +
    ebitdaGrowthEffect +
    multipleEffect +
    deleveragingEffect +
    interimDistributionsEffect

  return {
    entryEquity,
    ebitdaGrowthEffect,
    multipleEffect,
    deleveragingEffect,
    interimDistributionsEffect,
    exitEquity,
    reconciledTotal,
  }
}
