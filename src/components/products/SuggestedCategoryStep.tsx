'use client'

import { useState, useEffect } from 'react'
import { Spinner } from '@/components/ui'
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

export function SuggestedCategoryStep({
  suggestedName,
  categories,
  onCreate,
  onPickExisting,
}: SuggestedCategoryStepProps) {
  const [name, setName] = useState(suggestedName)
  const [isCreating, setIsCreating] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
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
    } finally {
      setIsCreating(false)
    }
  }

  if (showPicker) {
    return (
      <>
        <div className="text-sm text-text-secondary mb-3 px-1">
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
        <button
          type="button"
          onClick={() => setShowPicker(false)}
          className="text-sm text-text-tertiary hover:text-text-secondary mt-3 px-1"
        >
          Back to suggestion
        </button>
      </>
    )
  }

  return (
    <>
      <div className="text-sm text-text-secondary mb-3 px-1">
        We couldn&apos;t fit this product into one of your existing categories.
        Create a new one to keep things organized:
      </div>

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

      {error && (
        <div className="mt-3 p-3 bg-error-subtle text-error text-sm rounded-lg">
          {error}
        </div>
      )}

      <div className="flex gap-3 mt-4">
        <button
          type="button"
          onClick={handleCreate}
          disabled={isCreating || !name.trim()}
          className="btn btn-primary flex-1"
        >
          {isCreating ? <Spinner /> : 'Create and continue'}
        </button>
      </div>

      {categories.length > 0 && (
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          className="text-sm text-brand hover:text-brand mt-3 px-1"
        >
          Pick existing category instead
        </button>
      )}
    </>
  )
}
