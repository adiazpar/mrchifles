'use client'

import { useIntl } from 'react-intl';
import { useState, useEffect, useRef } from 'react'
import { Plus, ChevronRight, GripVertical, Trash2, Pencil } from 'lucide-react'
import { Reorder, useDragControls } from 'framer-motion'
import { Spinner, Modal, useModal } from '@/components/ui'
import { LottiePlayerDynamic as LottiePlayer } from '@/components/animations'
import { SORT_OPTIONS } from '@/lib/products'
import type { ProductCategory, SortPreference } from '@kasero/shared/types'

// ============================================
// PROPS INTERFACE
// ============================================

export interface ProductSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onExitComplete?: () => void

  // Categories
  categories: ProductCategory[]
  isCreatingCategory: boolean
  isUpdatingCategory: boolean
  isDeletingCategory: boolean
  onCreateCategory: (name: string) => Promise<ProductCategory | null>
  onUpdateCategory: (id: string, name: string) => Promise<ProductCategory | null>
  onDeleteCategory: (id: string) => Promise<boolean>
  onReorderCategories: (categoryIds: string[]) => Promise<boolean>

  // Settings
  defaultCategoryId: string | null
  sortPreference: SortPreference
  isSavingSettings: boolean
  onUpdateSettings: (updates: { defaultCategoryId?: string | null; sortPreference?: SortPreference }) => Promise<unknown>

  // Error
  error: string
  onClearError: () => void
}

// ============================================
// BUTTON COMPONENTS
// ============================================

interface SaveCategoryButtonProps {
  name: string
  editingCategory: ProductCategory | null
  onSave: () => Promise<void>
  isSaving: boolean
  onSetCompleted: (v: boolean) => void
  onSetMessage: (v: string) => void
}

function SaveCategoryButton({ name, editingCategory, onSave, isSaving, onSetCompleted, onSetMessage }: SaveCategoryButtonProps) {
  const t = useIntl()
  const tCommon = useIntl()
  const { goToStep } = useModal()
  const isValid = name.trim().length > 0
  const hasChanges = editingCategory ? name.trim() !== editingCategory.name : true

  const handleSave = () => {
    onSetCompleted(true)
    onSetMessage(editingCategory ? t.formatMessage({
      id: 'productSettings.category_updated'
    }) : t.formatMessage({
      id: 'productSettings.category_created'
    }))
    goToStep(4)
    onSave()
  }

  return (
    <button
      type="button"
      onClick={handleSave}
      className="btn btn-primary flex-1"
      disabled={isSaving || !isValid || !hasChanges}
    >
      {isSaving ? <Spinner /> : tCommon.formatMessage({
        id: 'common.save'
      })}
    </button>
  );
}

interface DeleteCategoryButtonProps {
  onDelete: () => Promise<void>
  isDeleting: boolean
  onSetCompleted: (v: boolean) => void
  onSetMessage: (v: string) => void
}

// ============================================
// SORTABLE CATEGORY ITEM
// ============================================

interface SortableCategoryItemProps {
  category: ProductCategory
  onEditClick: () => void
  onDeleteClick: () => void
  onDragEnd: () => void
}

function SortableCategoryItem({ category, onEditClick, onDeleteClick, onDragEnd }: SortableCategoryItemProps) {
  const t = useIntl()
  // dragListener=false + manual controls means only the grip button starts a
  // drag — tapping anywhere else on the row (edit/delete icons) behaves as
  // a normal click.
  const controls = useDragControls()

  return (
    <Reorder.Item
      as="div"
      value={category}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDragEnd}
      className="list-item-clickable list-item-flat"
    >
      <button
        type="button"
        onPointerDown={(e) => controls.start(e)}
        className="p-1 text-text-tertiary cursor-grab active:cursor-grabbing touch-none"
        aria-label={t.formatMessage({
          id: 'productSettings.drag_to_reorder_aria'
        })}
      >
        <GripVertical style={{ width: 16, height: 16 }} />
      </button>
      <div className="flex-1 min-w-0">
        <span className="font-medium block truncate">{category.name}</span>
      </div>
      <button
        type="button"
        onClick={onEditClick}
        className="p-1 text-text-tertiary hover:text-text-primary transition-colors"
        aria-label={t.formatMessage({
          id: 'productSettings.edit_category_aria'
        })}
      >
        <Pencil style={{ width: 16, height: 16 }} />
      </button>
      <button
        type="button"
        onClick={onDeleteClick}
        className="p-1 text-error hover:text-error transition-colors"
        aria-label={t.formatMessage({
          id: 'productSettings.delete_category_aria'
        })}
      >
        <Trash2 style={{ width: 16, height: 16 }} />
      </button>
    </Reorder.Item>
  );
}

// ============================================
// SORTABLE CATEGORY LIST
// ============================================

