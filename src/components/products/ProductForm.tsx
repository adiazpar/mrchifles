'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Plus, Minus } from 'lucide-react'
import { BarcodeFields } from './BarcodeFields'
import { ImageAttachIcon } from '@/components/icons'
import { PRESET_ICONS, isPresetIcon, getPresetIcon } from '@/lib/preset-icons'
import { TabContainer, PriceInput } from '@/components/ui'
import { useProductForm } from '@/contexts/product-form-context'
import type { ProductCategory } from '@/types'

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

  return (
    <div className="flex flex-col gap-4">
      <div className="section-tabs section-tabs--modal morph-item">
        <button
          type="button"
          onClick={() => setActiveTab('details')}
          className={`section-tab ${activeTab === 'details' ? 'section-tab-active' : ''}`}
        >
          Details
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('barcode')}
          className={`section-tab ${activeTab === 'barcode' ? 'section-tab-active' : ''}`}
        >
          Barcode
        </button>
      </div>

      <TabContainer
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as 'details' | 'barcode')}
        swipeable
      >
        <TabContainer.Tab id="details">
          <div className="flex flex-col gap-4">
            {/* Icon picker */}
            <div>
              <label className="label">Icon</label>
              <div className="flex items-center gap-3">
                <div className="input-height aspect-square rounded-lg overflow-hidden bg-bg-muted flex items-center justify-center flex-shrink-0">
                  {iconPreview && isPresetIcon(iconPreview) ? (
                    (() => {
                      const p = getPresetIcon(iconPreview)
                      return p ? <p.icon size={28} className="text-text-primary" /> : null
                    })()
                  ) : iconPreview ? (
                    <Image
                      src={iconPreview}
                      alt="Product icon"
                      width={53}
                      height={53}
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <ImageAttachIcon size={28} className="text-text-tertiary" />
                  )}
                </div>
                <div className="w-px self-stretch bg-border flex-shrink-0" />
                <div className="input-height flex-1 min-w-0 rounded-lg bg-bg-muted overflow-hidden flex items-center">
                  <div className="h-full flex items-center gap-3 px-3 overflow-x-auto scrollbar-hidden">
                    {PRESET_ICONS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          if (presetEmoji === preset.id) {
                            clearIcon()
                            return
                          }
                          setIconPreview(preset.id)
                          setGeneratedIconBlob(null)
                          setIconType('preset')
                          setPresetEmoji(preset.id)
                        }}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${presetEmoji === preset.id ? 'bg-brand-subtle ring-2 ring-brand' : 'hover:bg-brand-subtle'}`}
                      >
                        <preset.icon
                          size={28}
                          className={presetEmoji === preset.id ? 'text-text-primary' : 'text-text-tertiary'}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-text-tertiary">
                  {!iconPreview
                    ? 'No icon'
                    : presetEmoji
                    ? `Preset ${PRESET_ICONS.findIndex((p) => p.id === presetEmoji) + 1}`
                    : 'Custom'}
                </span>
                <button
                  type="button"
                  onClick={() => clearIcon()}
                  disabled={!iconPreview}
                  className="text-sm text-error hover:text-error transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Name */}
            <div>
              <label htmlFor={`${idPrefix}-name`} className="label">
                Name <span className="text-error">*</span>
              </label>
              <input
                id={`${idPrefix}-name`}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="E.g.: Large Chips"
                autoComplete="off"
              />
            </div>

            {/* Price + Category */}
            <div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label htmlFor={`${idPrefix}-price`} className="label">
                    Price <span className="text-error">*</span>
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
                        aria-label="Increase price"
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
                        aria-label="Decrease price"
                      >
                        <Minus />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex-1">
                  <label htmlFor={`${idPrefix}-category`} className="label">
                    Category
                  </label>
                  <select
                    id={`${idPrefix}-category`}
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className={`input ${categoryId === '' ? 'select-placeholder' : ''}`}
                  >
                    <option value="">N/A</option>
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
            </div>

            {showActiveToggle && (
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="label mb-0">Active</span>
                    <span className="text-sm text-text-tertiary leading-tight">
                      Toggles visibility in sales page
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="toggle"
                  />
                </div>
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
