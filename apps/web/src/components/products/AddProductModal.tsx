'use client'

import { useIntl } from 'react-intl';
import { useLayoutEffect, useRef, useEffect } from 'react'
import { Camera, Sparkles, UserPlus, FileScan, FileSpreadsheet } from 'lucide-react'
import { Spinner, Modal, useModal } from '@/components/ui'
import { LottiePlayerDynamic as LottiePlayer } from '@/components/animations'
import { hapticSuccess } from '@/lib/haptics'
import { useProductForm } from '@/contexts/product-form-context'
import { useProductFormValidation } from '@/contexts/product-form-context'
import { ProductForm } from './ProductForm'
import { AiBarcodeStepBody } from './AiBarcodeStep'
import { SuggestedCategoryStep } from './SuggestedCategoryStep'
import type { ProductCategory } from '@kasero/shared/types'
import type { ProductFormData } from './ProductModal'

// ============================================
// AI PIPELINE NAVIGATOR
// ============================================

function AiPipelineNavigator({
  needsCategory,
}: {
  needsCategory: boolean
}) {
  const { pipelineStep, isCompressing } = useProductForm()
  const { goToStep, currentStep } = useModal()
  const goToStepRef = useRef(goToStep)

  useLayoutEffect(() => {
    goToStepRef.current = goToStep
  })

  // While the pipeline is running, ensure we're on the analyzing step (3)
  useEffect(() => {
    const inProgress =
      isCompressing ||
      (pipelineStep !== 'idle' &&
        pipelineStep !== 'complete' &&
        pipelineStep !== 'error')
    if (inProgress && currentStep === 2) {
      goToStepRef.current(3)
    }
  }, [isCompressing, pipelineStep, currentStep])

  // When the pipeline completes, advance to either suggested-category (4) or form (5)
  useEffect(() => {
    if (currentStep === 3 && pipelineStep === 'complete') {
      goToStepRef.current(needsCategory ? 4 : 5)
    }
  }, [pipelineStep, currentStep, needsCategory])

  return null
}

// ============================================
// AI BARCODE CONTINUE BUTTON
// ============================================

function AiBarcodeContinueButton({
  onStartAiPipeline,
}: {
  onStartAiPipeline: () => void
}) {
  const t = useIntl()
  const { barcode } = useProductForm()
  const hasBarcode = Boolean(barcode.trim())

  return (
    <button
      type="button"
      onClick={onStartAiPipeline}
      className={`${hasBarcode ? 'btn btn-primary' : 'btn btn-secondary'} flex-1`}
    >
      {hasBarcode ? t.formatMessage({
        id: 'productForm.continue_button'
      }) : t.formatMessage({
        id: 'productForm.skip_for_now'
      })}
    </button>
  );
}

// ============================================
// ANALYZING STEP BODY
// ============================================

function AnalyzingStepBody() {
  const t = useIntl()
  const { pipelineStep, isCompressing } = useProductForm()

  const label = isCompressing
    ? t.formatMessage({
    id: 'aiPipeline.preparing_photo'
  })
    : pipelineStep === 'identifying'
      ? t.formatMessage({
    id: 'aiPipeline.identifying'
  })
      : pipelineStep === 'generating'
        ? t.formatMessage({
    id: 'aiPipeline.generating_icon'
  })
        : pipelineStep === 'removing-bg'
          ? t.formatMessage({
    id: 'aiPipeline.removing_bg'
  })
          : t.formatMessage({
    id: 'aiPipeline.analyzing'
  })

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Spinner className="spinner-lg mb-4" />
      <p className="text-sm text-text-secondary">{label}</p>
      <p className="text-xs text-text-tertiary mt-1">{t.formatMessage({
        id: 'aiPipeline.may_take_seconds'
      })}</p>
    </div>
  );
}

// ============================================
// AI PHOTO STEP INPUT
// ============================================

