import { describe, expect, it } from 'vitest'
import { buildDefaultDealInputs } from '../defaults'
import { runModel } from '../engine'
import { buildReferenceCaseInputs } from '../presets'

/**
 * Tests the app's actual startup path — buildDefaultDealInputs(), which
 * backs the store's initial state — not a separately hand-typed fixture.
 * If this ever fails while referenceCase1.test.ts passes, defaults.ts has
 * drifted from presets.ts and the app opens on the wrong numbers again.
 */
describe('app default startup state', () => {
  it('is exactly Reference Case 1', () => {
    expect(buildDefaultDealInputs()).toEqual(buildReferenceCaseInputs())
  })

  it('produces 20.20% IRR and 2.509x on the app opening with no input', () => {
    const result = runModel(buildDefaultDealInputs())
    expect(result.returns.irr).not.toBeNull()
    expect(result.returns.irr! * 100).toBeCloseTo(20.2, 1)
    expect(result.returns.moneyMultiple).toBeCloseTo(2.509, 2)
  })
})
