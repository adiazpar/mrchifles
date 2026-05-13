import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { IonApp } from '@ionic/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import enUS from '../../../i18n/messages/en-US.json'
import { RegisterNavProvider, useRegisterNav } from './RegisterNavContext'
import { NameStep } from './NameStep'

function ContextProbe({ render }: { render: (nav: ReturnType<typeof useRegisterNav>) => ReactNode }) {
  return <>{render(useRegisterNav())}</>
}

const wrap = (node: ReactNode) => (
  <IntlProvider locale="en" messages={enUS as Record<string, string>}>
    <MemoryRouter>
      <IonApp>
        <RegisterNavProvider>
          {node}
        </RegisterNavProvider>
      </IonApp>
    </MemoryRouter>
  </IntlProvider>
)

describe('NameStep', () => {
  it('renders the title and helper line', () => {
    render(wrap(<NameStep />))
    expect(screen.getByText('What should we call you?')).toBeDefined()
    expect(screen.getByText("We'll keep things friendly.")).toBeDefined()
  })

  it('disables Continue when name is fewer than 2 characters', () => {
    render(wrap(<NameStep />))
    const button = screen.getByRole('button', { name: 'Continue' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)

    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'A' } })
    expect((screen.getByRole('button', { name: 'Continue' }) as HTMLButtonElement).disabled).toBe(true)

    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Al' } })
    expect((screen.getByRole('button', { name: 'Continue' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('advances to the email step on Continue and trims the name', () => {
    let captured: ReturnType<typeof useRegisterNav> | null = null
    render(
      wrap(
        <>
          <NameStep />
          <ContextProbe render={(n) => { captured = n; return null }} />
        </>,
      ),
    )
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: '  Alex  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(captured!.current).toBe('email')
    expect(captured!.name).toBe('Alex')
  })

  it('advances on Enter key (form submit)', () => {
    let captured: ReturnType<typeof useRegisterNav> | null = null
    render(
      wrap(
        <>
          <NameStep />
          <ContextProbe render={(n) => { captured = n; return null }} />
        </>,
      ),
    )
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Alex' } })
    fireEvent.submit(screen.getByTestId('register-name-form'))
    expect(captured!.current).toBe('email')
  })
})
