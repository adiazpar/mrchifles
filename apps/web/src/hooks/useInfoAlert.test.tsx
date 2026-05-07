import { describe, it, expect } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { IonApp } from '@ionic/react'
import type { ReactNode } from 'react'
import { useInfoAlert } from './useInfoAlert'

const wrapper = ({ children }: { children: ReactNode }) => (
  <IonApp>{children}</IonApp>
)

describe('useInfoAlert', () => {
  it('returns a show function and an alert element', () => {
    const { result } = renderHook(() => useInfoAlert(), { wrapper })
    expect(typeof result.current.show).toBe('function')
    expect(result.current.alert).toBeDefined()
  })

  it('resolves when alert is dismissed', async () => {
    const { result } = renderHook(() => useInfoAlert(), { wrapper })
    let resolved = false
    await act(async () => {
      const promise = result.current.show({
        header: 'Heads up',
        message: 'Something happened',
      })
      result.current._dispatchForTest?.()
      await promise
      resolved = true
    })
    expect(resolved).toBe(true)
  })
})
