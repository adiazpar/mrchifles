'use client'

import { useIntl } from 'react-intl';
import { useEffect, useState } from 'react'
import { useRouter } from '@/lib/next-navigation-shim'
import { TriangleAlert } from 'lucide-react'
import { Modal, Spinner } from '@/components/ui'
import { useBusiness } from '@/contexts/business-context'
import { useDeleteBusiness } from '@/hooks/useDeleteBusiness'

interface Props { isOpen: boolean; onClose: () => void }

export function DeleteBusinessModal({ isOpen, onClose }: Props) {
  const t = useIntl()
  const tCommon = useIntl()
  const router = useRouter()
  const { business } = useBusiness()
  const { deleteBusiness, isSubmitting, error } = useDeleteBusiness()
  const [typed, setTyped] = useState('')

  useEffect(() => { if (isOpen) setTyped('') }, [isOpen])

  const canDelete = business && typed === business.name

  const handleDelete = async () => {
    if (!canDelete) return
    const ok = await deleteBusiness()
    if (ok) { onClose(); router.push('/') }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} onExitComplete={() => setTyped('')}>
      <Modal.Step title={t.formatMessage({
        id: 'manage.delete_business'
      })} hideBackButton>
        <Modal.Item>
          <div className="p-3 bg-error-subtle rounded-lg flex items-start gap-3">
            <TriangleAlert className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
            <p className="text-sm text-error">
              {t.formatMessage({
                id: 'manage.delete_business_warning'
              }, { businessName: business?.name ?? '' })}
            </p>
          </div>
        </Modal.Item>
        <Modal.Item>
          <label className="block text-sm font-medium text-text-primary mb-2">
            {t.formatMessage({
              id: 'manage.transfer_type_to_confirm'
            }, { businessName: business?.name ?? '' })}
          </label>
          <input
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
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
            onClick={handleDelete}
            disabled={isSubmitting || !canDelete}
            className="btn btn-primary flex-1"
            style={{ background: 'var(--color-error)' }}
          >
            {isSubmitting ? <Spinner size="sm" /> : t.formatMessage({
              id: 'manage.delete_business_button'
            })}
          </button>
        </Modal.Footer>
      </Modal.Step>
    </Modal>
  );
}
