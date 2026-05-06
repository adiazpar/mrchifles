'use client'

import { useIntl } from 'react-intl';
import { useRouter } from '@/lib/next-navigation-shim'
import { Modal, Spinner } from '@/components/ui'
import { useBusiness } from '@/contexts/business-context'
import { useLeaveBusiness } from '@/hooks/useLeaveBusiness'

interface Props { isOpen: boolean; onClose: () => void }

export function LeaveBusinessModal({ isOpen, onClose }: Props) {
  const t = useIntl()
  const tCommon = useIntl()
  const router = useRouter()
  const { business } = useBusiness()
  const { leave, isSubmitting, error, reset } = useLeaveBusiness()

  const handleLeave = async () => {
    const ok = await leave()
    if (ok) { onClose(); router.push('/') }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} onExitComplete={reset}>
      <Modal.Step title={t.formatMessage({
        id: 'manage.leave_business'
      })} hideBackButton>
        <Modal.Item>
          <p className="text-sm text-text-secondary">
            {t.formatMessage({
              id: 'manage.leave_business_warning'
            }, { businessName: business?.name ?? '' })}
          </p>
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
            onClick={handleLeave}
            disabled={isSubmitting}
            className="btn btn-primary flex-1"
            style={{ background: 'var(--color-error)' }}
          >
            {isSubmitting ? <Spinner size="sm" /> : t.formatMessage({
              id: 'manage.leave_business_button'
            })}
          </button>
        </Modal.Footer>
      </Modal.Step>
    </Modal>
  );
}
