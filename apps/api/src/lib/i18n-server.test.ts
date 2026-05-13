import { describe, expect, it } from 'vitest'
import { getMessages } from './i18n-server'
import type { SupportedLocale } from '@kasero/shared/locales'

describe('i18n-server', () => {
  it('returns english messages for en-US', () => {
    const intl = getMessages('en-US')
    const msg = intl.formatMessage({ id: 'email_verify_subject' })
    expect(typeof msg).toBe('string')
    expect(msg.length).toBeGreaterThan(0)
  })

  it('returns spanish messages for es', () => {
    const intl = getMessages('es')
    const msg = intl.formatMessage({ id: 'email_verify_subject' })
    expect(typeof msg).toBe('string')
  })

  it('falls back to en-US for unknown locales', () => {
    const intl = getMessages('xx' as SupportedLocale)
    const enIntl = getMessages('en-US')
    expect(intl.formatMessage({ id: 'email_verify_subject' }))
      .toEqual(enIntl.formatMessage({ id: 'email_verify_subject' }))
  })

  it('interpolates values', () => {
    const intl = getMessages('en-US')
    const msg = intl.formatMessage({ id: 'email_verify_body' }, { code: '123456' })
    expect(msg).toContain('123456')
  })

  it('returns the id when key is missing in all locales', () => {
    const intl = getMessages('en-US')
    expect(intl.formatMessage({ id: 'nonexistent_key_for_test' })).toBe('nonexistent_key_for_test')
  })
})
