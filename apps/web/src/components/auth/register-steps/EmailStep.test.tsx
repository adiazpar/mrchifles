import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { IonApp } from '@ionic/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import enUS from '../../../i18n/messages/en-US.json'
import { RegisterNavProvider, useRegisterNav } from './RegisterNavContext'
import { EmailStep } from './EmailStep'

import * as apiClient from '../../../lib/api-client'

function ContextProbe({ onUpdate }: { onUpdate: (nav: ReturnType<typeof useRegisterNav>) => void }) {
  const nav = useRegisterNav()
  onUpdate(nav)
  return null
}

function Seed({ name, step }: { name: string; step?: 'email' }) {
  const nav = useRegisterNav()
  // Seed name once on mount.
  if (nav.name !== name) nav.setName(name)
  if (step && nav.current !== step) nav.goTo(step)
  return null
}

const wrap = (node: ReactNode, opts: { name?: string; step?: 'email' } = {}) => (
  <IntlProvider locale="en" messages={enUS as Record<string, string>}>
    <MemoryRouter>
      <IonApp>
        <RegisterNavProvider>
          {opts.name ? <Seed name={opts.name} step={opts.step} /> : null}
          {node}
        </RegisterNavProvider>
      </IonApp>
    </MemoryRouter>
  </IntlProvider>
)

describe('EmailStep', () => {
  beforeEach(() => vi.restoreAllMocks())
  afterEach(() => vi.restoreAllMocks())

  it('renders the personalized title when name is set', async () => {
    render(wrap(<EmailStep />, { name: 'Alex' }))
    await waitFor(() => {
      expect(screen.getByText(/Nice to meet you, Alex/i)).toBeDefined()
    })
  })

  it('renders the fallback title when name is empty', () => {
    render(wrap(<EmailStep />))
    expect(screen.getByText('Where can we reach you?')).toBeDefined()
  })

  it('disables Continue until the email is locally valid', () => {
    render(wrap(<EmailStep />, { name: 'Alex' }))
    const btn = () => screen.getByRole('button', { name: 'Continue' }) as HTMLButtonElement
    expect(btn().disabled).toBe(true)

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'not-valid' } })
    expect(btn().disabled).toBe(true)

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.co' } })
    expect(btn().disabled).toBe(false)
  })

  it('advances to password step on 200 AUTH_EMAIL_AVAILABLE', async () => {
    vi.spyOn(apiClient, 'apiPost').mockResolvedValue({ success: true, messageCode: 'AUTH_EMAIL_AVAILABLE' } as any)
    let captured: ReturnType<typeof useRegisterNav> | null = null
    render(
      wrap(
        <>
          <EmailStep />
          <ContextProbe onUpdate={(n) => { captured = n }} />
        </>,
        { name: 'Alex' },
      ),
    )
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.co' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await waitFor(() => expect(captured!.current).toBe('password'))
    expect(apiClient.apiPost).toHaveBeenCalledWith('/api/auth/check-email', { email: 'a@b.co' })
  })

  it('renders inline error and stays on step when AUTH_EMAIL_TAKEN', async () => {
    const err = new apiClient.ApiError(
      400,
      { success: false, messageCode: 'AUTH_EMAIL_TAKEN' } as never,
      'AUTH_EMAIL_TAKEN',
    )
    vi.spyOn(apiClient, 'apiPost').mockRejectedValue(err)

    let captured: ReturnType<typeof useRegisterNav> | null = null
    render(
      wrap(
        <>
          <EmailStep />
          <ContextProbe onUpdate={(n) => { captured = n }} />
        </>,
        { name: 'Alex', step: 'email' },
      ),
    )
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'taken@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    await waitFor(() => {
      expect(screen.getByText("That email's already in use.")).toBeDefined()
    })
    expect(captured!.current).toBe('email')
  })
})
