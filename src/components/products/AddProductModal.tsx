'use client'

import { useLayoutEffect, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { CameraIcon, MagicWandIcon, JoinIcon, ImageAttachIcon } from '@/components/icons'
import { Spinner, Modal, useMorphingModal } from '@/components/ui'
import { LottiePlayerDynamic as LottiePlayer } from '@/components/animations'
import { useProductForm } from '@/contexts/product-form-context'
import { useProductFormValidation } from '@/contexts/product-form-context'
import { useIsMobile } from '@/hooks/useIsMobile'
import { ProductForm } from './ProductForm'
import { AiBarcodeStepBody } from './AiBarcodeStep'
import { SuggestedCategoryStep } from './SuggestedCategoryStep'
import type { ProductCategory } from '@/types'
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
  const { goToStep, currentStep } = useMorphingModal()
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
  const t = useTranslations('productForm')
  const { barcode } = useProductForm()
  const hasBarcode = Boolean(barcode.trim())

  return (
    <button
      type="button"
      onClick={onStartAiPipeline}
      className={`${hasBarcode ? 'btn btn-primary' : 'btn btn-secondary'} flex-1`}
    >
      {hasBarcode ? t('continue_button') : t('skip_for_now')}
    </button>
  )
}

// ============================================
// ANALYZING STEP BODY
// ============================================

