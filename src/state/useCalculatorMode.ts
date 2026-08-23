import { useState } from 'react'

export type CalculatorMode = 'essentials' | 'fullModel'

/** Display preference, not deal state — switching modes never touches the URL or the inputs. */
export function useCalculatorMode() {
  const [mode, setMode] = useState<CalculatorMode>('essentials')
  return { mode, setMode }
}
