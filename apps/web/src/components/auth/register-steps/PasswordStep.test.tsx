import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { IonApp } from '@ionic/react'
import { MemoryRouter } from 'react-router-dom'
import { useEffect, type ReactNode } from 'react'
import enUS from '../../../i18n/messages/en-US.json'
import { RegisterNavProvider, useRegisterNav } from './RegisterNavContext'
import { PasswordStep } from './PasswordStep'

// Mock the auth context. Each test overrides the `register` implementation
// as needed via vi.mocked(...).mockReturnValue(...).
vi.mock('@/contexts/auth-context', () => ({
  useAuth: vi.fn(() => ({ register: vi.fn() })),
}))

import { useAuth } from '@/contexts/auth-context'

function Seed({ name, email }: { name: string; email: string }) {
  const nav = useRegisterNav()
  if (nav.name !== name) nav.setName(name)
  if (nav.email !== email) nav.setEmail(email)
  if (nav.current !== 'password') nav.goTo('password')
  return null
}

// Captures the current wizard step so success-path tests can assert on the
// transition into the verify step instead of relying on playEntry().
function StepProbe({ onChange }: { onChange: (step: string) => void }) {
  const nav = useRegisterNav()
  useEffect(() => {
    onChange(nav.current)
  }, [nav.current, onChange])
  return null
}

const wrap = (node: ReactNode) => (
  <IntlProvider locale="en" messages={enUS as Record<string, string>}>
    <MemoryRouter>
      <IonApp>
        <RegisterNavProvider>
          <Seed name="Alex" email="a@b.co" />
          {node}
        </RegisterNavProvider>
      </IonApp>
    </MemoryRouter>
  </IntlProvider>
)

describe('PasswordStep', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({ register: vi.fn() } as never)
  })
  afterEach(() => vi.restoreAllMocks())

  it('renders the personalized title and helper', () => {
    render(wrap(<PasswordStep />))
    expect(screen.getByText(/Last thing, Alex/)).toBeDefined()
    expect(screen.getByText('Eight characters or more — anything goes.')).toBeDefined()
  })

  it('disables Create account until password is 8+ chars', () => {
    render(wrap(<PasswordStep />))
    const btn = () => screen.getByRole('button', { name: 'Create account' }) as HTMLButtonElement
    expect(btn().disabled).toBe(true)
    fireEvent.change(screen.getByLabelText(/password/i, { selector: 'input' }), { target: { value: 'short' } })
    expect(btn().disabled).toBe(true)
    fireEvent.change(screen.getByLabelText(/password/i, { selector: 'input' }), { target: { value: 'longenough' } })
    expect(btn().disabled).toBe(false)
  })

  it('calls register and advances to the verify step on success', async () => {
    const register = vi.fn().mockResolvedValue({ success: true })
    vi.mocked(useAuth).mockReturnValue({ register } as never)

    const steps: string[] = []
    render(
      wrap(
        <>
          <StepProbe onChange={(s) => steps.push(s)} />
          <PasswordStep />
        </>,
      ),
    )
    fireEvent.change(screen.getByLabelText(/password/i, { selector: 'input' }), { target: { value: 'longenough' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() => expect(register).toHaveBeenCalledWith('a@b.co', 'longenough', 'Alex'))
    await waitFor(() => expect(steps.at(-1)).toBe('verify'))
  })

  it('shows Edit email link on AUTH_EMAIL_TAKEN race', async () => {
    const register = vi.fn().mockResolvedValue({
      success: false,
      error: "That email's already in use.",
      messageCode: 'AUTH_EMAIL_TAKEN',
    })
    vi.mocked(useAuth).mockReturnValue({ register } as never)

    render(wrap(<PasswordStep />))
    fireEvent.change(screen.getByLabelText(/password/i, { selector: 'input' }), { target: { value: 'longenough' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() => {
      expect(screen.getByText(/That email was just claimed/i)).toBeDefined()
      expect(screen.getByRole('button', { name: 'Edit email' })).toBeDefined()
    })
  })
})
