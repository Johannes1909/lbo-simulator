import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { SliderControl } from '../SliderControl'
import { paramRanges, type ParamRange } from '../paramRanges'

function Harness({
  range,
  initial,
  formatValue = (v: number) => v.toFixed(2),
}: {
  range: ParamRange
  initial: number
  formatValue?: (v: number) => string
}) {
  const [value, setValue] = useState(initial)
  return (
    <SliderControl label="Test field" value={value} range={range} onChange={setValue} formatValue={formatValue} />
  )
}

describe('SliderControl — typed input', () => {
  it('clamps a typed value above the typed maximum to the maximum', async () => {
    const user = userEvent.setup()
    render(<Harness range={paramRanges.entryMultiple} initial={9} />)
    const field = screen.getByRole('textbox', { name: 'Test field' })
    await user.click(field)
    await user.keyboard('999')
    await user.tab()
    expect(field).toHaveValue(paramRanges.entryMultiple.typedMax.toFixed(2))
  })

  it('clamps a typed value below the typed minimum to the minimum', async () => {
    const user = userEvent.setup()
    render(<Harness range={paramRanges.entryMultiple} initial={9} />)
    const field = screen.getByRole('textbox', { name: 'Test field' })
    await user.click(field)
    await user.keyboard('-5')
    await user.tab()
    expect(field).toHaveValue(paramRanges.entryMultiple.typedMin.toFixed(2))
  })

  it('shows a transient hint when a typed value is clamped', async () => {
    const user = userEvent.setup()
    render(<Harness range={paramRanges.entryMultiple} initial={9} />)
    const field = screen.getByRole('textbox', { name: 'Test field' })
    await user.click(field)
    await user.keyboard('999')
    await user.tab()
    expect(screen.getByText(/Adjusted to/)).toBeInTheDocument()
  })

  it('reverts to the previous value on invalid input, without throwing or showing an error', async () => {
    const user = userEvent.setup()
    render(<Harness range={paramRanges.entryMultiple} initial={9} />)
    const field = screen.getByRole('textbox', { name: 'Test field' })
    await user.click(field)
    await user.keyboard('abc')
    await user.tab()
    expect(field).toHaveValue((9).toFixed(2))
    expect(screen.queryByText(/Adjusted to/)).not.toBeInTheDocument()
  })

  it('reverts to the previous value when the field is left empty', async () => {
    const user = userEvent.setup()
    render(<Harness range={paramRanges.entryMultiple} initial={9} />)
    const field = screen.getByRole('textbox', { name: 'Test field' })
    await user.click(field)
    await user.keyboard('{Backspace>10/}')
    await user.tab()
    expect(field).toHaveValue((9).toFixed(2))
  })

  it('accepts a comma as the decimal separator', async () => {
    const user = userEvent.setup()
    render(<Harness range={paramRanges.entryMultiple} initial={9} />)
    const field = screen.getByRole('textbox', { name: 'Test field' })
    await user.click(field)
    await user.keyboard('7,5')
    await user.tab()
    expect(field).toHaveValue((7.5).toFixed(2))
  })

  it('discards an in-progress edit on Escape and restores the previous value', async () => {
    const user = userEvent.setup()
    render(<Harness range={paramRanges.entryMultiple} initial={9} />)
    const field = screen.getByRole('textbox', { name: 'Test field' })
    await user.click(field)
    await user.keyboard('2')
    await user.keyboard('{Escape}')
    expect(field).toHaveValue((9).toFixed(2))
  })

  it('keeps a within-range typed value and the slider in sync', async () => {
    const user = userEvent.setup()
    render(<Harness range={paramRanges.debtMultiple} initial={4} />)
    const field = screen.getByRole('textbox', { name: 'Test field' })
    const slider = screen.getByRole('slider')
    await user.click(field)
    await user.keyboard('5.5')
    await user.tab()
    expect(field).toHaveValue((5.5).toFixed(2))
    expect(slider).toHaveValue('5.5')
  })

  it('lets a typed value exceed the slider drag range while the slider pins at its own bound', async () => {
    const user = userEvent.setup()
    render(<Harness range={paramRanges.debtMultiple} initial={4} />)
    const field = screen.getByRole('textbox', { name: 'Test field' })
    const slider = screen.getByRole('slider')
    expect(paramRanges.debtMultiple.sliderMax).toBeLessThan(paramRanges.debtMultiple.typedMax)

    await user.click(field)
    await user.keyboard('10')
    await user.tab()

    expect(field).toHaveValue((10).toFixed(2))
    expect(slider).toHaveValue(String(paramRanges.debtMultiple.sliderMax))
  })

  it('rounds the hold period to a whole number even when typed with a decimal', async () => {
    const user = userEvent.setup()
    render(<Harness range={paramRanges.holdPeriod} initial={5} formatValue={(v) => String(v)} />)
    const field = screen.getByRole('textbox', { name: 'Test field' })
    await user.click(field)
    await user.keyboard('7.6')
    await user.tab()
    expect(field).toHaveValue('8')
  })

  it('increments by one step on ArrowUp and by ten steps on Shift+ArrowUp', async () => {
    const user = userEvent.setup()
    render(<Harness range={paramRanges.entryMultiple} initial={9} />)
    const field = screen.getByRole('textbox', { name: 'Test field' })
    await user.click(field)
    await user.keyboard('{ArrowUp}')
    expect(field).toHaveValue((9 + paramRanges.entryMultiple.step).toFixed(2))
    await user.keyboard('{Shift>}{ArrowUp}{/Shift}')
    expect(field).toHaveValue((9 + paramRanges.entryMultiple.step + paramRanges.entryMultiple.step * 10).toFixed(2))
  })
})