interface SortableCategoryListProps {
  categories: ProductCategory[]
  onReorder: (categoryIds: string[]) => Promise<boolean>
  onEditCategory: (category: ProductCategory) => void
  onDeleteCategory: (category: ProductCategory) => void
}

function SortableCategoryList({ categories, onReorder, onEditCategory, onDeleteCategory }: SortableCategoryListProps) {
  const { goToStep } = useModal()
  // Local mirror of the ordered list. framer-motion's Reorder.Group calls
  // onReorder repeatedly during the drag gesture with the intermediate
  // ordering, so we track it locally and only persist the final order once
  // the drag ends.
  const [items, setItems] = useState(categories)
  const itemsRef = useRef(items)

  // Keep local state in sync with the authoritative prop whenever it
  // changes externally (after a successful persist, or category add/delete).
  useEffect(() => {
    setItems(categories)
    itemsRef.current = categories
  }, [categories])

  const handleReorder = (newItems: ProductCategory[]) => {
    setItems(newItems)
    itemsRef.current = newItems
  }

  const handleDragEnd = () => {
    // Use the ref so we see the final ordering from the last onReorder call,
    // not a closed-over stale `items` reference.
    onReorder(itemsRef.current.map(c => c.id))
  }

  return (
    <Reorder.Group as="div" axis="y" values={items} onReorder={handleReorder}>
      {items.map(category => (
        <SortableCategoryItem
          key={category.id}
          category={category}
          onEditClick={() => {
            onEditCategory(category)
            goToStep(2)
          }}
          onDeleteClick={() => {
            onDeleteCategory(category)
            goToStep(3)
          }}
          onDragEnd={handleDragEnd}
        />
      ))}
    </Reorder.Group>
  )
}

// ============================================
// BUTTON COMPONENTS (continued)
// ============================================

function DeleteCategoryButton({ onDelete, isDeleting, onSetCompleted, onSetMessage }: DeleteCategoryButtonProps) {
  const t = useIntl()
  const tCommon = useIntl()
  const { goToStep } = useModal()

  const handleDelete = () => {
    onSetCompleted(true)
    onSetMessage(t.formatMessage({
      id: 'productSettings.category_deleted'
    }))
    goToStep(4)
    onDelete()
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      className="btn btn-danger flex-1"
      disabled={isDeleting}
    >
      {isDeleting ? <Spinner /> : tCommon.formatMessage({
        id: 'common.delete'
      })}
    </button>
  );
}

// ============================================
// COMPONENT
// ============================================

