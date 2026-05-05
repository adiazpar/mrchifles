import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { useRef } from 'react'
import { RouteOverlay } from './RouteOverlay'

function Harness({
  isOpen,
  onPeelDismiss = vi.fn(),
}: { isOpen: boolean; onPeelDismiss?: () => void }) {
  const underlayRef = useRef<HTMLDivElement>(null)
  return (
    <>
      <button data-testid="trigger">trigger</button>
      <div ref={underlayRef} data-testid="underlay">underlay</div>
      <RouteOverlay
        isOpen={isOpen}
        onPeelDismiss={onPeelDismiss}
        underlayRef={underlayRef}
        ariaLabel="Test overlay"
      >
        <button data-testid="inside">inside content</button>
      </RouteOverlay>
    </>
  )
}

describe('RouteOverlay', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia
  })

  it('renders nothing when closed', () => {
    render(<Harness isOpen={false} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders with role=dialog and aria-modal when open', () => {
    render(<Harness isOpen={true} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.getAttribute('aria-label')).toBe('Test overlay')
  })

  it('renders children when open', () => {
    render(<Harness isOpen={true} />)
    expect(screen.getByTestId('inside')).toBeTruthy()
  })

  it('calls onPeelDismiss on Escape key', () => {
    const onPeelDismiss = vi.fn()
    render(<Harness isOpen={true} onPeelDismiss={onPeelDismiss} />)
    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' })
    })
    expect(onPeelDismiss).toHaveBeenCalledTimes(1)
  })

  it('does not call onPeelDismiss for other keys', () => {
    const onPeelDismiss = vi.fn()
    render(<Harness isOpen={true} onPeelDismiss={onPeelDismiss} />)
    act(() => {
      fireEvent.keyDown(document, { key: 'Enter' })
      fireEvent.keyDown(document, { key: 'a' })
    })
    expect(onPeelDismiss).not.toHaveBeenCalled()
  })

  it('returns focus to the previously focused element on close', async () => {
    const onPeelDismiss = vi.fn()
    const { rerender } = render(<Harness isOpen={false} onPeelDismiss={onPeelDismiss} />)
    const trigger = screen.getByTestId('trigger') as HTMLButtonElement
    trigger.focus()
    expect(document.activeElement).toBe(trigger)

    rerender(<Harness isOpen={true} onPeelDismiss={onPeelDismiss} />)

    rerender(<Harness isOpen={false} onPeelDismiss={onPeelDismiss} />)
    expect(document.activeElement).toBe(trigger)
  })

  it('honors prefers-reduced-motion (no transform animation, escape still works)', () => {
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia

    const onPeelDismiss = vi.fn()
    render(<Harness isOpen={true} onPeelDismiss={onPeelDismiss} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog.style.transform).toBe('')
    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' })
    })
    expect(onPeelDismiss).toHaveBeenCalled()
  })
})
