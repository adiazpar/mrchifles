import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCart } from './useCart'
import type { Product } from '@/types'

const productA = { id: 'p1', name: 'Apple', price: 1.5 } as unknown as Product
const productB = { id: 'p2', name: 'Bread', price: 3.0 } as unknown as Product

beforeEach(() => {
  if (typeof sessionStorage !== 'undefined') sessionStorage.clear()
})

describe('useCart', () => {
  it('starts empty', () => {
    const { result } = renderHook(() => useCart('biz_1'))
    expect(result.current.lines).toEqual([])
    expect(result.current.total).toBe(0)
  })

  it('addLine adds a new line at qty 1', () => {
    const { result } = renderHook(() => useCart('biz_1'))
    act(() => result.current.addLine(productA))
    expect(result.current.lines).toHaveLength(1)
    expect(result.current.lines[0].productId).toBe('p1')
    expect(result.current.lines[0].quantity).toBe(1)
    expect(result.current.total).toBeCloseTo(1.5)
  })

  it('addLine increments existing line', () => {
    const { result } = renderHook(() => useCart('biz_1'))
    act(() => result.current.addLine(productA))
    act(() => result.current.addLine(productA))
    expect(result.current.lines).toHaveLength(1)
    expect(result.current.lines[0].quantity).toBe(2)
    expect(result.current.total).toBeCloseTo(3.0)
  })

  it('addLine accepts custom quantity', () => {
    const { result } = renderHook(() => useCart('biz_1'))
    act(() => result.current.addLine(productA, 3))
    expect(result.current.lines[0].quantity).toBe(3)
  })

  it('updateQty replaces quantity', () => {
    const { result } = renderHook(() => useCart('biz_1'))
    act(() => result.current.addLine(productA))
    act(() => result.current.updateQty('p1', 5))
    expect(result.current.lines[0].quantity).toBe(5)
  })

  it('updateQty to 0 removes the line', () => {
    const { result } = renderHook(() => useCart('biz_1'))
    act(() => result.current.addLine(productA))
    act(() => result.current.updateQty('p1', 0))
    expect(result.current.lines).toEqual([])
  })

  it('removeLine drops the matching line', () => {
    const { result } = renderHook(() => useCart('biz_1'))
    act(() => result.current.addLine(productA))
    act(() => result.current.addLine(productB))
    act(() => result.current.removeLine('p1'))
    expect(result.current.lines).toHaveLength(1)
    expect(result.current.lines[0].productId).toBe('p2')
  })

  it('clear empties everything', () => {
    const { result } = renderHook(() => useCart('biz_1'))
    act(() => result.current.addLine(productA))
    act(() => result.current.addLine(productB))
    act(() => result.current.clear())
    expect(result.current.lines).toEqual([])
    expect(result.current.total).toBe(0)
  })

  it('persists across hook re-mounts (sessionStorage)', () => {
    const { result, unmount } = renderHook(() => useCart('biz_1'))
    act(() => result.current.addLine(productA, 4))
    unmount()
    const { result: result2 } = renderHook(() => useCart('biz_1'))
    expect(result2.current.lines).toHaveLength(1)
    expect(result2.current.lines[0].quantity).toBe(4)
  })

  it('separates carts by businessId', () => {
    const { result: a } = renderHook(() => useCart('biz_a'))
    act(() => a.current.addLine(productA))
    const { result: b } = renderHook(() => useCart('biz_b'))
    expect(b.current.lines).toEqual([])
  })

  it('total reflects current lines via cart-time unitPrice snapshots', () => {
    const { result } = renderHook(() => useCart('biz_1'))
    act(() => result.current.addLine(productA, 2))   // 2 * 1.5 = 3
    act(() => result.current.addLine(productB, 1))   // 1 * 3.0 = 3
    expect(result.current.total).toBeCloseTo(6.0)
  })
})
