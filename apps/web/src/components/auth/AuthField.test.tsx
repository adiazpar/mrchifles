import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import enUS from '../../i18n/messages/en-US.json'
import { AuthField } from './AuthField'

const wrap = (node: React.ReactNode) => (
  <IntlProvider locale="en" messages={enUS as Record<string, string>}>
    {node}
  </IntlProvider>
)

describe('AuthField revealable', () => {
  it('does not render an eye toggle when revealable is false', () => {
    render(wrap(<AuthField label="Password" type="password" />))
    expect(screen.queryByRole('button', { name: /show password/i })).toBeNull()
  })

  it('renders an eye toggle when revealable + type=password', () => {
    render(wrap(<AuthField label="Password" type="password" revealable />))
    expect(screen.getByRole('button', { name: /show password/i })).toBeDefined()
  })

  it('toggles input type between password and text on click', () => {
    render(wrap(<AuthField label="Password" type="password" revealable value="hunter2" onChange={() => {}} />))
    const input = screen.getByLabelText('Password') as HTMLInputElement
    expect(input.type).toBe('password')

    fireEvent.click(screen.getByRole('button', { name: /show password/i }))
    expect(input.type).toBe('text')

    fireEvent.click(screen.getByRole('button', { name: /hide password/i }))
    expect(input.type).toBe('password')
  })

  it('does not render an eye toggle when revealable + type=text (only password gets the toggle)', () => {
    render(wrap(<AuthField label="Email" type="text" revealable />))
    expect(screen.queryByRole('button', { name: /show password/i })).toBeNull()
  })
})
