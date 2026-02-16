// Country codes for phone number input
// Initial list focused on Latin America and common countries

export interface Country {
  code: string // ISO 3166-1 alpha-2
  name: string // Spanish name
  dialCode: string // E.g., "+51"
  flag: string // Emoji flag
}

export const COUNTRIES: Country[] = [
  { code: 'PE', name: 'Peru', dialCode: '+51', flag: '' },
  { code: 'US', name: 'Estados Unidos', dialCode: '+1', flag: '' },
  { code: 'MX', name: 'Mexico', dialCode: '+52', flag: '' },
  { code: 'CO', name: 'Colombia', dialCode: '+57', flag: '' },
  { code: 'AR', name: 'Argentina', dialCode: '+54', flag: '' },
  { code: 'CL', name: 'Chile', dialCode: '+56', flag: '' },
  { code: 'ES', name: 'Espana', dialCode: '+34', flag: '' },
  { code: 'EC', name: 'Ecuador', dialCode: '+593', flag: '' },
  { code: 'BO', name: 'Bolivia', dialCode: '+591', flag: '' },
  { code: 'VE', name: 'Venezuela', dialCode: '+58', flag: '' },
  { code: 'BR', name: 'Brasil', dialCode: '+55', flag: '' },
  { code: 'PY', name: 'Paraguay', dialCode: '+595', flag: '' },
  { code: 'UY', name: 'Uruguay', dialCode: '+598', flag: '' },
]

// Default country (Peru)
export const DEFAULT_COUNTRY = COUNTRIES[0]

/**
 * Find country by dial code
 */
export function findCountryByDialCode(dialCode: string): Country | undefined {
  return COUNTRIES.find(c => c.dialCode === dialCode)
}

/**
 * Find country by ISO code
 */
export function findCountryByCode(code: string): Country | undefined {
  return COUNTRIES.find(c => c.code === code)
}

/**
 * Parse a phone number string to extract country and local number
 * @param phoneNumber E.164 format (+51987654321)
 * @returns { country, localNumber } or null if invalid
 */
export function parsePhoneNumber(phoneNumber: string): { country: Country; localNumber: string } | null {
  if (!phoneNumber.startsWith('+')) {
    return null
  }

  // Try to match longest dial code first
  const sortedCountries = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length)

  for (const country of sortedCountries) {
    if (phoneNumber.startsWith(country.dialCode)) {
      return {
        country,
        localNumber: phoneNumber.slice(country.dialCode.length),
      }
    }
  }

  return null
}

/**
 * Format phone number for display
 * @param phoneNumber E.164 format (+51987654321)
 * @returns Formatted string (e.g., "+51 987 654 321")
 */
export function formatPhoneForDisplay(phoneNumber: string): string {
  const parsed = parsePhoneNumber(phoneNumber)
  if (!parsed) {
    return phoneNumber
  }

  // Simple formatting: dial code + space + local number
  return `${parsed.country.dialCode} ${parsed.localNumber}`
}

/**
 * Convert phone to PocketBase auth email format
 * @param phoneNumber E.164 format (+51987654321)
 * @returns Email format (51987654321@phone.local)
 */
export function phoneToAuthEmail(phoneNumber: string): string {
  // Remove the + prefix and add domain
  const digits = phoneNumber.replace('+', '')
  return `${digits}@phone.local`
}

/**
 * Convert PocketBase auth email back to phone number
 * @param email Format: 51987654321@phone.local
 * @returns E.164 format (+51987654321)
 */
export function authEmailToPhone(email: string): string {
  const digits = email.split('@')[0]
  return `+${digits}`
}

/**
 * Validate E.164 phone number format
 * @param phoneNumber Should start with + followed by 7-15 digits
 */
export function isValidE164(phoneNumber: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(phoneNumber)
}
