import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { IonApp, IonItem } from '@ionic/react'
import type { ReactNode } from 'react'
import { SwipeRow, type SwipeAction } from './SwipeRow'

const wrapper = ({ children }: { children: ReactNode }) => (
  <IonApp>{children}</IonApp>
)

const makeAction = (over: Partial<SwipeAction> = {}): SwipeAction => ({
  id: 'edit',
  icon: <span data-testid="edit-icon" />,
  label: 'Edit',
  variant: 'primary',
  onClick: vi.fn(),
  ...over,
})

describe('SwipeRow', () => {
  it('renders children when actions is empty', () => {
    render(
      <SwipeRow actions={[]}>
        <IonItem>row body</IonItem>
      </SwipeRow>,
      { wrapper },
    )
    expect(screen.getByText('row body')).toBeDefined()
    expect(document.querySelector('ion-item-options')).toBeNull()
  })

  it('renders one option per action in source order with aria-label and variant class', () => {
    const actions: SwipeAction[] = [
      makeAction({ id: 'a', label: 'Inventory', variant: 'primary' }),
      makeAction({ id: 'b', label: 'Print', variant: 'warning' }),
      makeAction({ id: 'c', label: 'Hide', variant: 'neutral' }),
    ]
    render(
      <SwipeRow actions={actions}>
        <IonItem>row body</IonItem>
      </SwipeRow>,
      { wrapper },
    )
    const options = document.querySelectorAll('ion-item-option')
    expect(options.length).toBe(3)
    expect(options[0].className).toContain('swipe-row__option--primary')
    expect(options[1].className).toContain('swipe-row__option--warning')
    expect(options[2].className).toContain('swipe-row__option--neutral')
    expect(options[0].querySelector('[aria-label="Inventory"]')).not.toBeNull()
    expect(options[1].querySelector('[aria-label="Print"]')).not.toBeNull()
    expect(options[2].querySelector('[aria-label="Hide"]')).not.toBeNull()
  })

  it('sets --swipe-idx 0,1,2 in source order', () => {
    const actions: SwipeAction[] = [
      makeAction({ id: 'a' }),
      makeAction({ id: 'b' }),
      makeAction({ id: 'c' }),
    ]
    render(
      <SwipeRow actions={actions}>
        <IonItem>row body</IonItem>
      </SwipeRow>,
      { wrapper },
    )
    const options = document.querySelectorAll<HTMLElement>('ion-item-option')
    expect(options[0].style.getPropertyValue('--swipe-idx')).toBe('0')
    expect(options[1].style.getPropertyValue('--swipe-idx')).toBe('1')
    expect(options[2].style.getPropertyValue('--swipe-idx')).toBe('2')
  })

  it('caps at 3 actions and warns in dev when a 4th is passed', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const actions: SwipeAction[] = [
      makeAction({ id: 'a' }),
      makeAction({ id: 'b' }),
      makeAction({ id: 'c' }),
      makeAction({ id: 'd' }),
    ]
    render(
      <SwipeRow actions={actions}>
        <IonItem>row body</IonItem>
      </SwipeRow>,
      { wrapper },
    )
    expect(document.querySelectorAll('ion-item-option').length).toBe(3)
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('SwipeRow supports at most 3 actions'),
    )
    warn.mockRestore()
  })

  it('invokes onClick when an option is clicked', () => {
    const onClick = vi.fn()
    render(
      <SwipeRow actions={[makeAction({ id: 'a', onClick })]}>
        <IonItem>row body</IonItem>
      </SwipeRow>,
      { wrapper },
    )
    const option = document.querySelector('ion-item-option') as HTMLElement
    option.click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('does not invoke onClick when the action is disabled', () => {
    const onClick = vi.fn()
    render(
      <SwipeRow actions={[makeAction({ id: 'a', disabled: true, onClick })]}>
        <IonItem>row body</IonItem>
      </SwipeRow>,
      { wrapper },
    )
    const option = document.querySelector('ion-item-option') as HTMLElement
    option.click()
    expect(onClick).not.toHaveBeenCalled()
  })
})
