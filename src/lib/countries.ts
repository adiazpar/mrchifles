// Country codes for phone number input
// Comprehensive list sorted alphabetically by Spanish name
// Peru is listed first as the default country

export interface Country {
  code: string // ISO 3166-1 alpha-2
  name: string // Spanish name
  dialCode: string // E.g., "+51"
}

export const COUNTRIES: Country[] = [
  // Default country first
  { code: 'PE', name: 'Peru', dialCode: '+51' },
  // Rest alphabetically by Spanish name
  { code: 'AF', name: 'Afganistan', dialCode: '+93' },
  { code: 'AL', name: 'Albania', dialCode: '+355' },
  { code: 'DE', name: 'Alemania', dialCode: '+49' },
  { code: 'AD', name: 'Andorra', dialCode: '+376' },
  { code: 'AO', name: 'Angola', dialCode: '+244' },
  { code: 'AG', name: 'Antigua y Barbuda', dialCode: '+1268' },
  { code: 'SA', name: 'Arabia Saudita', dialCode: '+966' },
  { code: 'DZ', name: 'Argelia', dialCode: '+213' },
  { code: 'AR', name: 'Argentina', dialCode: '+54' },
  { code: 'AM', name: 'Armenia', dialCode: '+374' },
  { code: 'AU', name: 'Australia', dialCode: '+61' },
  { code: 'AT', name: 'Austria', dialCode: '+43' },
  { code: 'AZ', name: 'Azerbaiyan', dialCode: '+994' },
  { code: 'BS', name: 'Bahamas', dialCode: '+1242' },
  { code: 'BD', name: 'Bangladesh', dialCode: '+880' },
  { code: 'BB', name: 'Barbados', dialCode: '+1246' },
  { code: 'BH', name: 'Barein', dialCode: '+973' },
  { code: 'BE', name: 'Belgica', dialCode: '+32' },
  { code: 'BZ', name: 'Belice', dialCode: '+501' },
  { code: 'BJ', name: 'Benin', dialCode: '+229' },
  { code: 'BY', name: 'Bielorrusia', dialCode: '+375' },
  { code: 'BO', name: 'Bolivia', dialCode: '+591' },
  { code: 'BA', name: 'Bosnia y Herzegovina', dialCode: '+387' },
  { code: 'BW', name: 'Botsuana', dialCode: '+267' },
  { code: 'BR', name: 'Brasil', dialCode: '+55' },
  { code: 'BN', name: 'Brunei', dialCode: '+673' },
  { code: 'BG', name: 'Bulgaria', dialCode: '+359' },
  { code: 'BF', name: 'Burkina Faso', dialCode: '+226' },
  { code: 'BI', name: 'Burundi', dialCode: '+257' },
  { code: 'BT', name: 'Butan', dialCode: '+975' },
  { code: 'CV', name: 'Cabo Verde', dialCode: '+238' },
  { code: 'KH', name: 'Camboya', dialCode: '+855' },
  { code: 'CM', name: 'Camerun', dialCode: '+237' },
  { code: 'CA', name: 'Canada', dialCode: '+1' },
  { code: 'QA', name: 'Catar', dialCode: '+974' },
  { code: 'TD', name: 'Chad', dialCode: '+235' },
  { code: 'CL', name: 'Chile', dialCode: '+56' },
  { code: 'CN', name: 'China', dialCode: '+86' },
  { code: 'CY', name: 'Chipre', dialCode: '+357' },
  { code: 'CO', name: 'Colombia', dialCode: '+57' },
  { code: 'KM', name: 'Comoras', dialCode: '+269' },
  { code: 'KP', name: 'Corea del Norte', dialCode: '+850' },
  { code: 'KR', name: 'Corea del Sur', dialCode: '+82' },
  { code: 'CR', name: 'Costa Rica', dialCode: '+506' },
  { code: 'CI', name: 'Costa de Marfil', dialCode: '+225' },
  { code: 'HR', name: 'Croacia', dialCode: '+385' },
  { code: 'CU', name: 'Cuba', dialCode: '+53' },
  { code: 'DK', name: 'Dinamarca', dialCode: '+45' },
  { code: 'DM', name: 'Dominica', dialCode: '+1767' },
  { code: 'EC', name: 'Ecuador', dialCode: '+593' },
  { code: 'EG', name: 'Egipto', dialCode: '+20' },
  { code: 'SV', name: 'El Salvador', dialCode: '+503' },
  { code: 'AE', name: 'Emiratos Arabes Unidos', dialCode: '+971' },
  { code: 'ER', name: 'Eritrea', dialCode: '+291' },
  { code: 'SK', name: 'Eslovaquia', dialCode: '+421' },
  { code: 'SI', name: 'Eslovenia', dialCode: '+386' },
  { code: 'ES', name: 'Espana', dialCode: '+34' },
  { code: 'US', name: 'Estados Unidos', dialCode: '+1' },
  { code: 'EE', name: 'Estonia', dialCode: '+372' },
  { code: 'ET', name: 'Etiopia', dialCode: '+251' },
  { code: 'PH', name: 'Filipinas', dialCode: '+63' },
  { code: 'FI', name: 'Finlandia', dialCode: '+358' },
  { code: 'FJ', name: 'Fiyi', dialCode: '+679' },
  { code: 'FR', name: 'Francia', dialCode: '+33' },
  { code: 'GA', name: 'Gabon', dialCode: '+241' },
  { code: 'GM', name: 'Gambia', dialCode: '+220' },
  { code: 'GE', name: 'Georgia', dialCode: '+995' },
  { code: 'GH', name: 'Ghana', dialCode: '+233' },
  { code: 'GD', name: 'Granada', dialCode: '+1473' },
  { code: 'GR', name: 'Grecia', dialCode: '+30' },
  { code: 'GT', name: 'Guatemala', dialCode: '+502' },
  { code: 'GN', name: 'Guinea', dialCode: '+224' },
  { code: 'GQ', name: 'Guinea Ecuatorial', dialCode: '+240' },
  { code: 'GW', name: 'Guinea-Bisau', dialCode: '+245' },
  { code: 'GY', name: 'Guyana', dialCode: '+592' },
  { code: 'HT', name: 'Haiti', dialCode: '+509' },
  { code: 'HN', name: 'Honduras', dialCode: '+504' },
  { code: 'HU', name: 'Hungria', dialCode: '+36' },
  { code: 'IN', name: 'India', dialCode: '+91' },
  { code: 'ID', name: 'Indonesia', dialCode: '+62' },
  { code: 'IQ', name: 'Irak', dialCode: '+964' },
  { code: 'IR', name: 'Iran', dialCode: '+98' },
  { code: 'IE', name: 'Irlanda', dialCode: '+353' },
  { code: 'IS', name: 'Islandia', dialCode: '+354' },
  { code: 'IL', name: 'Israel', dialCode: '+972' },
  { code: 'IT', name: 'Italia', dialCode: '+39' },
  { code: 'JM', name: 'Jamaica', dialCode: '+1876' },
  { code: 'JP', name: 'Japon', dialCode: '+81' },
  { code: 'JO', name: 'Jordania', dialCode: '+962' },
  { code: 'KZ', name: 'Kazajistan', dialCode: '+7' },
  { code: 'KE', name: 'Kenia', dialCode: '+254' },
  { code: 'KG', name: 'Kirguistan', dialCode: '+996' },
  { code: 'KI', name: 'Kiribati', dialCode: '+686' },
  { code: 'KW', name: 'Kuwait', dialCode: '+965' },
  { code: 'LA', name: 'Laos', dialCode: '+856' },
  { code: 'LS', name: 'Lesoto', dialCode: '+266' },
  { code: 'LV', name: 'Letonia', dialCode: '+371' },
  { code: 'LB', name: 'Libano', dialCode: '+961' },
  { code: 'LR', name: 'Liberia', dialCode: '+231' },
  { code: 'LY', name: 'Libia', dialCode: '+218' },
  { code: 'LI', name: 'Liechtenstein', dialCode: '+423' },
  { code: 'LT', name: 'Lituania', dialCode: '+370' },
  { code: 'LU', name: 'Luxemburgo', dialCode: '+352' },
  { code: 'MK', name: 'Macedonia del Norte', dialCode: '+389' },
  { code: 'MG', name: 'Madagascar', dialCode: '+261' },
  { code: 'MY', name: 'Malasia', dialCode: '+60' },
  { code: 'MW', name: 'Malaui', dialCode: '+265' },
  { code: 'MV', name: 'Maldivas', dialCode: '+960' },
  { code: 'ML', name: 'Mali', dialCode: '+223' },
  { code: 'MT', name: 'Malta', dialCode: '+356' },
  { code: 'MA', name: 'Marruecos', dialCode: '+212' },
  { code: 'MU', name: 'Mauricio', dialCode: '+230' },
  { code: 'MR', name: 'Mauritania', dialCode: '+222' },
  { code: 'MX', name: 'Mexico', dialCode: '+52' },
  { code: 'FM', name: 'Micronesia', dialCode: '+691' },
  { code: 'MD', name: 'Moldavia', dialCode: '+373' },
  { code: 'MC', name: 'Monaco', dialCode: '+377' },
  { code: 'MN', name: 'Mongolia', dialCode: '+976' },
  { code: 'ME', name: 'Montenegro', dialCode: '+382' },
  { code: 'MZ', name: 'Mozambique', dialCode: '+258' },
  { code: 'MM', name: 'Myanmar', dialCode: '+95' },
  { code: 'NA', name: 'Namibia', dialCode: '+264' },
  { code: 'NR', name: 'Nauru', dialCode: '+674' },
  { code: 'NP', name: 'Nepal', dialCode: '+977' },
  { code: 'NI', name: 'Nicaragua', dialCode: '+505' },
  { code: 'NE', name: 'Niger', dialCode: '+227' },
  { code: 'NG', name: 'Nigeria', dialCode: '+234' },
  { code: 'NO', name: 'Noruega', dialCode: '+47' },
  { code: 'NZ', name: 'Nueva Zelanda', dialCode: '+64' },
  { code: 'OM', name: 'Oman', dialCode: '+968' },
  { code: 'NL', name: 'Paises Bajos', dialCode: '+31' },
  { code: 'PK', name: 'Pakistan', dialCode: '+92' },
  { code: 'PW', name: 'Palaos', dialCode: '+680' },
  { code: 'PA', name: 'Panama', dialCode: '+507' },
  { code: 'PG', name: 'Papua Nueva Guinea', dialCode: '+675' },
  { code: 'PY', name: 'Paraguay', dialCode: '+595' },
  { code: 'PL', name: 'Polonia', dialCode: '+48' },
  { code: 'PT', name: 'Portugal', dialCode: '+351' },
  { code: 'PR', name: 'Puerto Rico', dialCode: '+1787' },
  { code: 'GB', name: 'Reino Unido', dialCode: '+44' },
  { code: 'CF', name: 'Republica Centroafricana', dialCode: '+236' },
  { code: 'CZ', name: 'Republica Checa', dialCode: '+420' },
  { code: 'CG', name: 'Republica del Congo', dialCode: '+242' },
  { code: 'CD', name: 'Republica Democratica del Congo', dialCode: '+243' },
  { code: 'DO', name: 'Republica Dominicana', dialCode: '+1809' },
  { code: 'RW', name: 'Ruanda', dialCode: '+250' },
  { code: 'RO', name: 'Rumania', dialCode: '+40' },
  { code: 'RU', name: 'Rusia', dialCode: '+7' },
  { code: 'WS', name: 'Samoa', dialCode: '+685' },
  { code: 'KN', name: 'San Cristobal y Nieves', dialCode: '+1869' },
  { code: 'SM', name: 'San Marino', dialCode: '+378' },
  { code: 'VC', name: 'San Vicente y las Granadinas', dialCode: '+1784' },
  { code: 'LC', name: 'Santa Lucia', dialCode: '+1758' },
  { code: 'ST', name: 'Santo Tome y Principe', dialCode: '+239' },
  { code: 'SN', name: 'Senegal', dialCode: '+221' },
  { code: 'RS', name: 'Serbia', dialCode: '+381' },
  { code: 'SC', name: 'Seychelles', dialCode: '+248' },
  { code: 'SL', name: 'Sierra Leona', dialCode: '+232' },
  { code: 'SG', name: 'Singapur', dialCode: '+65' },
  { code: 'SY', name: 'Siria', dialCode: '+963' },
  { code: 'SO', name: 'Somalia', dialCode: '+252' },
  { code: 'LK', name: 'Sri Lanka', dialCode: '+94' },
  { code: 'SZ', name: 'Suazilandia', dialCode: '+268' },
  { code: 'ZA', name: 'Sudafrica', dialCode: '+27' },
  { code: 'SD', name: 'Sudan', dialCode: '+249' },
  { code: 'SS', name: 'Sudan del Sur', dialCode: '+211' },
  { code: 'SE', name: 'Suecia', dialCode: '+46' },
  { code: 'CH', name: 'Suiza', dialCode: '+41' },
  { code: 'SR', name: 'Surinam', dialCode: '+597' },
  { code: 'TH', name: 'Tailandia', dialCode: '+66' },
  { code: 'TW', name: 'Taiwan', dialCode: '+886' },
  { code: 'TZ', name: 'Tanzania', dialCode: '+255' },
  { code: 'TJ', name: 'Tayikistan', dialCode: '+992' },
  { code: 'TL', name: 'Timor Oriental', dialCode: '+670' },
  { code: 'TG', name: 'Togo', dialCode: '+228' },
  { code: 'TO', name: 'Tonga', dialCode: '+676' },
  { code: 'TT', name: 'Trinidad y Tobago', dialCode: '+1868' },
  { code: 'TN', name: 'Tunez', dialCode: '+216' },
  { code: 'TM', name: 'Turkmenistan', dialCode: '+993' },
  { code: 'TR', name: 'Turquia', dialCode: '+90' },
  { code: 'TV', name: 'Tuvalu', dialCode: '+688' },
  { code: 'UA', name: 'Ucrania', dialCode: '+380' },
  { code: 'UG', name: 'Uganda', dialCode: '+256' },
  { code: 'UY', name: 'Uruguay', dialCode: '+598' },
  { code: 'UZ', name: 'Uzbekistan', dialCode: '+998' },
  { code: 'VU', name: 'Vanuatu', dialCode: '+678' },
  { code: 'VA', name: 'Vaticano', dialCode: '+379' },
  { code: 'VE', name: 'Venezuela', dialCode: '+58' },
  { code: 'VN', name: 'Vietnam', dialCode: '+84' },
  { code: 'YE', name: 'Yemen', dialCode: '+967' },
  { code: 'DJ', name: 'Yibuti', dialCode: '+253' },
  { code: 'ZM', name: 'Zambia', dialCode: '+260' },
  { code: 'ZW', name: 'Zimbabue', dialCode: '+263' },
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
