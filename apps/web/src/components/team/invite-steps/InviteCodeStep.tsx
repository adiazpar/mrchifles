import { useIntl } from 'react-intl'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonContent,
  IonFooter,
  IonButtons,
  IonButton,
  IonIcon,
} from '@ionic/react'
import { close } from 'ionicons/icons'
import { ChevronRight, Copy, Share2, RefreshCw, Trash2 } from 'lucide-react'
import { useBusinessFormat } from '@/hooks/useBusinessFormat'
import type { InviteRole } from '@kasero/shared/types'
import { useInviteNavRef, useInviteCallbacks } from './InviteNavContext'
import { InviteDeleteCodeStep } from './InviteDeleteCodeStep'

/**
 * Active-code surface — the visual centerpiece of the flow.
 *
 * Layout:
 *   - Mono "INVITE · ACTIVE" eyebrow + Fraunces "Share this code" title
 *   - Code stamp: dashed top + bottom rules, big tracked JetBrains
 *     Mono code in the middle, role + expiry meta line under it,
 *     animated copy-confirmation toast docked under the stamp when
 *     copyFeedback === newCode.
 *   - Optional QR card under the stamp.
 *   - Action ledger: dotted-leader rows (Copy / Share / Regenerate /
 *     Revoke). Share row only renders when navigator.share is
 *     available. Revoke row carries oxblood styling and pushes the
 *     delete-confirm step.
 *
 * No back button — the user can only Done (close), copy/share, or
 * walk through the revoke flow. This matches the existing nav graph.
 */
