import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

let mockPathname = '/'
const mockBack = vi.fn()

vi.mock('@/lib/next-navigation-shim', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ back: mockBack, push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('react-intl', () => ({
  useIntl: () => ({
    locale: 'en-US',
    formatMessage: ({ id }: { id: string }) => id,
  }),
}))

vi.mock('@/contexts/page-transition-context', () => ({
  usePageTransition: () => ({
    pendingHref: null,
    setPendingHref: vi.fn(),
    navigationError: null,
    setNavigationError: vi.fn(),
    navigate: vi.fn(),
    getCachedBusiness: () => null,
    setCachedBusiness: vi.fn(),
    setCachedBusinesses: vi.fn(),
    clearCachedBusiness: vi.fn(),
  }),
}))

vi.mock('./HubRoot', () => ({ HubRoot: () => <div data-testid="hub-root" /> }))
vi.mock('./BusinessRoot', () => ({ BusinessRoot: () => <div data-testid="business-root" /> }))
vi.mock('@/components/providers/ProvidersDrilldown', () => ({
  ProvidersDrilldown: () => <div data-testid="providers" />,
}))
vi.mock('@/components/team/TeamDrilldown', () => ({
  TeamDrilldown: () => <div data-testid="team" />,
}))
vi.mock('@/components/providers/ProviderDetailClient', () => ({
  ProviderDetailClient: () => <div data-testid="provider-detail" />,
}))
vi.mock('@/components/account/AccountPage', () => ({
  AccountPage: () => <div data-testid="account" />,
}))

import { LayerStack } from './LayerStack'

beforeEach(() => {
  mockBack.mockClear()
  sessionStorage.clear()
  mockPathname = '/'
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: false,
    media: q,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia
})

describe('LayerStack', () => {
  it('renders only HubRoot at /', () => {
    mockPathname = '/'
    render(<LayerStack />)
    expect(screen.getByTestId('hub-root')).toBeTruthy()
    expect(screen.queryByTestId('business-root')).toBeNull()
    expect(screen.queryByTestId('account')).toBeNull()
  })

  it('renders [hub, business, providers] at /<biz>/providers', () => {
    mockPathname = '/abc/providers'
    render(<LayerStack />)
    expect(screen.getByTestId('hub-root')).toBeTruthy()
    expect(screen.getByTestId('business-root')).toBeTruthy()
    expect(screen.getByTestId('providers')).toBeTruthy()
  })

  it('renders [hub, business, providers, provider-detail] at /<biz>/providers/<id>', () => {
    mockPathname = '/abc/providers/p1'
    render(<LayerStack />)
    expect(screen.getByTestId('hub-root')).toBeTruthy()
    expect(screen.getByTestId('business-root')).toBeTruthy()
    expect(screen.getByTestId('providers')).toBeTruthy()
    expect(screen.getByTestId('provider-detail')).toBeTruthy()
  })

  it('renders [hub, account] at /account with no stored underlay', () => {
    mockPathname = '/account'
    render(<LayerStack />)
    expect(screen.getByTestId('hub-root')).toBeTruthy()
    expect(screen.queryByTestId('business-root')).toBeNull()
    expect(screen.getByTestId('account')).toBeTruthy()
  })

  it('renders [hub, business, account] when /account underlay is a business path', () => {
    sessionStorage.setItem('layer.accountUnderlay', '/abc/sales')
    mockPathname = '/account'
    render(<LayerStack />)
    expect(screen.getByTestId('hub-root')).toBeTruthy()
    expect(screen.getByTestId('business-root')).toBeTruthy()
    expect(screen.getByTestId('account')).toBeTruthy()
  })

  it('Escape calls router.back on the top layer', () => {
    mockPathname = '/abc/providers'
    render(<LayerStack />)
    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' })
    })
    expect(mockBack).toHaveBeenCalledTimes(1)
  })

  it('does not call router.back for non-Escape keys', () => {
    mockPathname = '/abc/providers'
    render(<LayerStack />)
    act(() => {
      fireEvent.keyDown(document, { key: 'Enter' })
      fireEvent.keyDown(document, { key: 'a' })
    })
    expect(mockBack).not.toHaveBeenCalled()
  })

  it('honors prefers-reduced-motion (still renders content)', () => {
    window.matchMedia = vi.fn().mockImplementation((q: string) => ({
      matches: q === '(prefers-reduced-motion: reduce)',
      media: q,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia
    mockPathname = '/abc/providers'
    render(<LayerStack />)
    expect(screen.getByTestId('providers')).toBeTruthy()
  })
})