function AnalyzingStepBody() {
  const t = useTranslations('aiPipeline')
  const { pipelineStep, isCompressing } = useProductForm()

  const label = isCompressing
    ? t('preparing_photo')
    : pipelineStep === 'identifying'
      ? t('identifying')
      : pipelineStep === 'generating'
        ? t('generating_icon')
        : pipelineStep === 'removing-bg'
          ? t('removing_bg')
          : t('analyzing')

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Spinner className="spinner-lg mb-4" />
      <p className="text-sm text-text-secondary">{label}</p>
      <p className="text-xs text-text-tertiary mt-1">{t('may_take_seconds')}</p>
    </div>
  )
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
  const { goToStep, currentStep } = useMorphingModal()
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const isMobile = useIsMobile()

  // Whenever the user lands on (or returns to) step 1, clear any previously
  // captured photo so they can re-take. Also reset the file input value so
  // selecting the same file fires onChange again.
  useEffect(() => {
    if (currentStep === 1) {
      onClearPendingPhoto()
      if (cameraInputRef.current) {
        cameraInputRef.current.value = ''
      }
    }
  }, [currentStep, onClearPendingPhoto])

  const t = useTranslations('productForm')
  // On mobile the button should open the camera for a fresh snapshot
  // (fastest path for a user holding the physical product). On desktop
  // the same button opens the native file picker so the user can choose
  // a pre-taken photo — desktops rarely have a well-framed rear camera
  // and forcing webcam capture produces bad source images for AI.
  const buttonLabel = isMobile ? t('open_camera_button') : t('choose_photo_button')
  const buttonDescription = isMobile
    ? t('open_camera_desc')
    : t('choose_photo_desc')

  return (
    <>
      <button
        type="button"
        onClick={() => cameraInputRef.current?.click()}
        className="caja-action-btn caja-action-btn--large w-full"
      >
        <CameraIcon className="caja-action-btn__icon text-brand" />
        <div className="caja-action-btn__text">
          <span className="caja-action-btn__title">{buttonLabel}</span>
          <span className="caja-action-btn__desc">{buttonDescription}</span>
        </div>
      </button>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        // Only hint the camera on touch-first devices. Desktop browsers
        // that honor `capture` would otherwise open the webcam capture UI
        // instead of the native file picker, which is the bug this hook
        // is designed to avoid.
        {...(isMobile ? { capture: 'environment' as const } : {})}
        onChange={async (e) => {
          await onAiPhotoCapture(e)
          if (cameraInputRef.current) {
            cameraInputRef.current.value = ''
          }
          goToStep(2)
        }}
        className="hidden"
      />
    </>
  )
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
  const { goToStep } = useMorphingModal()
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
  const t = useTranslations('productForm')
  const tCommon = useTranslations('common')
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
  const { goToStep } = useMorphingModal()

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
        setError(t('failed_to_save'))
        return
      }

      setProductSaved(true)
      goToStep(6)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('failed_to_save'))
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
      {isSaving ? <Spinner /> : tCommon('save')}
    </button>
  )
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
  const t = useTranslations('productForm')
  const tCommon = useTranslations('common')
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
      title={t('title_add')}
    >
      {/* Step 0: Mode Selection */}
      <Modal.Step title={t('title_add')}>
        <AiPipelineNavigator needsCategory={needsCategory} />

        <Modal.Item>
          <div className="caja-actions caja-actions--stacked">
            <Modal.GoToStepButton step={1} className="caja-action-btn caja-action-btn--large">
              <MagicWandIcon className="caja-action-btn__icon text-brand" />
              <div className="caja-action-btn__text">
                <span className="caja-action-btn__title">{t('snap_to_add_title')}</span>
                <span className="caja-action-btn__desc">{t('snap_to_add_desc')}</span>
              </div>
            </Modal.GoToStepButton>

            <Modal.GoToStepButton step={5} className="caja-action-btn caja-action-btn--large">
              <JoinIcon className="caja-action-btn__icon text-text-secondary" />
              <div className="caja-action-btn__text">
                <span className="caja-action-btn__title">{t('add_manually_title')}</span>
                <span className="caja-action-btn__desc">{t('add_manually_desc')}</span>
              </div>
            </Modal.GoToStepButton>

            <button
              type="button"
              disabled
              className="caja-action-btn caja-action-btn--large w-full"
              title={t('add_from_document_desc')}
            >
              <ImageAttachIcon className="caja-action-btn__icon text-text-tertiary" />
              <div className="caja-action-btn__text">
                <span className="caja-action-btn__title">{t('add_from_document_title')}</span>
                <span className="caja-action-btn__desc">{t('add_from_document_desc')}</span>
              </div>
            </button>
          </div>
        </Modal.Item>

        <Modal.Footer>
          <Modal.CancelBackButton />
          <button type="button" onClick={onOpenSettings} className="btn btn-primary flex-1">
            {t('settings_button')}
          </button>
        </Modal.Footer>
      </Modal.Step>

      {/* Step 1: AI - Product photo */}
      <Modal.Step title={t('ai_step_photo_title')} backStep={0}>
        <Modal.Item>
          <div className="text-xs font-medium uppercase tracking-wide text-text-tertiary mb-2 text-center">
            {t('ai_step_photo_indicator')}
          </div>
          <p className="text-sm text-text-secondary mb-4 text-center">
            {t('ai_step_photo_instructions')}
          </p>
          <AiPhotoStepInput
            onAiPhotoCapture={onAiPhotoCapture}
            onClearPendingPhoto={onClearPendingPhoto}
          />
        </Modal.Item>
        <Modal.Footer>
          <Modal.BackButton>{tCommon('back')}</Modal.BackButton>
        </Modal.Footer>
      </Modal.Step>

      {/* Step 2: AI - Barcode */}
      <Modal.Step title={t('ai_step_barcode_title')} backStep={1}>
        {error && (
          <Modal.Item>
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
              {error}
            </div>
          </Modal.Item>
        )}
        <Modal.Item>
          <div className="text-xs font-medium uppercase tracking-wide text-text-tertiary mb-3 text-center">
            {t('ai_step_barcode_indicator')}
          </div>
          <AiBarcodeStepBody />
        </Modal.Item>
        <Modal.Footer>
          <AiBarcodeContinueButton onStartAiPipeline={onStartAiPipeline} />
        </Modal.Footer>
      </Modal.Step>

      {/* Step 3: Analyzing */}
      <Modal.Step title={t('ai_step_analyzing_title')} backStep={0} onBackStep={onAbortAiProcessing}>
        <Modal.Item>
          <AnalyzingStepBody />
        </Modal.Item>
        <Modal.Footer>
          <Modal.CancelBackButton>{tCommon('cancel')}</Modal.CancelBackButton>
        </Modal.Footer>
      </Modal.Step>

      {/* Step 4: Suggested category (conditional) */}
      <Modal.Step title={t('ai_step_new_category_title')} hideBackButton>
        <Modal.Item>
          <SuggestedCategoryStepWrapper
            suggestedCategoryName={suggestedCategoryName}
            categories={categories}
            onCreateCategory={onCreateCategory}
          />
        </Modal.Item>
        <Modal.Footer>
          <Modal.GoToStepButton step={5} className="btn btn-secondary flex-1">
            {t('skip_for_now')}
          </Modal.GoToStepButton>
        </Modal.Footer>
      </Modal.Step>

      {/* Step 5: Form (manual or AI-prefilled) */}
      <Modal.Step title={t('title_add')} backStep={0}>
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
      <Modal.Step title={t('title_created')} hideBackButton>
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
              {t('success_created_heading')}
            </p>
            <p
              className="text-sm text-text-secondary mt-1 transition-opacity duration-300 delay-100"
              style={{ opacity: productSaved ? 1 : 0 }}
            >
              {t('success_created_description')}
            </p>
          </div>
        </Modal.Item>
        <Modal.Footer>
          <button type="button" onClick={onClose} className="btn btn-primary flex-1">
            {tCommon('done')}
          </button>
        </Modal.Footer>
      </Modal.Step>
    </Modal>
  )
}
