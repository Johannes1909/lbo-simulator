import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { runModel } from '../../model/engine'
import { buildReferenceCaseInputs } from '../../model/presets'
import type { DealInputs } from '../../model/types'
import { useDealStore } from '../../state/store'
import { ResultBar } from '../ResultBar'

/**
 * Regression coverage for Befund 4 (2026-08-24 pre-deployment review): the
 * covenant status dot used to be `const hasCovenants = false`, hardcoded,
 * never connected to output.creditMetrics — it showed "No covenants
 * configured yet" even when covenants were active and breached. These
 * tests drive the real component with real (non-mocked) model output.
 */

function renderWithInputs(inputs: DealInputs) {
  useDealStore.setState({ inputs })
  const output = runModel(inputs)
  render(<ResultBar output={output} />)
}

describe('ResultBar — covenant status', () => {
  it('shows the "no covenants configured" state when every covenant is disabled', () => {
    const inputs = buildReferenceCaseInputs()
    inputs.covenants = {
      netDebtToEbitda: { enabled: false, threshold: 6.0 },
      seniorDebtToEbitda: { enabled: false, threshold: 4.0 },
      interestCoverage: { enabled: false, threshold: 2.0 },
      debtServiceCoverage: { enabled: false, threshold: 1.1 },
    }
    renderWithInputs(inputs)
    expect(screen.getByText('No covenants configured yet')).toBeInTheDocument()
  })

  it('shows the "no breach" state when covenants are enabled and comfortably met (Reference Case 1)', () => {
    renderWithInputs(buildReferenceCaseInputs())
    expect(screen.getByText('No covenant breach')).toBeInTheDocument()
  })

  it('shows which year and which metric breached when a covenant is actually broken', () => {
    const inputs = buildReferenceCaseInputs()
    // Push leverage far past any sane covenant threshold.
    inputs.financing.tranches[0]!.amount = { mode: 'absolute', value: 2000 }
    renderWithInputs(inputs)
    expect(screen.getByText(/Covenant breach — Year 1: Net debt \/ EBITDA/)).toBeInTheDocument()
  })
})
