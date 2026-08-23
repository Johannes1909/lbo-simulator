import { buildReferenceCaseInputs } from './presets'
import type { DealInputs } from './types'

/**
 * The app's startup state (no URL, no preset chosen yet) is Reference Case
 * 1 — a thin wrapper around the same builder the reference-case test uses,
 * not a second hand-typed copy. See presets.ts.
 */
export function buildDefaultDealInputs(): DealInputs {
  return buildReferenceCaseInputs()
}
