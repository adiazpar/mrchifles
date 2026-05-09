'use client'

import { useIntl } from 'react-intl'

import Image from '@/lib/Image'
import { useState, useEffect } from 'react'
import { Plus, Minus, ImagePlus } from 'lucide-react'
import { BarcodeFields } from './BarcodeFields'
import { PRESET_ICONS, isPresetIcon, getPresetIcon } from '@/lib/preset-icons'
import {
  IonLabel,
  IonSegment,
  IonSegmentButton,
} from '@ionic/react'
import { TabContainer, PriceInput } from '@/components/ui'
import { useProductForm } from '@/contexts/product-form-context'
import type { ProductCategory } from '@kasero/shared/types'

export interface ProductFormProps {
  /** User's categories for the category select */
  categories: ProductCategory[]
  /** Stable id prefix so add/edit/AI variants don't collide on input ids */
  idPrefix: string
  /** Whether the modal/parent is currently open — used to reset the active tab on open */
  isOpen: boolean
  /** Whether to show the Active toggle (default true) */
  showActiveToggle?: boolean
}

export function ProductForm({
  categories,
  idPrefix,
  isOpen,
  showActiveToggle = true,
}: ProductFormProps) {
  const t = useIntl()
  const [activeTab, setActiveTab] = useState<'details' | 'barcode'>('details')

  useEffect(() => {
    if (isOpen) setActiveTab('details')
  }, [isOpen])

  const {
    name,
    setName,
    price,
    setPrice,
    categoryId,
    setCategoryId,
    active,
    setActive,
    iconPreview,
    setIconPreview,
    setGeneratedIconBlob,
    setIconType,
    setPresetEmoji,
    presetEmoji,
    clearIcon,
  } = useProductForm()

  const presetIndex = presetEmoji
    ? PRESET_ICONS.findIndex((p) => p.id === presetEmoji) + 1
    : 0

  return (
    <div className="pm-form">
      <IonSegment
        value={activeTab}
        onIonChange={(e) =>
          setActiveTab(e.detail.value as 'details' | 'barcode')
        }
        className="pm-form-segment modal-step-item"
        mode="md"
      >
        <IonSegmentButton value="details">
          <IonLabel>
            {t.formatMessage({ id: 'productForm.tab_details' })}
          </IonLabel>
        </IonSegmentButton>
        <IonSegmentButton value="barcode">
          <IonLabel>
            {t.formatMessage({ id: 'productForm.tab_barcode' })}
          </IonLabel>
        </IonSegmentButton>
      </IonSegment>

      <TabContainer
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as 'details' | 'barcode')}
        swipeable
      >
        <TabContainer.Tab id="details">
          <div className="pm-form">
            {/* Icon picker */}
            <div className="pm-field">
              <span className="pm-field-label">
                {t.formatMessage({ id: 'productForm.icon_label' })}
              </span>
              <div className="pm-icon-picker">
                <div className="pm-icon-tile">
                  {iconPreview && isPresetIcon(iconPreview) ? (
                    (() => {
                      const p = getPresetIcon(iconPreview)
                      return p ? (
                        <p.icon
                          size={28}
                          className="text-text-primary"
                        />
                      ) : null
                    })()
                  ) : iconPreview ? (
                    <Image
                      src={iconPreview}
                      alt=""
                      width={56}
                      height={56}
                      className="object-cover w-full h-full"
                      unoptimized
                    />
                  ) : (
                    <ImagePlus size={26} />
                  )}
                </div>
                <div className="pm-icon-rail">
                  {PRESET_ICONS.map((preset) => {
                    const isSelected = presetEmoji === preset.id
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => {
                          if (isSelected) {
                            clearIcon()
                            return
                          }
                          setIconPreview(preset.id)
                          setGeneratedIconBlob(null)
                          setIconType('preset')
                          setPresetEmoji(preset.id)
                        }}
                        className="pm-icon-rail__button"
                      >
                        <preset.icon size={22} />
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="pm-icon-meta">
                <span className="pm-icon-meta__label">
                  {!iconPreview
                    ? t.formatMessage({ id: 'productForm.icon_no_icon' })
                    : presetEmoji
                    ? t.formatMessage(
                        { id: 'productForm.icon_preset' },
                        { number: presetIndex },
                      )
                    : t.formatMessage({ id: 'productForm.icon_custom' })}
                </span>
                <button
                  type="button"
                  onClick={() => clearIcon()}
                  disabled={!iconPreview}
                  className="pm-icon-meta__reset"
                >
                  {t.formatMessage({ id: 'productForm.icon_reset' })}
                </button>
              </div>
            </div>

            {/* Name */}
            <div className="pm-field">
              <label htmlFor={`${idPrefix}-name`} className="pm-field-label">
                {t.formatMessage({ id: 'productForm.name_label' })}{' '}
                <span className="pm-field-label__required">*</span>
              </label>
              <input
                id={`${idPrefix}-name`}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder={t.formatMessage({
                  id: 'productForm.name_placeholder',
                })}
                autoComplete="off"
              />
            </div>

            {/* Price + Category */}
            <div className="pm-field-pair">
              <div className="pm-field">
                <label htmlFor={`${idPrefix}-price`} className="pm-field-label">
                  {t.formatMessage({ id: 'productForm.price_label' })}{' '}
                  <span className="pm-field-label__required">*</span>
                </label>
                <div className="input-number-wrapper">
                  <PriceInput
                    id={`${idPrefix}-price`}
                    value={price}
                    onValueChange={setPrice}
                    placeholder="0"
                  />
                  <div className="input-number-spinners">
                    <button
                      type="button"
                      className="input-number-spinner"
                      onClick={() => {
                        const current = parseFloat(price) || 0
                        setPrice((current + 1).toFixed(2))
                      }}
                      tabIndex={-1}
                      aria-label={t.formatMessage({
                        id: 'productForm.price_increase_aria',
                      })}
                    >
                      <Plus />
                    </button>
                    <button
                      type="button"
                      className="input-number-spinner"
                      onClick={() => {
                        const current = parseFloat(price) || 0
                        setPrice(Math.max(0, current - 1).toFixed(2))
                      }}
                      tabIndex={-1}
                      aria-label={t.formatMessage({
                        id: 'productForm.price_decrease_aria',
                      })}
                    >
                      <Minus />
                    </button>
                  </div>
                </div>
              </div>
              <div className="pm-field">
                <label
                  htmlFor={`${idPrefix}-category`}
                  className="pm-field-label"
                >
                  {t.formatMessage({ id: 'productForm.category_label' })}
                </label>
                <select
                  id={`${idPrefix}-category`}
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className={`input ${
                    categoryId === '' ? 'select-placeholder' : ''
                  }`}
                >
                  <option value="">
                    {t.formatMessage({ id: 'productForm.category_none' })}
                  </option>
                  {categories
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {showActiveToggle && (
              <div className="pm-toggle-row">
                <div className="pm-toggle-row__lead">
                  <span className="pm-toggle-row__label">
                    {t.formatMessage({ id: 'productForm.active_label' })}
                  </span>
                  <span className="pm-toggle-row__desc">
                    {t.formatMessage({
                      id: 'productForm.active_description',
                    })}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="toggle"
                  aria-label={t.formatMessage({
                    id: 'productForm.active_label',
                  })}
                />
              </div>
            )}
          </div>
        </TabContainer.Tab>

        <TabContainer.Tab id="barcode">
          <BarcodeFields />
        </TabContainer.Tab>
      </TabContainer>
    </div>
  )
}
