'use client'

import { useIntl } from 'react-intl';
import { useEffect, useState } from 'react'
import { Modal, Spinner } from '@/components/ui'
import { useBusiness } from '@/contexts/business-context'
import { useUpdateBusiness } from '@/hooks/useUpdateBusiness'

interface Props { isOpen: boolean; onClose: () => void }

export function EditNameModal({ isOpen, onClose }: Props) {
  const t = useIntl()
  const tCommon = useIntl()
  const { business } = useBusiness()
  const { update, isSubmitting, error, reset } = useUpdateBusiness()
  const [name, setName] = useState(business?.name ?? '')

  useEffect(() => {
    if (isOpen) setName(business?.name ?? '')
  }, [isOpen, business?.name])

  const handleExitComplete = () => {
    setName('')
    reset()
  }

  const handleSave = async () => {
    const trimmed = name.trim()
    if (!trimmed || trimmed === business?.name) { onClose(); return }
    const ok = await update({ name: trimmed })
    if (ok) onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} onExitComplete={handleExitComplete}>
      <Modal.Step title={t.formatMessage({
        id: 'manage.edit_name_title'
      })} hideBackButton>
        <Modal.Item>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            className="input"
            autoComplete="off"
          />
        </Modal.Item>
        {error && (
          <Modal.Item>
            <div className="p-3 bg-error-subtle text-error text-sm rounded-lg">{error}</div>
          </Modal.Item>
        )}
        <Modal.Footer>
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
            {tCommon.formatMessage({
              id: 'common.cancel'
            })}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting || !name.trim()}
            className="btn btn-primary flex-1"
          >
            {isSubmitting ? <Spinner size="sm" /> : t.formatMessage({
              id: 'manage.save'
            })}
          </button>
        </Modal.Footer>
      </Modal.Step>
    </Modal>
  );
}
