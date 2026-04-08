'use client'

import { useState, useEffect } from 'react'
import { Spinner, TabContainer } from '@/components/ui'
import type { ProductCategory } from '@/types'

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
      setError('Category name is required')
      return
    }
    setError('')
    setIsCreating(true)
    try {
      const newId = await onCreate(trimmed)
      if (!newId) setError('Failed to create category')
    } catch {
      setError('Failed to create category')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <TabContainer
      activeTab={activeView}
      onTabChange={(id) => setActiveView(id as ActiveView)}
      fitActiveHeight
    >
      {/* Tabs are wrapped by TabContainer in `flex flex-col gap-4`, so
          top-level children here are spaced by gap-4 automatically. Avoid
          adding margin utilities on direct children. */}

      <TabContainer.Tab id="suggest">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-text-tertiary mb-1 text-center">
            Notice
          </div>
          <div className="text-sm text-text-secondary text-center">
            We couldn&apos;t fit this product into one of your existing
            categories. Create a new one to keep things organized:
          </div>
        </div>

        <div>
          <label htmlFor="suggested-category-name" className="label">
            New category name
          </label>
          <input
            id="suggested-category-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            autoComplete="off"
            autoFocus
          />
        </div>

        {error && (
          <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleCreate}
          disabled={isCreating || !name.trim()}
          className="btn btn-primary w-full"
        >
          {isCreating ? <Spinner /> : 'Create and continue'}
        </button>

        {categories.length > 0 && (
          <>
            <div className="flex items-center gap-3" aria-hidden="true">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs uppercase tracking-wide text-text-tertiary">
                or
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setActiveView('picker')}
                className="text-sm text-brand hover:text-brand"
              >
                Pick existing category instead
              </button>
            </div>
          </>
        )}
      </TabContainer.Tab>

      <TabContainer.Tab id="picker">
        <div className="text-sm text-text-secondary text-center">
          Pick an existing category for this product:
        </div>

        <div className="space-y-2">
          {categories
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => onPickExisting(cat.id)}
                className="w-full text-left px-4 py-3 rounded-lg bg-bg-muted hover:bg-brand-subtle transition-colors"
              >
                {cat.name}
              </button>
            ))}
        </div>

        <div className="flex items-center gap-3" aria-hidden="true">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs uppercase tracking-wide text-text-tertiary">
            or
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setActiveView('suggest')}
            className="text-sm text-brand hover:text-brand"
          >
            Back to suggestion
          </button>
        </div>
      </TabContainer.Tab>
    </TabContainer>
  )
}
