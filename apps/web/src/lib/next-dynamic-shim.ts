// Shim for `next/dynamic`. Maps to React.lazy + Suspense.
//
// next/dynamic supports:
//   dynamic(() => import('./Foo'), { ssr: false, loading: () => <Spinner/> })
//
// In Vite there's no SSR, so `ssr: false` is the default behavior. We
// honor `loading` via a Suspense fallback wrapper. The factory may
// resolve to a default export or a named export — `next/dynamic` accepts
// both via `.then(mod => mod.Foo)`. React.lazy ONLY accepts a factory
// returning `{ default: Component }`. We adapt by treating the resolved
// value: if it's already `{ default: ... }`, pass through; otherwise
// wrap as `{ default: resolved }`.

import { lazy, Suspense, createElement, type ComponentType } from 'react'

interface DynamicOptions {
  ssr?: boolean
  loading?: () => React.ReactNode
}

type Loader<P> = () => Promise<ComponentType<P> | { default: ComponentType<P> }>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function dynamic<P extends Record<string, any> = Record<string, unknown>>(
  loader: Loader<P>,
  options: DynamicOptions = {},
): ComponentType<P> {
  const Lazy = lazy(async () => {
    const mod = await loader()
    if (mod && typeof mod === 'object' && 'default' in mod) {
      return mod as { default: ComponentType<P> }
    }
    return { default: mod as ComponentType<P> }
  }) as unknown as ComponentType<P>
  const fallback = options.loading ? options.loading() : null
  const Wrapped = (props: P) =>
    createElement(
      Suspense,
      { fallback },
      createElement(Lazy, props),
    )
  return Wrapped as ComponentType<P>
}
