'use client'

import { useLayoutEffect, useRef, useEffect } from 'react'
import { CameraIcon, MagicWandIcon, JoinIcon } from '@/components/icons'
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
  const { barcode } = useProductForm()
  const hasBarcode = Boolean(barcode.trim())

  return (
    <button
      type="button"
      onClick={onStartAiPipeline}
      className={`${hasBarcode ? 'btn btn-primary' : 'btn btn-secondary'} flex-1`}
    >
      {hasBarcode ? 'Continue' : 'Skip for now'}
    </button>
  )
}

// ============================================
// ANALYZING STEP BODY
// ============================================

function AnalyzingStepBody() {
  const { pipelineStep, isCompressing } = useProductForm()

  const label = isCompressing
    ? 'Preparing photo...'
    : pipelineStep === 'identifying'
      ? 'Identifying product...'
      : pipelineStep === 'generating'
        ? 'Generating icon...'
        : pipelineStep === 'removing-bg'
          ? 'Removing background...'
          : 'Analyzing product...'

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Spinner className="spinner-lg mb-4" />
      <p className="text-sm text-text-secondary">{label}</p>
      <p className="text-xs text-text-tertiary mt-1">This may take a few seconds</p>
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

  // On mobile the button should open the camera for a fresh snapshot
  // (fastest path for a user holding the physical product). On desktop
  // the same button opens the native file picker so the user can choose
  // a pre-taken photo — desktops rarely have a well-framed rear camera
  // and forcing webcam capture produces bad source images for AI.
  const buttonLabel = isMobile ? 'Open camera' : 'Choose a photo'
  const buttonDescription = isMobile
    ? "We'll move on once you snap the photo"
    : "We'll move on once you pick a photo"

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
        setError('Failed to save product')
        return
      }

      setProductSaved(true)
      goToStep(6)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save product')
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
      {isSaving ? <Spinner /> : 'Save'}
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
      title="Add product"
    >
      {/* Step 0: Mode Selection */}
      <Modal.Step title="Add product">
        <AiPipelineNavigator needsCategory={needsCategory} />

        <Modal.Item>
          <div className="caja-actions caja-actions--stacked">
            <Modal.GoToStepButton step={1} className="caja-action-btn caja-action-btn--large">
              <MagicWandIcon className="caja-action-btn__icon text-brand" />
              <div className="caja-action-btn__text">
                <span className="caja-action-btn__title">Snap to Add</span>
                <span className="caja-action-btn__desc">Take a photo and AI fills the data</span>
              </div>
            </Modal.GoToStepButton>

            <Modal.GoToStepButton step={5} className="caja-action-btn caja-action-btn--large">
              <JoinIcon className="caja-action-btn__icon text-text-secondary" />
              <div className="caja-action-btn__text">
                <span className="caja-action-btn__title">Add manually</span>
                <span className="caja-action-btn__desc">Enter the product data yourself</span>
              </div>
            </Modal.GoToStepButton>
          </div>
        </Modal.Item>

        <Modal.Footer>
          <Modal.CancelBackButton />
          <button type="button" onClick={onOpenSettings} className="btn btn-primary flex-1">
            Settings
          </button>
        </Modal.Footer>
      </Modal.Step>

      {/* Step 1: AI - Product photo */}
      <Modal.Step title="Take a product photo" backStep={0}>
        <Modal.Item>
          <div className="text-xs font-medium uppercase tracking-wide text-text-tertiary mb-2 text-center">
            Step 1 of 2
          </div>
          <p className="text-sm text-text-secondary mb-4 text-center">
            Take a clear, well-lit photo of the product. Center it in the frame and avoid glare.
          </p>
          <AiPhotoStepInput
            onAiPhotoCapture={onAiPhotoCapture}
            onClearPendingPhoto={onClearPendingPhoto}
          />
        </Modal.Item>
        <Modal.Footer>
          <Modal.BackButton>Back</Modal.BackButton>
        </Modal.Footer>
      </Modal.Step>

      {/* Step 2: AI - Barcode */}
      <Modal.Step title="Add a barcode" backStep={1}>
        {error && (
          <Modal.Item>
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
              {error}
            </div>
          </Modal.Item>
        )}
        <Modal.Item>
          <div className="text-xs font-medium uppercase tracking-wide text-text-tertiary mb-3 text-center">
            Step 2 of 2
          </div>
          <AiBarcodeStepBody />
        </Modal.Item>
        <Modal.Footer>
          <AiBarcodeContinueButton onStartAiPipeline={onStartAiPipeline} />
        </Modal.Footer>
      </Modal.Step>

      {/* Step 3: Analyzing */}
      <Modal.Step title="Analyzing..." backStep={0} onBackStep={onAbortAiProcessing}>
        <Modal.Item>
          <AnalyzingStepBody />
        </Modal.Item>
        <Modal.Footer>
          <Modal.CancelBackButton>Cancel</Modal.CancelBackButton>
        </Modal.Footer>
      </Modal.Step>

      {/* Step 4: Suggested category (conditional) */}
      <Modal.Step title="New category" hideBackButton>
        <Modal.Item>
          <SuggestedCategoryStepWrapper
            suggestedCategoryName={suggestedCategoryName}
            categories={categories}
            onCreateCategory={onCreateCategory}
          />
        </Modal.Item>
        <Modal.Footer>
          <Modal.GoToStepButton step={5} className="btn btn-secondary flex-1">
            Skip for now
          </Modal.GoToStepButton>
        </Modal.Footer>
      </Modal.Step>

      {/* Step 5: Form (manual or AI-prefilled) */}
      <Modal.Step title="Add product" backStep={0}>
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
      <Modal.Step title="Product created" hideBackButton>
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
              Product added!
            </p>
            <p
              className="text-sm text-text-secondary mt-1 transition-opacity duration-300 delay-100"
              style={{ opacity: productSaved ? 1 : 0 }}
            >
              The product has been created successfully
            </p>
          </div>
        </Modal.Item>
        <Modal.Footer>
          <button type="button" onClick={onClose} className="btn btn-primary flex-1">
            Done
          </button>
        </Modal.Footer>
      </Modal.Step>
    </Modal>
  )
}
