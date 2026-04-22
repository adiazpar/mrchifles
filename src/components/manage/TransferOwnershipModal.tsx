'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { TriangleAlert, Mail } from 'lucide-react'
import { Modal, Spinner, useMorphingModal } from '@/components/ui'
import { useBusiness } from '@/contexts/business-context'
import { usePendingTransferContext } from '@/contexts/pending-transfer-context'
import { useTransferOwnership } from '@/hooks/useTransferOwnership'
import { fetchDeduped } from '@/lib/fetch'

interface TeamMember {
  id: string
  email: string
  name: string
  role: 'owner' | 'partner' | 'employee'
  status: 'active' | 'disabled'
}

interface Props { isOpen: boolean; onClose: () => void }

export function TransferOwnershipModal({ isOpen, onClose }: Props) {
  const t = useTranslations('manage')
  const tCommon = useTranslations('common')
  const { business, businessId } = useBusiness()
  const { submit, isSubmitting, error, reset } = useTransferOwnership()
  const { refresh: refreshPendingTransfer } = usePendingTransferContext()

  const [members, setMembers] = useState<TeamMember[]>([])
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null)
  const [customEmail, setCustomEmail] = useState('')
  const [mode, setMode] = useState<'picker' | 'email'>('picker')
  const [typedConfirm, setTypedConfirm] = useState('')

  useEffect(() => {
    if (!isOpen || !businessId) return
    let cancelled = false
    async function load() {
      try {
        const res = await fetchDeduped(`/api/businesses/${businessId}/team`)
        const data = await res.json()
        if (cancelled) return
        const eligible: TeamMember[] = (data.teamMembers ?? []).filter(
          (m: TeamMember) => m.role !== 'owner' && m.status === 'active'
        )
        setMembers(eligible)
      } catch (err) { console.error('Load team error:', err) }
    }
    load()
    return () => { cancelled = true }
  }, [isOpen, businessId])

  const handleExitComplete = () => {
    setSelectedEmail(null)
    setCustomEmail('')
    setMode('picker')
    setTypedConfirm('')
    reset()
  }

  const recipient = mode === 'picker'
    ? (selectedEmail ? members.find(m => m.email === selectedEmail) : null)
    : null
  const recipientEmail = mode === 'picker' ? selectedEmail : customEmail.trim()
  const isStep1Valid = mode === 'picker'
    ? !!selectedEmail
    : /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(customEmail.trim())
  const isStep2Valid = typedConfirm === business?.name

  const handleSubmit = async () => {
    if (!recipientEmail) return
    const ok = await submit(recipientEmail)
    if (ok) {
      // Refresh the shared pending-transfer state so the manage-page banner
      // and the mobile-nav badge re-render without a page reload.
      await refreshPendingTransfer()
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} onExitComplete={handleExitComplete}>
      {/* Step 0: pick recipient */}
      <Modal.Step title={t('transfer_ownership')} hideBackButton>
        <Modal.Item>
          <p className="text-sm text-text-secondary text-center">
            {t('transfer_pick_recipient_subtitle')}
          </p>
        </Modal.Item>
        {mode === 'picker' && (
          <>
            <Modal.Item>
              <div className="flex flex-col gap-2">
                {members.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedEmail(m.email)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                      selectedEmail === m.email
                        ? 'border-brand bg-brand-subtle'
                        : 'border-border hover:border-brand-300'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-bg-muted flex items-center justify-center text-sm font-semibold text-text-secondary flex-shrink-0">
                      {m.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{m.name}</p>
                      <p className="text-xs text-text-tertiary truncate">{m.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            </Modal.Item>
            <Modal.Item>
              <button
                type="button"
                onClick={() => { setMode('email'); setSelectedEmail(null) }}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-border text-sm text-text-secondary hover:border-brand hover:text-brand transition-all"
              >
                <Mail className="w-4 h-4" />
                {t('transfer_enter_different_email')}
              </button>
            </Modal.Item>
          </>
        )}
        {mode === 'email' && (
          <Modal.Item>
            <input
              type="email"
              value={customEmail}
              onChange={(e) => setCustomEmail(e.target.value)}
              placeholder="email@example.com"
              className="input"
              autoFocus
              autoComplete="email"
            />
            <p className="text-xs text-text-tertiary mt-2">
              {t('transfer_recipient_must_have_account')}
            </p>
            <button
              type="button"
              onClick={() => { setMode('picker'); setCustomEmail('') }}
              className="text-xs text-text-secondary underline mt-2"
            >
              {tCommon('back')}
            </button>
          </Modal.Item>
        )}
        <Modal.Footer>
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
            {tCommon('cancel')}
          </button>
          <NextButton disabled={!isStep1Valid} />
        </Modal.Footer>
      </Modal.Step>

      {/* Step 1: confirm */}
      <Modal.Step title={t('transfer_ownership')}>
        <Modal.Item>
          <div className="p-3 bg-bg-muted rounded-lg flex items-start gap-3">
            <TriangleAlert className="w-5 h-5 text-text-secondary flex-shrink-0 mt-0.5" />
            <p className="text-sm text-text-secondary">
              {t('transfer_confirm_warning', {
                recipient: recipient?.name ?? recipientEmail ?? '',
              })}
            </p>
          </div>
        </Modal.Item>
        <Modal.Item>
          <p className="text-sm text-text-primary text-center">
            {t('transfer_confirm_summary', {
              businessName: business?.name ?? '',
              recipient: recipient?.name ?? recipientEmail ?? '',
            })}
          </p>
        </Modal.Item>
        <Modal.Item>
          <label className="block text-sm font-medium text-text-primary mb-2">
            {t('transfer_type_to_confirm', { businessName: business?.name ?? '' })}
          </label>
          <input
            type="text"
            value={typedConfirm}
            onChange={(e) => setTypedConfirm(e.target.value)}
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
          <Modal.BackButton className="btn btn-secondary flex-1" />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !isStep2Valid}
            className="btn btn-primary flex-1"
          >
            {isSubmitting ? <Spinner size="sm" /> : t('transfer_send_request')}
          </button>
        </Modal.Footer>
      </Modal.Step>
    </Modal>
  )
}

function NextButton({ disabled }: { disabled: boolean }) {
  const { goNext } = useMorphingModal()
  const tCommon = useTranslations('common')
  return (
    <button type="button" onClick={goNext} disabled={disabled} className="btn btn-primary flex-1">
      {tCommon('continue')}
    </button>
  )
}
