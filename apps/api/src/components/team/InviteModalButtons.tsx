'use client'

import { useTranslations } from 'next-intl'
import { Spinner, useModal } from '@/components/ui'

// Generate code button component with modal navigation
export interface GenerateCodeButtonProps {
  isGenerating: boolean
  onGenerate: () => Promise<void>
}

export function GenerateCodeButton({
  isGenerating,
  onGenerate,
}: GenerateCodeButtonProps) {
  const t = useTranslations('team')
  const { goNext, lock, unlock } = useModal()

  const handleGenerate = async () => {
    lock()
    await onGenerate()
    unlock()
    goNext()
  }

  return (
    <button
      type="button"
      onClick={handleGenerate}
      className="btn btn-primary flex-1"
      disabled={isGenerating}
    >
      {isGenerating ? <Spinner /> : t('generate_code_button')}
    </button>
  )
}

// Confirm delete code button component
export interface ConfirmDeleteCodeButtonProps {
  isDeletingCode: boolean
  onDelete: () => Promise<boolean>
  successStep?: number
}

export function ConfirmDeleteCodeButton({
  isDeletingCode,
  onDelete,
  successStep = 3,
}: ConfirmDeleteCodeButtonProps) {
  const tCommon = useTranslations('common')
  const { goToStep } = useModal()

  const handleClick = () => {
    goToStep(successStep)
    onDelete()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="btn btn-danger flex-1"
      disabled={isDeletingCode}
    >
      {isDeletingCode ? <Spinner /> : tCommon('delete')}
    </button>
  )
}
