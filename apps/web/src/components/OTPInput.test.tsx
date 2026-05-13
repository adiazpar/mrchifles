import { describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { render, fireEvent, screen } from '@testing-library/react'
import { OTPInput } from './OTPInput'

describe('OTPInput', () => {
  it('renders 6 input boxes by default', () => {
    render(<OTPInput value="" onChange={() => {}} autoFocus={false} />)
    expect(screen.getAllByRole('textbox')).toHaveLength(6)
  })

  it('renders a custom length', () => {
    render(<OTPInput value="" onChange={() => {}} length={4} autoFocus={false} />)
    expect(screen.getAllByRole('textbox')).toHaveLength(4)
  })

  it('calls onChange when typing a digit', () => {
    const onChange = vi.fn()
    render(<OTPInput value="" onChange={onChange} autoFocus={false} />)
    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: '5' } })
    expect(onChange).toHaveBeenCalledWith('5')
  })

  it('rejects non-numeric characters', () => {
    const onChange = vi.fn()
    render(<OTPInput value="" onChange={onChange} autoFocus={false} />)
    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'a' } })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('moves focus forward after typing a digit', () => {
    function Wrapper() {
      const [v, setV] = useState('')
      return <OTPInput value={v} onChange={setV} autoFocus={false} />
    }
    render(<Wrapper />)
    const boxes = screen.getAllByRole('textbox')
    fireEvent.change(boxes[0], { target: { value: '1' } })
    expect(document.activeElement).toBe(boxes[1])
  })

  it('moves focus backward on Backspace from empty cell', () => {
    function Wrapper() {
      const [v, setV] = useState('12')
      return <OTPInput value={v} onChange={setV} autoFocus={false} />
    }
    render(<Wrapper />)
    const boxes = screen.getAllByRole('textbox')
    boxes[2].focus()
    fireEvent.keyDown(boxes[2], { key: 'Backspace' })
    expect(document.activeElement).toBe(boxes[1])
  })

  it('fires onComplete when 6 digits are entered', () => {
    const onComplete = vi.fn()
    function Wrapper() {
      const [v, setV] = useState('')
      return <OTPInput value={v} onChange={setV} onComplete={onComplete} autoFocus={false} />
    }
    render(<Wrapper />)
    const boxes = screen.getAllByRole('textbox')
    '123456'.split('').forEach((d, i) => fireEvent.change(boxes[i], { target: { value: d } }))
    expect(onComplete).toHaveBeenCalledWith('123456')
  })

  it('accepts pasted code', () => {
    const onChange = vi.fn()
    render(<OTPInput value="" onChange={onChange} autoFocus={false} />)
    fireEvent.paste(screen.getAllByRole('textbox')[0], {
      clipboardData: { getData: () => '987654' },
    } as unknown as ClipboardEvent)
    expect(onChange).toHaveBeenCalledWith('987654')
  })

  it('ignores non-numeric paste content (after strip)', () => {
    const onChange = vi.fn()
    render(<OTPInput value="" onChange={onChange} autoFocus={false} />)
    fireEvent.paste(screen.getAllByRole('textbox')[0], {
      clipboardData: { getData: () => 'abc' },
    } as unknown as ClipboardEvent)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('disables all inputs when disabled prop is true', () => {
    render(<OTPInput value="" onChange={() => {}} disabled autoFocus={false} />)
    screen.getAllByRole('textbox').forEach(input => {
      expect(input).toBeDisabled()
    })
  })

  it('renders an error state with aria-invalid', () => {
    render(<OTPInput value="" onChange={() => {}} error autoFocus={false} />)
    screen.getAllByRole('textbox').forEach(input => {
      expect(input).toHaveAttribute('aria-invalid', 'true')
    })
  })
})
