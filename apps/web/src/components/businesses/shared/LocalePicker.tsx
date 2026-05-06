'use client'

import { useTranslations } from 'next-intl'
import { REGIONS, getLocalesByRegion, getCurrencyConfig } from '@kasero/shared/locale-config'
import type { Region } from '@kasero/shared/locale-config'

export interface LocalePickerProps {
  value: string
  onChange: (locale: string) => void
  /** If true, shows the derived currency below the select. Defaults to true. */
  showCurrency?: boolean
}

export function LocalePicker({ value, onChange, showCurrency = true }: LocalePickerProps) {
  const t = useTranslations('createBusiness')
  const localesByRegion = getLocalesByRegion()

  // Derive currency from the selected locale
  const selectedLocale = (() => {
    for (const region of REGIONS) {
      const loc = localesByRegion[region].find(l => l.code === value)
      if (loc) return loc
    }
    return null
  })()

  const currencyConfig = selectedLocale ? getCurrencyConfig(selectedLocale.currency) : null

  const regionLabels: Record<Region, string> = {
    'North America': t('region_north_america'),
    'Central America': t('region_central_america'),
    'South America': t('region_south_america'),
    'Caribbean': t('region_caribbean'),
    'Europe': t('region_europe'),
  }

  return (
    <div>
      <label className="block text-sm font-medium text-text-primary mb-2">
        {t('location_label')}
      </label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="input">
        {REGIONS.map((region) => (
          <optgroup key={region} label={regionLabels[region]}>
            {localesByRegion[region].map((loc) => (
              <option key={loc.code} value={loc.code}>
                {loc.flag} {loc.country} ({loc.name})
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {showCurrency && currencyConfig && (
        <div className="flex items-center justify-between text-sm text-text-tertiary mt-2">
          <span>{t('currency_label')}</span>
          <span>{currencyConfig.symbol} {currencyConfig.name} ({currencyConfig.code})</span>
        </div>
      )}
    </div>
  )
}
