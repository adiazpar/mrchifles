'use client'

import { useTranslations } from 'next-intl'
import { Modal } from '@/components/ui/modal'

interface Props {
  isOpen: boolean
  itemCount: number
  onClose: () => void
  onConfirm: () => void
}

export function ClearCartConfirmModal({ isOpen, itemCount, onClose, onConfirm }: Props) {
  const t = useTranslations('sales.cart')
  return (
    <Modal isOpen={isOpen} title={t('confirm_clear_title')} onClose={onClose}>
      <Modal.Step title={t('confirm_clear_title')}>
        <div className="px-4 py-3 text-sm">
          {t('confirm_clear_body', { count: itemCount })}
        </div>
        <Modal.Footer>
          <button type="button" className="btn-secondary" onClick={onClose}>
            {t('confirm_clear_cancel')}
          </button>
          <button type="button" className="btn-danger" onClick={onConfirm}>
            {t('confirm_clear_action')}
          </button>
        </Modal.Footer>
      </Modal.Step>
    </Modal>
  )
}
