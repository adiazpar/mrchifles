'use client'

import React, { Children, cloneElement, isValidElement } from 'react'

export interface StaggerProps {
  children: React.ReactNode
  /** Delay between each child in ms */
  delayMs?: number
  /** Maximum delay cap in ms */
  maxDelayMs?: number
  /** CSS class to apply to each child for the animation */
  className?: string
}

/**
 * Wraps children with staggered animation delays.
 * Each child gets an incrementing animation-delay based on its index.
 *
 * Usage:
 * ```tsx
 * <Stagger delayMs={80} maxDelayMs={300}>
 *   <Card>First</Card>
 *   <Card>Second</Card>
 * </Stagger>
 * ```
 */
export function Stagger({
  children,
  delayMs = 80,
  maxDelayMs = 300,
  className = 'stagger-item'
}: StaggerProps) {
  return (
    <>
      {Children.map(children, (child, index) => {
        if (!isValidElement(child)) return child

        const delay = Math.min(index * delayMs, maxDelayMs)
        const existingClassName = child.props.className || ''
        const existingStyle = child.props.style || {}

        return cloneElement(child, {
          className: `${existingClassName} ${className}`.trim(),
          style: {
            ...existingStyle,
            animationDelay: `${delay}ms`
          }
        })
      })}
    </>
  )
}