export function ProductSettingsModal({
  isOpen,
  onClose,
  onExitComplete,
  categories,
  isCreatingCategory,
  isUpdatingCategory,
  isDeletingCategory,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  onReorderCategories,
  defaultCategoryId,
  sortPreference,
  isSavingSettings,
  onUpdateSettings,
  error,
  onClearError,
}: ProductSettingsModalProps) {
  const t = useIntl()
  const tCommon = useIntl()
  const tProducts = useIntl()

  const sortLabels: Record<SortPreference, string> = {
    name_asc: tProducts.formatMessage({
      id: 'products.sort_name_asc'
    }),
    name_desc: tProducts.formatMessage({
      id: 'products.sort_name_desc'
    }),
    price_asc: tProducts.formatMessage({
      id: 'products.sort_price_asc'
    }),
    price_desc: tProducts.formatMessage({
      id: 'products.sort_price_desc'
    }),
    category: tProducts.formatMessage({
      id: 'products.sort_category'
    }),
    stock_asc: tProducts.formatMessage({
      id: 'products.sort_stock_asc'
    }),
    stock_desc: tProducts.formatMessage({
      id: 'products.sort_stock_desc'
    }),
  }

  // Local state for form
  const [categoryName, setCategoryName] = useState('')
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<ProductCategory | null>(null)
  const [actionCompleted, setActionCompleted] = useState(false)
  const [actionMessage, setActionMessage] = useState('')

  // Local preferences state (saved on Done, not on change)
  const [localDefaultCategoryId, setLocalDefaultCategoryId] = useState<string | null>(defaultCategoryId)
  const [localSortPreference, setLocalSortPreference] = useState<SortPreference>(sortPreference)

  // Sync local state when props change (e.g., after save)
  useEffect(() => {
    setLocalDefaultCategoryId(defaultCategoryId)
  }, [defaultCategoryId])

  useEffect(() => {
    setLocalSortPreference(sortPreference)
  }, [sortPreference])

  // Reset form state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCategoryName('')
      setEditingCategory(null)
      setDeletingCategory(null)
      setActionCompleted(false)
      setActionMessage('')
      setLocalDefaultCategoryId(defaultCategoryId)
      setLocalSortPreference(sortPreference)
      onClearError()
    }
  }, [isOpen, onClearError, defaultCategoryId, sortPreference])

  // Handle category save (create or update)
  const handleSaveCategory = async () => {
    if (!categoryName.trim()) return

    if (editingCategory) {
      await onUpdateCategory(editingCategory.id, categoryName.trim())
    } else {
      await onCreateCategory(categoryName.trim())
    }
  }

  // Handle category delete
  const handleDeleteCategory = async () => {
    if (!deletingCategory) return
    await onDeleteCategory(deletingCategory.id)
  }

  // Count products per category (would need to be passed in for accurate counts)
  const getCategoryProductCount = (_categoryId: string) => {
    // For now, return 0 - will need to implement product counting
    return 0
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onExitComplete={onExitComplete}
      title={t.formatMessage({
        id: 'productSettings.title'
      })}
    >
      {/* Step 0: Main menu */}
      <Modal.Step title={t.formatMessage({
        id: 'productSettings.title'
      })} hideBackButton>
        <Modal.Item>
          <Modal.GoToStepButton
            step={1}
            className="list-item-clickable list-item-flat w-full text-left"
          >
            <div className="flex-1 min-w-0">
              <span className="font-medium block">{t.formatMessage({
                id: 'productSettings.categories_menu_label'
              })}</span>
              <span className="text-xs text-text-tertiary">
                {t.formatMessage({
                  id: 'productSettings.categories_count'
                }, { count: categories.length })}
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-text-tertiary flex-shrink-0" />
          </Modal.GoToStepButton>
          <Modal.GoToStepButton
            step={5}
            className="list-item-clickable list-item-flat w-full text-left"
          >
            <div className="flex-1 min-w-0">
              <span className="font-medium block">{t.formatMessage({
                id: 'productSettings.preferences_menu_label'
              })}</span>
              <span className="text-xs text-text-tertiary">
                {t.formatMessage({
                  id: 'productSettings.preferences_menu_description'
                })}
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-text-tertiary flex-shrink-0" />
          </Modal.GoToStepButton>
        </Modal.Item>

        <Modal.Footer>
          <Modal.CancelBackButton />
        </Modal.Footer>
      </Modal.Step>
      {/* Step 1: Categories list */}
      <Modal.Step title={t.formatMessage({
        id: 'productSettings.categories_title'
      })} backStep={0}>
        {error && (
          <Modal.Item>
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
              {error}
            </div>
          </Modal.Item>
        )}

        <Modal.Item>
          {categories.length === 0 ? (
            <div className="text-center py-8 text-text-secondary">
              <p>{t.formatMessage({
                id: 'productSettings.no_categories'
              })}</p>
            </div>
          ) : (
          <SortableCategoryList
            categories={categories}
            onReorder={onReorderCategories}
            onEditCategory={(category) => {
              setEditingCategory(category)
              setCategoryName(category.name)
              setActionCompleted(false)
            }}
            onDeleteCategory={(category) => {
              setDeletingCategory(category)
              setActionCompleted(false)
            }}
          />
          )}
        </Modal.Item>

        <Modal.Footer>
          <Modal.CancelBackButton className="btn btn-secondary flex-1">
            {tCommon.formatMessage({
              id: 'common.back'
            })}
          </Modal.CancelBackButton>
          <Modal.GoToStepButton
            step={2}
            onClick={() => {
              setEditingCategory(null)
              setCategoryName('')
              setActionCompleted(false)
            }}
            className="btn btn-primary flex-1"
          >
            <Plus style={{ width: 16, height: 16 }} />
            {t.formatMessage({
              id: 'productSettings.add_category_button'
            })}
          </Modal.GoToStepButton>
        </Modal.Footer>
      </Modal.Step>
      {/* Step 2: Add/Edit category */}
      <Modal.Step title={editingCategory ? t.formatMessage({
        id: 'productSettings.edit_category_title'
      }) : t.formatMessage({
        id: 'productSettings.add_category_title'
      })} backStep={1}>
        {error && (
          <Modal.Item>
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
              {error}
            </div>
          </Modal.Item>
        )}

        <Modal.Item>
          <label htmlFor="category-name" className="label">
            {t.formatMessage({
              id: 'productSettings.category_name_label'
            })} <span className="text-error">*</span>
          </label>
          <input
            id="category-name"
            type="text"
            value={categoryName}
            onChange={e => setCategoryName(e.target.value)}
            className="input"
            placeholder={t.formatMessage({
              id: 'productSettings.category_name_placeholder'
            })}
            autoComplete="off"
          />
        </Modal.Item>

        <Modal.Footer>
          <Modal.CancelBackButton className="btn btn-secondary flex-1">
            {tCommon.formatMessage({
              id: 'common.back'
            })}
          </Modal.CancelBackButton>
          <SaveCategoryButton
            name={categoryName}
            editingCategory={editingCategory}
            onSave={handleSaveCategory}
            isSaving={isCreatingCategory || isUpdatingCategory}
            onSetCompleted={setActionCompleted}
            onSetMessage={setActionMessage}
          />
        </Modal.Footer>
      </Modal.Step>
      {/* Step 3: Delete category confirmation */}
      <Modal.Step title={t.formatMessage({
        id: 'productSettings.delete_category_title'
      })} backStep={1}>
        <Modal.Item>
          <p className="text-text-secondary">
            {t.formatMessage({
              id: 'productSettings.delete_category_confirm'
            }, { name: deletingCategory?.name ?? '' })}
            {getCategoryProductCount(deletingCategory?.id || '') > 0 && (
              <span className="block mt-2 text-sm text-warning">
                {t.formatMessage({
                  id: 'productSettings.delete_category_warning'
                })}
              </span>
            )}
          </p>
        </Modal.Item>

        <Modal.Footer>
          <Modal.GoToStepButton step={1} className="btn btn-secondary flex-1">
            {tCommon.formatMessage({
              id: 'common.cancel'
            })}
          </Modal.GoToStepButton>
          <DeleteCategoryButton
            onDelete={handleDeleteCategory}
            isDeleting={isDeletingCategory}
            onSetCompleted={setActionCompleted}
            onSetMessage={setActionMessage}
          />
        </Modal.Footer>
      </Modal.Step>
      {/* Step 4: Success */}
      <Modal.Step title={tCommon.formatMessage({
        id: 'common.done'
      })} hideBackButton className="modal-step--centered">
        <Modal.Item>
          <div className="flex flex-col items-center text-center py-4">
            <div style={{ width: 160, height: 160 }}>
              {actionCompleted && (
                <LottiePlayer
                  src="/animations/success.json"
                  loop={false}
                  autoplay={true}
                  delay={300}
                  style={{ width: 160, height: 160 }}
                />
              )}
            </div>
            <p
              className="text-lg font-semibold text-text-primary mt-4 transition-opacity duration-300"
              style={{ opacity: actionCompleted ? 1 : 0 }}
            >
              {actionMessage}
            </p>
          </div>
        </Modal.Item>

        <Modal.Footer>
          <Modal.GoToStepButton
            step={1}
            onClick={() => {
              setEditingCategory(null)
              setDeletingCategory(null)
              setCategoryName('')
              setActionCompleted(false)
            }}
            className="btn btn-primary flex-1"
          >
            {tCommon.formatMessage({
              id: 'common.done'
            })}
          </Modal.GoToStepButton>
        </Modal.Footer>
      </Modal.Step>
      {/* Step 5: Preferences */}
      <Modal.Step title={t.formatMessage({
        id: 'productSettings.preferences_title'
      })} backStep={0}>
        <Modal.Item>
          <label htmlFor="default-category" className="label">{t.formatMessage({
            id: 'productSettings.default_category_label'
          })}</label>
          <select
            id="default-category"
            value={localDefaultCategoryId || ''}
            onChange={(e) => setLocalDefaultCategoryId(e.target.value || null)}
            className={`input ${!localDefaultCategoryId ? 'select-placeholder' : ''}`}
          >
            <option value="">{t.formatMessage({
              id: 'productSettings.default_category_none'
            })}</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-text-tertiary mt-1">
            {t.formatMessage({
              id: 'productSettings.default_category_hint'
            })}
          </p>
        </Modal.Item>

        <Modal.Item>
          <label htmlFor="sort-preference" className="label">{t.formatMessage({
            id: 'productSettings.sort_preference_label'
          })}</label>
          <select
            id="sort-preference"
            value={localSortPreference}
            onChange={(e) => setLocalSortPreference(e.target.value as SortPreference)}
            className="input"
          >
            {SORT_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {sortLabels[option.value]}
              </option>
            ))}
          </select>
          <p className="text-xs text-text-tertiary mt-1">
            {t.formatMessage({
              id: 'productSettings.sort_preference_hint'
            })}
          </p>
        </Modal.Item>

        <Modal.Footer>
          <Modal.CancelBackButton className="btn btn-secondary flex-1">
            {tCommon.formatMessage({
              id: 'common.back'
            })}
          </Modal.CancelBackButton>
          <button
            type="button"
            className="btn btn-primary flex-1"
            disabled={isSavingSettings || (localDefaultCategoryId === defaultCategoryId && localSortPreference === sortPreference)}
            onClick={() => {
              onUpdateSettings({
                defaultCategoryId: localDefaultCategoryId,
                sortPreference: localSortPreference,
              })
            }}
          >
            {tCommon.formatMessage({
              id: 'common.save'
            })}
          </button>
        </Modal.Footer>
      </Modal.Step>
    </Modal>
  );
}
