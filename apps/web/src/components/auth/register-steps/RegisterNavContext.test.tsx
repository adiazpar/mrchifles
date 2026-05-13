import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { RegisterNavProvider, useRegisterNav } from './RegisterNavContext'

const wrapper = ({ children }: { children: ReactNode }) => (
  <RegisterNavProvider>{children}</RegisterNavProvider>
)

describe('RegisterNavContext', () => {
  it('starts on the name step with empty field values', () => {
    const { result } = renderHook(() => useRegisterNav(), { wrapper })
    expect(result.current.current).toBe('name')
    expect(result.current.name).toBe('')
    expect(result.current.email).toBe('')
    expect(result.current.password).toBe('')
  })

  it('goTo moves between steps without losing field values', () => {
    const { result } = renderHook(() => useRegisterNav(), { wrapper })

    act(() => result.current.setName('Alex'))
    act(() => result.current.goTo('email'))
    expect(result.current.current).toBe('email')
    expect(result.current.name).toBe('Alex')

    act(() => result.current.setEmail('a@b.co'))
    act(() => result.current.goTo('password'))
    expect(result.current.email).toBe('a@b.co')

    act(() => result.current.goTo('name'))
    expect(result.current.current).toBe('name')
    expect(result.current.name).toBe('Alex')
    expect(result.current.email).toBe('a@b.co')
  })

  it('useRegisterNav throws when used outside the provider', () => {
    const orig = console.error
    console.error = () => {}
    try {
      expect(() => renderHook(() => useRegisterNav())).toThrow()
    } finally {
      console.error = orig
    }
  })
})