function AiPhotoStepInput({
  onAiPhotoCapture,
  onClearPendingPhoto,
}: {
  onAiPhotoCapture: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  onClearPendingPhoto: () => void
}) {
  const { goToStep, currentStep } = useModal()
  const photoInputRef = useRef<HTMLInputElement>(null)

  // Whenever the user lands on (or returns to) step 1, clear any previously
  // captured photo so they can re-take. Also reset the file input value so
  // selecting the same file fires onChange again.
  useEffect(() => {
    if (currentStep === 1) {
      onClearPendingPhoto()
      if (photoInputRef.current) {
        photoInputRef.current.value = ''
      }
    }
  }, [currentStep, onClearPendingPhoto])

  const t = useIntl()

  return (
    <>
      <button
        type="button"
        onClick={() => photoInputRef.current?.click()}
        className="caja-action-btn caja-action-btn--large w-full"
      >
        <Camera className="caja-action-btn__icon text-brand" />
        <div className="caja-action-btn__text">
          <span className="caja-action-btn__title">{t.formatMessage({
            id: 'productForm.choose_photo_button'
          })}</span>
          <span className="caja-action-btn__desc">{t.formatMessage({
            id: 'productForm.choose_photo_desc'
          })}</span>
        </div>
      </button>
      <input
        ref={photoInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        onChange={async (e) => {
          await onAiPhotoCapture(e)
          if (photoInputRef.current) {
            photoInputRef.current.value = ''
          }
          goToStep(2)
        }}
        className="hidden"
      />
    </>
  );
}

// ============================================
// SUGGESTED CATEGORY STEP WRAPPER
// ============================================

function SuggestedCategoryStepWrapper({
  suggestedCategoryName,
  categories,
  onCreateCategory,
}: {
  suggestedCategoryName: string | null
  categories: ProductCategory[]
  onCreateCategory: (name: string) => Promise<string | null>
}) {
  const { setCategoryId } = useProductForm()
  const { goToStep } = useModal()
  return (
    <SuggestedCategoryStep
      suggestedName={suggestedCategoryName ?? ''}
      categories={categories}
      onCreate={async (newName) => {
        const newId = await onCreateCategory(newName)
        if (newId) {
          setCategoryId(newId)
          goToStep(5)
        }
        return newId
      }}
      onPickExisting={(id) => {
        setCategoryId(id)
        goToStep(5)
      }}
    />
  )
}

// ============================================
// PROPS
// ============================================

export interface AddProductModalProps {
  isOpen: boolean
  onClose: () => void
  onExitComplete: () => void
  categories: ProductCategory[]
  onSubmit: (data: ProductFormData, editingProductId: string | null) => Promise<boolean>
  onAbortAiProcessing: () => void
  onPipelineReset: () => void
  onAiPhotoCapture: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  onOpenSettings: () => void
  /** AI suggested category name when no existing category fits (null otherwise) */
  suggestedCategoryName: string | null
  /** Create a new category. Returns the new id or null on failure. */
  onCreateCategory: (name: string) => Promise<string | null>
  /** Start the AI pipeline using the previously stashed image */
  onStartAiPipeline: () => void
  /** Clear the previously stashed AI photo (called when user re-enters step 1) */
  onClearPendingPhoto: () => void
}

// ============================================
// SAVE BUTTON
// ============================================

function SaveButton({ onSubmit }: { onSubmit: AddProductModalProps['onSubmit'] }) {
  const t = useIntl()
  const tCommon = useIntl()
  const {
    name,
    price,
    categoryId,
    active,
    generatedIconBlob,
    iconType,
    presetEmoji: formPresetEmoji,
    barcode,
    barcodeFormat,
    barcodeSource,
    isSaving,
    setIsSaving,
    setError,
    setProductSaved,
  } = useProductForm()
  const { isFormValid, hasChanges } = useProductFormValidation()
  const { goToStep } = useModal()

  const handleClick = async () => {
    setError('')
    setIsSaving(true)
    setProductSaved(false)

    try {
      const success = await onSubmit(
        { name, price, categoryId, active, generatedIconBlob, iconType, presetEmoji: formPresetEmoji, barcode, barcodeFormat, barcodeSource },
        null
      )

      if (!success) {
        setError(t.formatMessage({
          id: 'productForm.failed_to_save'
        }))
        return
      }

      setProductSaved(true)
      hapticSuccess()
      goToStep(6)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.formatMessage({
        id: 'productForm.failed_to_save'
      }))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="btn btn-primary flex-1"
      disabled={isSaving || !isFormValid || !hasChanges}
    >
      {isSaving ? <Spinner /> : tCommon.formatMessage({
        id: 'common.save'
      })}
    </button>
  );
}

// ============================================
// COMPONENT
// ============================================

export function AddProductModal({
  isOpen,
  onClose,
  onExitComplete,
  categories,
  onSubmit,
  onAbortAiProcessing,
  onAiPhotoCapture,
  onOpenSettings,
  suggestedCategoryName,
  onCreateCategory,
  onStartAiPipeline,
  onClearPendingPhoto,
}: AddProductModalProps) {
  const t = useIntl()
  const tCommon = useIntl()
  const {
    error,
    productSaved,
  } = useProductForm()

  const needsCategory = !!suggestedCategoryName

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onExitComplete={onExitComplete}
      title={t.formatMessage({
        id: 'productForm.title_add'
      })}
    >
      {/* Step 0: Mode Selection */}
      <Modal.Step title={t.formatMessage({
        id: 'productForm.title_add'
      })}>
        <AiPipelineNavigator needsCategory={needsCategory} />

        <Modal.Item>
          <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
            <defs>
              <linearGradient id="ai-icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0EA5E9" />
                <stop offset="100%" stopColor="#A855F7" />
              </linearGradient>
            </defs>
          </svg>
          <div className="caja-actions caja-actions--stacked">
            <div className="caja-actions">
              <Modal.GoToStepButton step={1} className="caja-action-btn caja-action-btn--large caja-action-btn--align-start">
                <Sparkles className="caja-action-btn__icon" color="url(#ai-icon-gradient)" />
                <div className="caja-action-btn__text">
                  <span className="caja-action-btn__title">{t.formatMessage({
                    id: 'productForm.snap_to_add_title'
                  })}</span>
                  <span className="caja-action-btn__desc">{t.formatMessage({
                    id: 'productForm.snap_to_add_desc'
                  })}</span>
                </div>
              </Modal.GoToStepButton>

              <button
                type="button"
                disabled
                className="caja-action-btn caja-action-btn--large caja-action-btn--align-start"
                title={t.formatMessage({
                  id: 'productForm.add_from_document_desc'
                })}
              >
                <FileScan className="caja-action-btn__icon" color="url(#ai-icon-gradient)" />
                <div className="caja-action-btn__text">
                  <span className="caja-action-btn__title">{t.formatMessage({
                    id: 'productForm.add_from_document_title'
                  })}</span>
                  <span className="caja-action-btn__desc">{t.formatMessage({
                    id: 'productForm.add_from_document_desc'
                  })}</span>
                </div>
              </button>
            </div>

            <div className="flex items-center gap-3" aria-hidden="true">
              <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
              <span className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                {tCommon.formatMessage({
                  id: 'common.or'
                })}
              </span>
              <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
            </div>

            <div className="caja-actions">
              <Modal.GoToStepButton step={5} className="caja-action-btn caja-action-btn--large caja-action-btn--align-start">
                <UserPlus className="caja-action-btn__icon text-text-secondary" />
                <div className="caja-action-btn__text">
                  <span className="caja-action-btn__title">{t.formatMessage({
                    id: 'productForm.add_manually_title'
                  })}</span>
                  <span className="caja-action-btn__desc">{t.formatMessage({
                    id: 'productForm.add_manually_desc'
                  })}</span>
                </div>
              </Modal.GoToStepButton>

              <button
                type="button"
                disabled
                className="caja-action-btn caja-action-btn--large caja-action-btn--align-start"
                title={t.formatMessage({
                  id: 'productForm.import_file_desc'
                })}
              >
                <FileSpreadsheet className="caja-action-btn__icon text-text-tertiary" />
                <div className="caja-action-btn__text">
                  <span className="caja-action-btn__title">{t.formatMessage({
                    id: 'productForm.import_file_title'
                  })}</span>
                  <span className="caja-action-btn__desc">{t.formatMessage({
                    id: 'productForm.import_file_desc'
                  })}</span>
                </div>
              </button>
            </div>
          </div>
        </Modal.Item>

        <Modal.Footer>
          <Modal.CancelBackButton />
          <button type="button" onClick={onOpenSettings} className="btn btn-primary flex-1">
            {t.formatMessage({
              id: 'productForm.settings_button'
            })}
          </button>
        </Modal.Footer>
      </Modal.Step>
      {/* Step 1: AI - Product photo */}
      <Modal.Step title={t.formatMessage({
        id: 'productForm.ai_step_photo_title'
      })} backStep={0}>
        <Modal.Item>
          <div className="text-xs font-medium uppercase tracking-wide text-text-tertiary mb-2 text-center">
            {t.formatMessage({
              id: 'productForm.ai_step_photo_indicator'
            })}
          </div>
          <p className="text-sm text-text-secondary mb-4 text-center">
            {t.formatMessage({
              id: 'productForm.ai_step_photo_instructions'
            })}
          </p>
          <AiPhotoStepInput
            onAiPhotoCapture={onAiPhotoCapture}
            onClearPendingPhoto={onClearPendingPhoto}
          />
        </Modal.Item>
        <Modal.Footer>
          <Modal.BackButton>{tCommon.formatMessage({
            id: 'common.back'
          })}</Modal.BackButton>
        </Modal.Footer>
      </Modal.Step>
      {/* Step 2: AI - Barcode */}
      <Modal.Step title={t.formatMessage({
        id: 'productForm.ai_step_barcode_title'
      })} backStep={1}>
        {error && (
          <Modal.Item>
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
              {error}
            </div>
          </Modal.Item>
        )}
        <Modal.Item>
          <div className="text-xs font-medium uppercase tracking-wide text-text-tertiary mb-3 text-center">
            {t.formatMessage({
              id: 'productForm.ai_step_barcode_indicator'
            })}
          </div>
          <AiBarcodeStepBody />
        </Modal.Item>
        <Modal.Footer>
          <AiBarcodeContinueButton onStartAiPipeline={onStartAiPipeline} />
        </Modal.Footer>
      </Modal.Step>
      {/* Step 3: Analyzing */}
      <Modal.Step title={t.formatMessage({
        id: 'productForm.ai_step_analyzing_title'
      })} backStep={0} onBackStep={onAbortAiProcessing}>
        <Modal.Item>
          <AnalyzingStepBody />
        </Modal.Item>
        <Modal.Footer>
          <Modal.CancelBackButton>{tCommon.formatMessage({
            id: 'common.cancel'
          })}</Modal.CancelBackButton>
        </Modal.Footer>
      </Modal.Step>
      {/* Step 4: Suggested category (conditional) */}
      <Modal.Step title={t.formatMessage({
        id: 'productForm.ai_step_new_category_title'
      })} hideBackButton>
        <Modal.Item>
          <SuggestedCategoryStepWrapper
            suggestedCategoryName={suggestedCategoryName}
            categories={categories}
            onCreateCategory={onCreateCategory}
          />
        </Modal.Item>
        <Modal.Footer>
          <Modal.GoToStepButton step={5} className="btn btn-secondary flex-1">
            {t.formatMessage({
              id: 'productForm.skip_for_now'
            })}
          </Modal.GoToStepButton>
        </Modal.Footer>
      </Modal.Step>
      {/* Step 5: Form (manual or AI-prefilled) */}
      <Modal.Step title={t.formatMessage({
        id: 'productForm.title_add'
      })} backStep={0}>
        {error && (
          <Modal.Item>
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">{error}</div>
          </Modal.Item>
        )}
        <Modal.Item>
          <ProductForm categories={categories} idPrefix="add" isOpen={isOpen} />
        </Modal.Item>
        <Modal.Footer>
          <SaveButton onSubmit={onSubmit} />
        </Modal.Footer>
      </Modal.Step>
      {/* Step 6: Save success */}
      <Modal.Step title={t.formatMessage({
        id: 'productForm.title_created'
      })} hideBackButton className="modal-step--centered">
        <Modal.Item>
          <div className="flex flex-col items-center text-center py-4">
            <div style={{ width: 160, height: 160 }}>
              {productSaved && (
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
              style={{ opacity: productSaved ? 1 : 0 }}
            >
              {t.formatMessage({
                id: 'productForm.success_created_heading'
              })}
            </p>
            <p
              className="text-sm text-text-secondary mt-1 transition-opacity duration-300 delay-100"
              style={{ opacity: productSaved ? 1 : 0 }}
            >
              {t.formatMessage({
                id: 'productForm.success_created_description'
              })}
            </p>
          </div>
        </Modal.Item>
        <Modal.Footer>
          <button type="button" onClick={onClose} className="btn btn-primary flex-1">
            {tCommon.formatMessage({
              id: 'common.done'
            })}
          </button>
        </Modal.Footer>
      </Modal.Step>
    </Modal>
  );
}
