'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { COUNTRIES, DEFAULT_COUNTRY, type Country } from '@/lib/countries'

export interface PhoneInputProps {
  value: string // E.164 format (+51987654321) or empty
  onChange: (value: string) => void // Returns E.164 format
  label?: string
  error?: string
  helper?: string
  disabled?: boolean
  autoFocus?: boolean
}

export function PhoneInput({
  value,
  onChange,
  label,
  error,
  helper,
  disabled = false,
  autoFocus = false,
}: PhoneInputProps) {
  const inputId = useRef(`phone-${Math.random().toString(36).substr(2, 9)}`).current
  const inputRef = useRef<HTMLInputElement>(null)

  // Parse initial value to get country and local number
  const [selectedCountry, setSelectedCountry] = useState<Country>(() => {
    if (value) {
      // Try to match country from value
      const sortedCountries = [...COUNTRIES].sort(
        (a, b) => b.dialCode.length - a.dialCode.length
      )
      for (const country of sortedCountries) {
        if (value.startsWith(country.dialCode)) {
          return country
        }
      }
    }
    return DEFAULT_COUNTRY
  })

  const [localNumber, setLocalNumber] = useState(() => {
    if (value && value.startsWith(selectedCountry.dialCode)) {
      return value.slice(selectedCountry.dialCode.length)
    }
    return ''
  })

  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus input on mount if autoFocus
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  // Update parent when country or local number changes
  const updateValue = useCallback(
    (country: Country, local: string) => {
      // Only digits in local number
      const digits = local.replace(/\D/g, '')
      if (digits) {
        onChange(`${country.dialCode}${digits}`)
      } else {
        onChange('')
      }
    },
    [onChange]
  )

  const handleLocalNumberChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const digits = e.target.value.replace(/\D/g, '')
      setLocalNumber(digits)
      updateValue(selectedCountry, digits)
    },
    [selectedCountry, updateValue]
  )

  const handleCountrySelect = useCallback(
    (country: Country) => {
      setSelectedCountry(country)
      setIsDropdownOpen(false)
      updateValue(country, localNumber)
      // Focus the input after selecting country
      inputRef.current?.focus()
    },
    [localNumber, updateValue]
  )

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="label">
          {label}
        </label>
      )}

      <div className="flex gap-2">
        {/* Country selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            disabled={disabled}
            className={`
              input flex items-center gap-1 px-3 min-w-[90px]
              ${error ? 'input-error' : ''}
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            aria-haspopup="listbox"
            aria-expanded={isDropdownOpen}
          >
            <span className="text-sm">{selectedCountry.dialCode}</span>
            <svg
              className={`w-4 h-4 transition-transform ${
                isDropdownOpen ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {/* Dropdown */}
          {isDropdownOpen && (
            <ul
              className="absolute z-50 mt-1 w-56 bg-white border border-border rounded-lg shadow-lg max-h-60 overflow-auto"
              role="listbox"
            >
              {COUNTRIES.map((country) => (
                <li
                  key={country.code}
                  role="option"
                  aria-selected={country.code === selectedCountry.code}
                  onClick={() => handleCountrySelect(country)}
                  className={`
                    px-3 py-2 cursor-pointer flex items-center gap-2
                    hover:bg-brand-subtle
                    ${
                      country.code === selectedCountry.code
                        ? 'bg-brand-subtle text-brand'
                        : ''
                    }
                  `}
                >
                  <span className="w-12 text-sm font-medium">
                    {country.dialCode}
                  </span>
                  <span className="text-sm text-text-secondary">
                    {country.name}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Phone number input */}
        <input
          ref={inputRef}
          id={inputId}
          type="tel"
          inputMode="numeric"
          value={localNumber}
          onChange={handleLocalNumberChange}
          disabled={disabled}
          placeholder="987654321"
          autoComplete="tel-national"
          className={`input flex-1 ${error ? 'input-error' : ''}`}
        />
      </div>

      {error && <p className="error-text">{error}</p>}
      {helper && !error && <p className="helper-text">{helper}</p>}
    </div>
  )
}
