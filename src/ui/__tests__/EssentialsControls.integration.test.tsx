import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { en } from '../../i18n/en'
import { runModel } from '../../model/engine'
import { buildEuropeanMidMarketInputs, buildReferenceCaseInputs } from '../../model/presets'
import { entryEbitda } from '../../model/sourcesUses'
import type { DealInputs } from '../../model/types'
import { useDealStore } from '../../state/store'
import { EssentialsControls } from '../EssentialsControls'

/**
 * These tests drive the real EssentialsControls component through the real
 * Zustand store, the same path a user's mouse does — not a hand-built
 * DealInputs object. Every other test in this repo constructs DealInputs
 * directly and checks the model's output, which proves the engine is
 * correct given correct inputs but never proves a slider actually produces
 * those inputs. That gap is why the "interest rate slider does nothing for
 * a floating-rate tranche" and "LTM EBITDA slider doesn't touch the
 * operating model's EBITDA" bugs shipped despite 80 passing tests.
 */

const t = en.controls

function loadInputs(inputs: DealInputs) {
  useDealStore.setState({ inputs })
}

function currentInputs(): DealInputs {
  return useDealStore.getState().inputs
}

function moveSlider(label: string) {
  const slider = screen.getByRole('slider', { name: label }) as HTMLInputElement
  const min = Number(slider.min)
  const max = Number(slider.max)
  const step = Number(slider.step) || 1
  const current = Number(slider.value)
  const up = current + step * 3
  const target = up <= max ? up : current - step * 3
  if (target < min || target > max || target === current) {
    throw new Error(`slider "${label}" range too narrow to move for this test (min=${min} max=${max} current=${current})`)
  }
  fireEvent.change(slider, { target: { value: String(target) } })
  return target
}

beforeEach(() => {
  loadInputs(buildReferenceCaseInputs())
})

describe('EssentialsControls — sliders reach the model (not hand-built DealInputs)', () => {
  it('interest rate slider changes cash interest expense for a fixed-rate tranche (Reference Case 1)', () => {
    render(<EssentialsControls />)
    const before = runModel(currentInputs())
    moveSlider(t.interestRate)
    const after = runModel(currentInputs())
    expect(after.debtYears[0]!.totalCashInterest).not.toBeCloseTo(before.debtYears[0]!.totalCashInterest, 5)
  })

  it('interest rate slider changes effective interest cost for a floating-rate tranche (European mid-market) — Befund 3', () => {
    loadInputs(buildEuropeanMidMarketInputs())
    render(<EssentialsControls />)
    const before = runModel(currentInputs())
    moveSlider(t.interestRate)
    const after = runModel(currentInputs())
    expect(after.debtYears[0]!.totalCashInterest).not.toBeCloseTo(before.debtYears[0]!.totalCashInterest, 5)
  })

  it('LTM EBITDA slider changes year-1 EBITDA in the operating model — Befund 2', () => {
    render(<EssentialsControls />)
    const before = runModel(currentInputs())
    moveSlider(t.ltmEbitda)
    const after = runModel(currentInputs())
    expect(after.operatingYears[0]!.ebitda).not.toBeCloseTo(before.operatingYears[0]!.ebitda, 5)
  })

  it('LTM EBITDA slider back-solves revenueYear0 to the chosen EBITDA and leaves the margin untouched — Befund 2', () => {
    render(<EssentialsControls />)
    const marginBefore = currentInputs().operating.ebitdaMarginPct
    const target = moveSlider(t.ltmEbitda)
    const after = currentInputs()
    expect(entryEbitda(after)).toBeCloseTo(target, 6)
    expect(after.operating.ebitdaMarginPct).toBe(marginBefore)
  })

  describe.each([
    ['Reference Case 1', buildReferenceCaseInputs],
    ['European mid-market', buildEuropeanMidMarketInputs],
  ])('every visible slider changes at least one model output — %s', (_name, buildPreset) => {
    const labels = [
      t.entryMultiple,
      t.ltmEbitda,
      t.debtMultiple,
      t.interestRate,
      t.amortizationPct,
      t.cashSweepPct,
      t.revenueGrowth,
      t.ebitdaMargin,
      t.holdPeriodYears,
    ]

    it.each(labels)('slider "%s" has an effect on the model output', (label) => {
      loadInputs(buildPreset())
      const { unmount } = render(<EssentialsControls />)
      const before = runModel(currentInputs())
      moveSlider(label)
      const after = runModel(currentInputs())
      expect(JSON.stringify(after)).not.toBe(JSON.stringify(before))
      unmount()
    })
  })
})
