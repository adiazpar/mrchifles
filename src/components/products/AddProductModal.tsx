'use client'

import { useLayoutEffect, useRef, useEffect } from 'react'
import { CameraIcon, JoinIcon } from '@/components/icons'
import { Spinner, Modal, useMorphingModal } from '@/components/ui'
import { LottiePlayerDynamic as LottiePlayer } from '@/components/animations'
import { useProductForm } from '@/contexts/product-form-context'
import { useProductFormValidation } from '@/contexts/product-form-context'
import { ProductForm } from './ProductForm'
import type { ProductCategory } from '@/types'
import type { ProductFormData } from './ProductModal'

// ============================================
// AI PIPELINE NAVIGATOR
// ============================================

function AiPipelineNavigator() {
  const { pipelineStep, isCompressing } = useProductForm()
  const { goToStep, currentStep } = useMorphingModal()
  const goToStepRef = useRef(goToStep)

  useLayoutEffect(() => {
    goToStepRef.current = goToStep
  })

  useEffect(() => {
    if (currentStep === 0 && (isCompressing || (pipelineStep !== 'idle' && pipelineStep !== 'complete' && pipelineStep !== 'error'))) {
      goToStepRef.current(2)
    }
  }, [isCompressing, pipelineStep, currentStep])

  useEffect(() => {
    if (currentStep === 2 && pipelineStep === 'complete') {
      goToStepRef.current(3)
    }
  }, [pipelineStep, currentStep])

  return null
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
      goToStep(4)
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
  onPipelineReset,
  onAiPhotoCapture,
  onOpenSettings,
}: AddProductModalProps) {
  const {
    setName,
    setPrice,
    error,
    isSaving,
    productSaved,
    aiProcessing,
    cameraInputRef,
  } = useProductForm()

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onExitComplete={onExitComplete}
      title="Add product"
    >
      {/* Step 0: Mode Selection */}
      <Modal.Step title="Add product">
        <AiPipelineNavigator />

        <Modal.Item>
          <div className="caja-actions caja-actions--stacked">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="caja-action-btn caja-action-btn--large"
            >
              <CameraIcon className="caja-action-btn__icon text-brand" />
              <div className="caja-action-btn__text">
                <span className="caja-action-btn__title">Snap to Add</span>
                <span className="caja-action-btn__desc">Take a photo and AI fills the data</span>
              </div>
            </button>

            <Modal.GoToStepButton
              step={1}
              className="caja-action-btn caja-action-btn--large"
            >
              <JoinIcon className="caja-action-btn__icon text-text-secondary" />
              <div className="caja-action-btn__text">
                <span className="caja-action-btn__title">Add manually</span>
                <span className="caja-action-btn__desc">Enter the product data yourself</span>
              </div>
            </Modal.GoToStepButton>
          </div>
        </Modal.Item>

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          capture="environment"
          onChange={onAiPhotoCapture}
          className="hidden"
        />

        <Modal.Footer>
          <Modal.CancelBackButton />
          <button
            type="button"
            onClick={onOpenSettings}
            className="btn btn-primary flex-1"
          >
            Settings
          </button>
        </Modal.Footer>
      </Modal.Step>

      {/* Step 1: Manual Form */}
      <Modal.Step title="Add product">
        {error && (
          <Modal.Item>
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
              {error}
            </div>
          </Modal.Item>
        )}

        <Modal.Item>
          <ProductForm
            categories={categories}
            idPrefix="add-manual"
            isOpen={isOpen}
          />
        </Modal.Item>

        <Modal.Footer>
          <SaveButton onSubmit={onSubmit} />
        </Modal.Footer>
      </Modal.Step>

      {/* Step 2: AI Processing */}
      <Modal.Step title="Analyzing..." backStep={0} onBackStep={onAbortAiProcessing}>
        <Modal.Item>
          <div className="flex flex-col items-center justify-center py-12">
            <Spinner className="spinner-lg mb-4" />
            <p className="text-sm text-text-secondary">Analyzing product...</p>
            <p className="text-xs text-text-tertiary mt-1">This may take a few seconds</p>
          </div>
        </Modal.Item>

        <Modal.Footer>
          <Modal.CancelBackButton>Cancel</Modal.CancelBackButton>
        </Modal.Footer>
      </Modal.Step>

      {/* Step 3: AI Review */}
      <Modal.Step title="Review product" backStep={0}>
        {error && (
          <Modal.Item>
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">
              {error}
            </div>
          </Modal.Item>
        )}

        <Modal.Item>
          <ProductForm
            categories={categories}
            idPrefix="add-ai"
            isOpen={isOpen}
          />
        </Modal.Item>

        <Modal.Footer>
          <Modal.BackButton
            onClick={() => {
              onPipelineReset()
              setName('')
              setPrice('')
            }}
            disabled={isSaving || aiProcessing}
          >
            Back
          </Modal.BackButton>
          <SaveButton onSubmit={onSubmit} />
        </Modal.Footer>
      </Modal.Step>

      {/* Step 4: Save success */}
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

    </>
  )
}
