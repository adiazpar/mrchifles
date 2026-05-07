'use client'

import { useIntl } from 'react-intl';
import { useEffect, useState } from 'react'
import { TriangleAlert, Mail } from 'lucide-react'
import { Modal, Spinner, useModal, ConfirmationAnimation } from '@/components/ui'
import { useBusiness } from '@/contexts/business-context'
import { usePendingTransferContext } from '@/contexts/pending-transfer-context'
import { useTransferOwnership } from '@/hooks/useTransferOwnership'
import { fetchDeduped } from '@/lib/fetch'
import { getUserInitials } from '@kasero/shared/auth'

interface TeamMember {
  id: string
  email: string
  name: string
  avatar?: string | null
  role: 'owner' | 'partner' | 'employee'
  status: 'active' | 'disabled'
}

interface Props { isOpen: boolean; onClose: () => void }

export function TransferOwnershipModal({ isOpen, onClose }: Props) {
  const t = useIntl()
  const tCommon = useIntl()
  const tTeam = useIntl()
  const { business, businessId } = useBusiness()
  const { submit, isSubmitting, error, reset } = useTransferOwnership()
  const { refresh: refreshPendingTransfer } = usePendingTransferContext()

  const [members, setMembers] = useState<TeamMember[]>([])
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null)
  const [customEmail, setCustomEmail] = useState('')
  const [mode, setMode] = useState<'picker' | 'email'>('picker')
  const [typedConfirm, setTypedConfirm] = useState('')
  const [transferSent, setTransferSent] = useState(false)

  useEffect(() => {
    if (!isOpen || !businessId) return
    let cancelled = false
    async function load() {
      try {
        const res = await fetchDeduped(`/api/businesses/${businessId}/team`)
        const data = await res.json()
        if (cancelled) return
        const eligible: TeamMember[] = (data.teamMembers ?? []).filter(
          (m: TeamMember) => m.role !== 'owner'
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
    setTransferSent(false)
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

  const handleSubmit = async (): Promise<boolean> => {
    if (!recipientEmail) return false
    const ok = await submit(recipientEmail)
    if (ok) {
      // Refresh the shared pending-transfer state before the success step
      // is dismissed, so the manage-page banner and nav badge are ready.
      await refreshPendingTransfer()
      setTransferSent(true)
    }
    return ok
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} onExitComplete={handleExitComplete}>
      {/* Step 0: pick recipient */}
      <Modal.Step title={t.formatMessage({
        id: 'manage.transfer_ownership'
      })} hideBackButton>
        <Modal.Item>
          <p className="text-sm text-text-secondary text-center">
            {t.formatMessage({
              id: 'manage.transfer_pick_recipient_subtitle'
            })}
          </p>
        </Modal.Item>
        {mode === 'picker' && (
          <>
            <Modal.Item>
              <div className="flex flex-col gap-2">
                {members.map((m) => {
                  const isActive = m.status === 'active'
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedEmail(m.email)}
                      disabled={!isActive}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left w-full disabled:opacity-60 disabled:cursor-not-allowed ${
                        selectedEmail === m.email
                          ? 'border-brand bg-bg-elevated'
                          : 'border-border enabled:hover:border-brand-300'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full bg-brand-subtle flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {m.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          (<img
                            src={m.avatar}
                            alt=""
                            className="w-12 h-12 rounded-full object-cover"
                          />)
                        ) : (
                          <span className="text-sm font-bold text-brand">
                            {getUserInitials(m.name)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{m.name}</p>
                        <p className="text-xs text-text-tertiary truncate">{m.email}</p>
                      </div>
                      <div className="flex items-center justify-center">
                        <span className={`text-xs font-medium ${isActive ? 'text-success' : 'text-error'}`}>
                          {isActive ? tTeam.formatMessage({
                            id: 'team.status_active'
                          }) : tTeam.formatMessage({
                            id: 'team.status_disabled'
                          })}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Modal.Item>
            <Modal.Item>
              <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-text-tertiary">
                <div className="flex-1 h-px bg-border" />
                <span>{tCommon.formatMessage({
                  id: 'common.or'
                })}</span>
                <div className="flex-1 h-px bg-border" />
              </div>
            </Modal.Item>
            <Modal.Item>
              <button
                type="button"
                onClick={() => { setMode('email'); setSelectedEmail(null) }}
                className="w-full flex items-center justify-center gap-2 text-sm text-brand hover:text-brand-hover transition-colors"
              >
                <Mail className="w-4 h-4" />
                {t.formatMessage({
                  id: 'manage.transfer_enter_different_email'
                })}
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
              autoComplete="email"
            />
            <p className="text-xs text-text-tertiary mt-2">
              {t.formatMessage({
                id: 'manage.transfer_recipient_must_have_account'
              })}
            </p>
            <button
              type="button"
              onClick={() => { setMode('picker'); setCustomEmail('') }}
              className="text-xs text-text-secondary underline mt-2"
            >
              {tCommon.formatMessage({
                id: 'common.back'
              })}
            </button>
          </Modal.Item>
        )}
        <Modal.Footer>
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
            {tCommon.formatMessage({
              id: 'common.cancel'
            })}
          </button>
          <NextButton disabled={!isStep1Valid} />
        </Modal.Footer>
      </Modal.Step>
      {/* Step 1: confirm */}
      <Modal.Step title={t.formatMessage({
        id: 'manage.transfer_ownership'
      })}>
        <Modal.Item>
          <div className="p-3 bg-bg-muted rounded-lg flex items-start gap-3">
            <TriangleAlert className="w-5 h-5 text-text-secondary flex-shrink-0 mt-0.5" />
            <p className="text-sm text-text-secondary">
              {t.formatMessage({
                id: 'manage.transfer_confirm_warning'
              }, {
                recipient: recipient?.name ?? recipientEmail ?? '',
              })}
            </p>
          </div>
        </Modal.Item>
        <Modal.Item>
          <label htmlFor="transfer-confirm" className="label">
            {t.formatMessage({
              id: 'manage.transfer_type_to_confirm'
            }, { businessName: business?.name ?? '' })}
          </label>
          <input
            id="transfer-confirm"
            type="text"
            value={typedConfirm}
            onChange={(e) => setTypedConfirm(e.target.value)}
            className="input"
            placeholder={business?.name ?? ''}
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
          <SendTransferButton
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            disabled={isSubmitting || !isStep2Valid}
          />
        </Modal.Footer>
      </Modal.Step>
      {/* Step 2: success — plane lottie plays once the API confirms */}
      <Modal.Step title={t.formatMessage({
        id: 'manage.transfer_sent_title'
      })} hideBackButton>
        <Modal.Item>
          <ConfirmationAnimation
            type="success"
            src="/animations/plane.json"
            triggered={transferSent}
            title={t.formatMessage({
              id: 'manage.transfer_sent_heading'
            })}
            subtitle={t.formatMessage({
              id: 'manage.transfer_sent_subtitle'
            }, {
              recipient: recipient?.name ?? recipientEmail ?? '',
            })}
          />
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

function SendTransferButton({
  onSubmit,
  isSubmitting,
  disabled,
}: {
  onSubmit: () => Promise<boolean>
  isSubmitting: boolean
  disabled: boolean
}) {
  const { goToStep } = useModal()
  const t = useIntl()

  // Wait for the API result: success navigates to the animation step;
  // failure leaves the user on the confirm step with the error visible.
  const handleClick = async () => {
    const ok = await onSubmit()
    if (ok) goToStep(2)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className="btn btn-primary flex-1"
    >
      {isSubmitting ? <Spinner size="sm" /> : t.formatMessage({
        id: 'manage.transfer_send_request'
      })}
    </button>
  );
}

function NextButton({ disabled }: { disabled: boolean }) {
  const { goNext } = useModal()
  const tCommon = useIntl()
  return (
    <button type="button" onClick={goNext} disabled={disabled} className="btn btn-primary flex-1">
      {tCommon.formatMessage({
        id: 'common.continue'
      })}
    </button>
  );
}
