import { describe, it, expect } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { IonApp } from '@ionic/react'
import type { ReactNode } from 'react'
import { useConfirmActionSheet } from './useConfirmActionSheet'

const wrapper = ({ children }: { children: ReactNode }) => (
  <IonApp>{children}</IonApp>
)

describe('useConfirmActionSheet', () => {
  it('returns a confirm function and an actionSheet element', () => {
    const { result } = renderHook(() => useConfirmActionSheet(), { wrapper })
    expect(typeof result.current.confirm).toBe('function')
    expect(result.current.actionSheet).toBeDefined()
  })

  it('resolves true when destructive button is selected', async () => {
    const { result } = renderHook(() => useConfirmActionSheet(), { wrapper })
    let resolved: boolean | undefined
    await act(async () => {
      const promise = result.current.confirm({
        header: 'Delete?',
        destructiveLabel: 'Delete',
      })
      result.current._dispatchForTest?.('destructive')
      resolved = await promise
    })
    expect(resolved).toBe(true)
  })

  it('resolves false when cancel is selected', async () => {
    const { result } = renderHook(() => useConfirmActionSheet(), { wrapper })
    let resolved: boolean | undefined
    await act(async () => {
      const promise = result.current.confirm({
        header: 'Delete?',
        destructiveLabel: 'Delete',
      })
      result.current._dispatchForTest?.('cancel')
      resolved = await promise
    })
    expect(resolved).toBe(false)
  })
})