export function InviteCodeStep() {
  const t = useIntl()
  const navRef = useInviteNavRef()
  const { formatDate } = useBusinessFormat()
  const {
    onClose,
    selectedRole,
    newCode,
    newCodeExpiresAt,
    qrDataUrl,
    isGenerating,
    copyFeedback,
    onRegenerateCode,
    onCopyCode,
  } = useInviteCallbacks()

  const roleLabels: Record<InviteRole, string> = {
    partner: t.formatMessage({ id: 'team.role_partner' }),
    employee: t.formatMessage({ id: 'team.role_employee' }),
  }

  const showCopyToast = !!newCode && copyFeedback === newCode

  // Web Share API is gated to https + secure contexts; render the row
  // only when supported so the ledger doesn't list a dead action.
  const canShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  const handleShare = async () => {
    if (!newCode || !canShare) return
    try {
      await navigator.share({ text: newCode })
    } catch {
      // User cancellation or share-sheet failure is non-fatal; the
      // code is still on screen.
    }
  }

  const handleRevoke = () => {
    navRef.current?.push(() => <InviteDeleteCodeStep />)
  }

  return (
    <IonPage>
      <IonHeader className="pm-header">
        <IonToolbar>
          <IonButtons slot="end">
            <IonButton
              fill="clear"
              onClick={onClose}
              aria-label={t.formatMessage({ id: 'common.close' })}
            >
              <IonIcon icon={close} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="pm-content">
        <div className="pm-shell">
          <header className="pm-hero">
            <span className="pm-hero__eyebrow">
              {t.formatMessage({ id: 'team.invite_v2.eyebrow_step2' })}
            </span>
            <h1 className="pm-hero__title">
              {t.formatMessage(
                { id: 'team.invite_v2.title_step2' },
                { em: (chunks) => <em>{chunks}</em> },
              )}
            </h1>
          </header>

          {/* Code stamp — printed-tag aesthetic. The dashed rules + corner
              ticks are decorative, the value itself is what the user
              shares. user-select on the value lets the long-press
              "select all" gesture grab the code cleanly. */}
          {newCode && (
            <div className="tm-invite__code-stamp">
              <div className="tm-invite__code-rule">
                <span className="tm-invite__code-rule-line" aria-hidden="true" />
                <span className="tm-invite__code-rule-caption">
                  {t.formatMessage({ id: 'team.invite_v2.eyebrow_step2' })}
                </span>
                <span className="tm-invite__code-rule-line" aria-hidden="true" />
              </div>

              <code className="tm-invite__code-value">{newCode}</code>

              <span className="tm-invite__code-meta">
                {newCodeExpiresAt
                  ? t.formatMessage(
                      { id: 'team.invite_v2.code_meta_format' },
                      {
                        role: roleLabels[selectedRole],
                        date: formatDate(newCodeExpiresAt),
                      },
                    )
                  : roleLabels[selectedRole]}
              </span>

              {showCopyToast && (
                <span className="tm-invite__toast" role="status" aria-live="polite">
                  {t.formatMessage({ id: 'team.invite_v2.code_copied_toast' })}
                </span>
              )}
            </div>
          )}

          {/* Paired QR stub — small hairline frame with mono caption. */}
          {qrDataUrl && (
            <div className="tm-invite__qr-card">
              <span className="tm-invite__qr-caption">
                {t.formatMessage({ id: 'team.invite_v2.code_qr_caption' })}
              </span>
              <span className="tm-invite__qr-frame">
                <img src={qrDataUrl} alt={t.formatMessage({ id: 'team.qr_alt' })} />
              </span>
            </div>
          )}

          {/* Action ledger — dotted-leader rows. Share row is conditional. */}
          <div className="tm-invite__actions">
            <button
              type="button"
              className="tm-invite__action-row"
              onClick={() => newCode && onCopyCode(newCode)}
              disabled={!newCode}
            >
              <span className="tm-invite__action-icon" aria-hidden="true">
                <Copy size={14} strokeWidth={1.7} />
              </span>
              <span className="tm-invite__action-label">
                {t.formatMessage({ id: 'team.invite_v2.action_copy' })}
              </span>
              <span className="tm-invite__action-leader" aria-hidden="true" />
              <ChevronRight className="tm-invite__action-chev" size={14} aria-hidden="true" />
            </button>

            {canShare && (
              <button
                type="button"
                className="tm-invite__action-row"
                onClick={handleShare}
                disabled={!newCode}
              >
                <span className="tm-invite__action-icon" aria-hidden="true">
                  <Share2 size={14} strokeWidth={1.7} />
                </span>
                <span className="tm-invite__action-label">
                  {t.formatMessage({ id: 'team.invite_v2.action_share' })}
                </span>
                <span className="tm-invite__action-leader" aria-hidden="true" />
                <ChevronRight className="tm-invite__action-chev" size={14} aria-hidden="true" />
              </button>
            )}

            <button
              type="button"
              className="tm-invite__action-row"
              onClick={() => onRegenerateCode()}
              disabled={isGenerating}
            >
              <span
                className={
                  isGenerating
                    ? 'tm-invite__action-icon tm-invite__action-icon--spinning'
                    : 'tm-invite__action-icon'
                }
                aria-hidden="true"
              >
                <RefreshCw size={14} strokeWidth={1.7} />
              </span>
              <span className="tm-invite__action-label">
                {isGenerating
                  ? t.formatMessage({ id: 'team.regenerating' })
                  : t.formatMessage({ id: 'team.invite_v2.action_regenerate' })}
              </span>
              <span className="tm-invite__action-leader" aria-hidden="true" />
              <ChevronRight className="tm-invite__action-chev" size={14} aria-hidden="true" />
            </button>

            <button
              type="button"
              className="tm-invite__action-row tm-invite__action-row--danger"
              onClick={handleRevoke}
            >
              <span className="tm-invite__action-icon" aria-hidden="true">
                <Trash2 size={14} strokeWidth={1.7} />
              </span>
              <span className="tm-invite__action-label">
                {t.formatMessage({ id: 'team.invite_v2.action_revoke' })}
              </span>
              <span className="tm-invite__action-leader" aria-hidden="true" />
              <ChevronRight className="tm-invite__action-chev" size={14} aria-hidden="true" />
            </button>
          </div>
        </div>
      </IonContent>

      <IonFooter className="pm-footer">
        <IonToolbar>
          <div className="modal-footer">
            <button
              type="button"
              className="order-modal__primary-pill"
              onClick={onClose}
            >
              {t.formatMessage({ id: 'team.invite_v2.code_done_button' })}
            </button>
          </div>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}
