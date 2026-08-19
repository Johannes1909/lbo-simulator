import { useMemo } from 'react'
import { runModel } from '../model/engine'
import { useDealStore } from './store'

/** Recomputes the model whenever inputs change. The engine is cheap (a handful of annual loops), so no extra memoization layer is needed beyond this. */
export function useModelOutput() {
  const inputs = useDealStore((s) => s.inputs)
  return useMemo(() => runModel(inputs), [inputs])
}
