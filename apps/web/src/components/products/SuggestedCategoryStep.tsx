'use client'

import { useIntl } from 'react-intl'
import { useState, useEffect } from 'react'
import { IonSpinner, IonButton } from '@ionic/react'
import { ChevronRight } from 'lucide-react'
import { TabContainer } from '@/components/ui'
import type { ProductCategory } from '@kasero/shared/types'

export interface SuggestedCategoryStepProps {
  /** The AI-suggested name for a brand-new category */
  suggestedName: string
  /** Existing categories, in case the user wants to pick one instead */
  categories: ProductCategory[]
  /** Called when the user confirms creating the new category. Returns the new category id. */
  onCreate: (name: string) => Promise<string | null>
  /** Called when the user picks an existing category instead */
  onPickExisting: (categoryId: string) => void
}

type ActiveView = 'suggest' | 'picker'

export function SuggestedCategoryStep({
  suggestedName,
  categories,
  onCreate,
  onPickExisting,
}: SuggestedCategoryStepProps) {
  const t = useIntl()
  const [name, setName] = useState(suggestedName)
  const [isCreating, setIsCreating] = useState(false)
  const [activeView, setActiveView] = useState<ActiveView>('suggest')
  const [error, setError] = useState('')

  useEffect(() => {
    setName(suggestedName)
  }, [suggestedName])

  const handleCreate = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError(t.formatMessage({ id: 'aiPipeline.category_name_required' }))
      return
    }
    setError('')
    setIsCreating(true)
    try {
      const newId = await onCreate(trimmed)
      if (!newId)
        setError(t.formatMessage({ id: 'aiPipeline.failed_to_create_category' }))
    } catch {
      setError(t.formatMessage({ id: 'aiPipeline.failed_to_create_category' }))
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="pm-suggested">
      <TabContainer
        activeTab={activeView}
        onTabChange={(id) => setActiveView(id as ActiveView)}
        fitActiveHeight
      >
        <TabContainer.Tab id="suggest">
          <div className="pm-suggested__notice">
            <span className="pm-hero__eyebrow">
              {t.formatMessage({ id: 'aiPipeline.notice_label' })}
            </span>
            <p className="pm-suggested__intro">
              {t.formatMessage({ id: 'aiPipeline.no_category_fit' })}
            </p>
          </div>

          <div className="pm-field">
            <label
              htmlFor="suggested-category-name"
              className="pm-field-label"
            >
              {t.formatMessage({ id: 'aiPipeline.new_category_name_label' })}
            </label>
            <input
              id="suggested-category-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              autoComplete="off"
            />
          </div>

          {error && <div className="pm-error">{error}</div>}

          <IonButton
            expand="block"
            onClick={handleCreate}
            disabled={isCreating || !name.trim()}
          >
            {isCreating ? (
              <IonSpinner name="crescent" />
            ) : (
              t.formatMessage({ id: 'aiPipeline.create_and_continue' })
            )}
          </IonButton>

          {categories.length > 0 && (
            <>
              <div className="pm-suggested__divider" aria-hidden="true">
                <span className="pm-suggested__divider-line" />
                <span className="pm-suggested__divider-text">
                  {t.formatMessage({ id: 'common.or' })}
                </span>
                <span className="pm-suggested__divider-line" />
              </div>

              <button
                type="button"
                onClick={() => setActiveView('picker')}
                className="pm-suggested__back"
              >
                {t.formatMessage({ id: 'aiPipeline.pick_existing_instead' })}
              </button>
            </>
          )}
        </TabContainer.Tab>

        <TabContainer.Tab id="picker">
          <p className="pm-suggested__intro" style={{ textAlign: 'center' }}>
            {t.formatMessage({ id: 'aiPipeline.pick_existing_intro' })}
          </p>

          <div className="pm-suggested__pick">
            {categories
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onPickExisting(cat.id)}
                  className="pm-suggested__pick-row"
                >
                  <span>{cat.name}</span>
                  <span className="pm-suggested__pick-row-chev">
                    <ChevronRight size={16} />
                  </span>
                </button>
              ))}
          </div>

          <div className="pm-suggested__divider" aria-hidden="true">
            <span className="pm-suggested__divider-line" />
            <span className="pm-suggested__divider-text">
              {t.formatMessage({ id: 'common.or' })}
            </span>
            <span className="pm-suggested__divider-line" />
          </div>

          <button
            type="button"
            onClick={() => setActiveView('suggest')}
            className="pm-suggested__back"
          >
            {t.formatMessage({ id: 'aiPipeline.back_to_suggestion' })}
          </button>
        </TabContainer.Tab>
      </TabContainer>
    </div>
  )
}
