import { describe, it, expect } from 'vitest'
import { pickLocaleFromAcceptLanguage } from './accept-language'

describe('pickLocaleFromAcceptLanguage', () => {
  it('returns default locale when header is missing', () => {
    expect(pickLocaleFromAcceptLanguage(null)).toBe('en-US')
    expect(pickLocaleFromAcceptLanguage(undefined)).toBe('en-US')
    expect(pickLocaleFromAcceptLanguage('')).toBe('en-US')
  })

  it('matches exact supported locales', () => {
    expect(pickLocaleFromAcceptLanguage('en-US')).toBe('en-US')
    expect(pickLocaleFromAcceptLanguage('es')).toBe('es')
  })

  it('collapses all Spanish variants to es', () => {
    expect(pickLocaleFromAcceptLanguage('es-MX')).toBe('es')
    expect(pickLocaleFromAcceptLanguage('es-PE')).toBe('es')
    expect(pickLocaleFromAcceptLanguage('es-AR')).toBe('es')
    expect(pickLocaleFromAcceptLanguage('es-ES')).toBe('es')
    expect(pickLocaleFromAcceptLanguage('es-CO')).toBe('es')
  })

  it('collapses all English variants to en-US', () => {
    expect(pickLocaleFromAcceptLanguage('en')).toBe('en-US')
    expect(pickLocaleFromAcceptLanguage('en-GB')).toBe('en-US')
    expect(pickLocaleFromAcceptLanguage('en-AU')).toBe('en-US')
    expect(pickLocaleFromAcceptLanguage('en-CA')).toBe('en-US')
  })

  it('respects quality values when ordering preferences', () => {
    expect(pickLocaleFromAcceptLanguage('en;q=0.5,es;q=0.9')).toBe('es')
    expect(pickLocaleFromAcceptLanguage('es;q=0.3,en-US;q=0.9')).toBe('en-US')
  })

  it('picks the first supported locale by preference order', () => {
    expect(pickLocaleFromAcceptLanguage('fr,es-MX,en-US')).toBe('es')
    expect(pickLocaleFromAcceptLanguage('de,ja,en-GB,es')).toBe('en-US')
  })

  it('falls back to default when no supported language is present', () => {
    expect(pickLocaleFromAcceptLanguage('fr-FR')).toBe('en-US')
    expect(pickLocaleFromAcceptLanguage('de,ja;q=0.8')).toBe('en-US')
    expect(pickLocaleFromAcceptLanguage('zh-CN')).toBe('en-US')
  })

  it('parses realistic browser headers', () => {
    expect(pickLocaleFromAcceptLanguage('es-MX,es;q=0.9,en;q=0.8')).toBe('es')
    expect(pickLocaleFromAcceptLanguage('en-US,en;q=0.9')).toBe('en-US')
    expect(pickLocaleFromAcceptLanguage('en-GB,en;q=0.9,es;q=0.8')).toBe('en-US')
    expect(pickLocaleFromAcceptLanguage('es-AR,es;q=0.8,en-US;q=0.5,en;q=0.3')).toBe('es')
  })

  it('ignores wildcards and zero-quality entries', () => {
    expect(pickLocaleFromAcceptLanguage('*')).toBe('en-US')
    expect(pickLocaleFromAcceptLanguage('es;q=0,en-US;q=0.5')).toBe('en-US')
    expect(pickLocaleFromAcceptLanguage('*;q=0.5,es')).toBe('es')
  })

  it('handles malformed headers gracefully', () => {
    expect(pickLocaleFromAcceptLanguage('   ')).toBe('en-US')
    expect(pickLocaleFromAcceptLanguage(',,,')).toBe('en-US')
    expect(pickLocaleFromAcceptLanguage('es;q=notanumber')).toBe('en-US')
    expect(pickLocaleFromAcceptLanguage('es;q=notanumber,en-US;q=0.9')).toBe('en-US')
  })

  it('is case-insensitive on language tags', () => {
    expect(pickLocaleFromAcceptLanguage('ES-MX')).toBe('es')
    expect(pickLocaleFromAcceptLanguage('EN-us')).toBe('en-US')
  })
})
