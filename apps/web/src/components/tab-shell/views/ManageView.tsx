'use client'

import { useIntl } from 'react-intl';
import { useState } from 'react'
import { IonCard, IonCardContent, IonItem, IonLabel, IonList, IonNote } from '@ionic/react'
import dynamic from '@/lib/next-dynamic-shim'
import { Building2, MapPin, Users, Handshake, ArrowRightLeft, LogOut, Trash2, Briefcase, ChevronRight, Clock, ImageIcon } from 'lucide-react'
import { useBusiness } from '@/contexts/business-context'
import { usePageTransition } from '@/contexts/page-transition-context'
import { usePendingTransferContext } from '@/contexts/pending-transfer-context'
import { useIncomingTransferContext } from '@/contexts/incoming-transfer-context'
// Every modal below is closed by default; dynamic imports keep the modal
// code out of the initial manage-page chunk until the user opens one.

const EditNameModal = dynamic(
  () => import('@/components/manage/EditNameModal').then(m => m.EditNameModal),
  { ssr: false },
)
const EditTypeModal = dynamic(
  () => import('@/components/manage/EditTypeModal').then(m => m.EditTypeModal),
  { ssr: false },
)
const EditLocationModal = dynamic(
  () => import('@/components/manage/EditLocationModal').then(m => m.EditLocationModal),
  { ssr: false },
)
const EditLogoModal = dynamic(
  () => import('@/components/manage/EditLogoModal').then(m => m.EditLogoModal),
  { ssr: false },
)
const TransferOwnershipModal = dynamic(
  () => import('@/components/manage/TransferOwnershipModal').then(m => m.TransferOwnershipModal),
  { ssr: false },
)
const CancelTransferModal = dynamic(
  () => import('@/components/manage/CancelTransferModal').then(m => m.CancelTransferModal),
  { ssr: false },
)
const LeaveBusinessModal = dynamic(
  () => import('@/components/manage/LeaveBusinessModal').then(m => m.LeaveBusinessModal),
  { ssr: false },
)
const DeleteBusinessModal = dynamic(
  () => import('@/components/manage/DeleteBusinessModal').then(m => m.DeleteBusinessModal),
  { ssr: false },
)
const IncomingTransferModal = dynamic(
  () => import('@/components/transfer/IncomingTransferModal').then(m => m.IncomingTransferModal),
  { ssr: false },
)

export function ManageView() {
  const intl = useIntl()
  const { business, businessId, isOwner } = useBusiness()
  const { navigate } = usePageTransition()
  const { transfer: pendingTransfer } = usePendingTransferContext()
  const { transfer: incomingTransfer } = useIncomingTransferContext()

  const [nameOpen, setNameOpen] = useState(false)
  const [typeOpen, setTypeOpen] = useState(false)
  const [locationOpen, setLocationOpen] = useState(false)
  const [logoOpen, setLogoOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [cancelTransferOpen, setCancelTransferOpen] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [incomingTransferOpen, setIncomingTransferOpen] = useState(false)

  // Only show the incoming-transfer banner on the Manage page of the
  // target business. On any other business's Manage page the banner is
  // irrelevant (the transfer doesn't concern this business).
  const showIncomingTransferBanner =
    Boolean(incomingTransfer) &&
    incomingTransfer?.business.id === businessId

  const slideTo = (href: string) => navigate(href)

  if (!business || !businessId) return null

  return (
    <div className="px-4 py-6 space-y-6">
      {isOwner && pendingTransfer && (
        <IonCard button onClick={() => setCancelTransferOpen(true)} className="m-0">
          <IonCardContent className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-warning-subtle">
              <Clock className="w-5 h-5 text-warning" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-warning">
                {intl.formatMessage({ id: 'manage.transfer_pending_heading' })}
              </div>
              <div className="text-xs text-text-secondary mt-0.5 truncate">
                {intl.formatMessage(
                  { id: 'manage.transfer_pending_waiting' },
                  { recipient: pendingTransfer.toEmail },
                )}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-text-tertiary flex-shrink-0" />
          </IonCardContent>
        </IonCard>
      )}
      {showIncomingTransferBanner && incomingTransfer && (
        <IonCard button onClick={() => setIncomingTransferOpen(true)} className="m-0">
          <IonCardContent className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-warning-subtle">
              <ArrowRightLeft className="w-5 h-5 text-warning" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-warning">
                {intl.formatMessage({ id: 'account.incoming_transfer_heading' })}
              </div>
              <div className="text-xs text-text-secondary mt-0.5 truncate">
                {incomingTransfer.fromUser
                  ? intl.formatMessage(
                      { id: 'account.incoming_transfer_description' },
                      {
                        name: incomingTransfer.fromUser.name,
                        business: incomingTransfer.business.name,
                      },
                    )
                  : intl.formatMessage(
                      { id: 'account.incoming_transfer_description_anonymous' },
                      { business: incomingTransfer.business.name },
                    )}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-text-tertiary flex-shrink-0" />
          </IonCardContent>
        </IonCard>
      )}
      <div>
        <h2 className="text-base font-semibold text-text-primary mb-2 px-4">
          {intl.formatMessage({ id: 'manage.section_details' })}
        </h2>
        <IonList inset lines="full">
          <IonItem
            button={isOwner}
            detail={isOwner}
            onClick={isOwner ? () => setLogoOpen(true) : undefined}
          >
            <ImageIcon slot="start" className="text-text-secondary w-5 h-5" />
            <IonLabel>
              <h3>{intl.formatMessage({ id: 'manage.row_logo' })}</h3>
            </IonLabel>
          </IonItem>
          <IonItem
            button={isOwner}
            detail={isOwner}
            onClick={isOwner ? () => setNameOpen(true) : undefined}
          >
            <Building2 slot="start" className="text-text-secondary w-5 h-5" />
            <IonLabel>
              <h3>{intl.formatMessage({ id: 'manage.row_name' })}</h3>
            </IonLabel>
            <IonNote slot="end">{business.name}</IonNote>
          </IonItem>
          <IonItem
            button={isOwner}
            detail={isOwner}
            onClick={isOwner ? () => setTypeOpen(true) : undefined}
          >
            <Briefcase slot="start" className="text-text-secondary w-5 h-5" />
            <IonLabel>
              <h3>{intl.formatMessage({ id: 'manage.row_type' })}</h3>
            </IonLabel>
            <IonNote slot="end">
              {business.type
                ? intl.formatMessage({ id: `createBusiness.business_type_${business.type}` })
                : '—'}
            </IonNote>
          </IonItem>
          <IonItem
            button={isOwner}
            detail={isOwner}
            onClick={isOwner ? () => setLocationOpen(true) : undefined}
          >
            <MapPin slot="start" className="text-text-secondary w-5 h-5" />
            <IonLabel>
              <h3>{intl.formatMessage({ id: 'manage.row_location' })}</h3>
            </IonLabel>
            <IonNote slot="end">{`${business.locale} · ${business.currency}`}</IonNote>
          </IonItem>
        </IonList>
      </div>
      <div>
        <h2 className="text-base font-semibold text-text-primary mb-2 px-4">
          {intl.formatMessage({ id: 'manage.section_shortcuts' })}
        </h2>
        <div className="space-y-3">
          <IonCard button onClick={() => slideTo(`/${businessId}/team`)} className="m-0">
            <IonCardContent className="flex items-start gap-4 py-5">
              <div className="w-12 h-12 rounded-xl bg-brand-subtle flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 text-brand" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-base font-semibold text-text-primary">
                  {intl.formatMessage({ id: 'manage.shortcut_team' })}
                </div>
                <div className="text-sm text-text-secondary mt-1">
                  {intl.formatMessage({ id: 'manage.shortcut_team_desc' })}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-text-tertiary flex-shrink-0 mt-1" />
            </IonCardContent>
          </IonCard>
          <IonCard button onClick={() => slideTo(`/${businessId}/providers`)} className="m-0">
            <IonCardContent className="flex items-start gap-4 py-5">
              <div className="w-12 h-12 rounded-xl bg-brand-subtle flex items-center justify-center flex-shrink-0">
                <Handshake className="w-6 h-6 text-brand" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-base font-semibold text-text-primary">
                  {intl.formatMessage({ id: 'manage.shortcut_providers' })}
                </div>
                <div className="text-sm text-text-secondary mt-1">
                  {intl.formatMessage({ id: 'manage.shortcut_providers_desc' })}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-text-tertiary flex-shrink-0 mt-1" />
            </IonCardContent>
          </IonCard>
        </div>
      </div>
      <div>
        <h2 className="text-base font-semibold text-error mb-2 px-4">
          {intl.formatMessage({ id: 'manage.section_danger' })}
        </h2>
        <IonList inset lines="full">
          {!isOwner && (
            <IonItem button detail onClick={() => setLeaveOpen(true)}>
              <LogOut slot="start" className="text-error w-5 h-5" />
              <IonLabel color="danger">
                <h3>{intl.formatMessage({ id: 'manage.leave_business' })}</h3>
              </IonLabel>
            </IonItem>
          )}
          {isOwner && (
            <>
              <IonItem
                button
                detail
                disabled={Boolean(pendingTransfer)}
                onClick={() => setTransferOpen(true)}
              >
                <ArrowRightLeft slot="start" className="text-error w-5 h-5" />
                <IonLabel color="danger">
                  <h3>{intl.formatMessage({ id: 'manage.transfer_ownership' })}</h3>
                </IonLabel>
              </IonItem>
              <IonItem button detail onClick={() => setDeleteOpen(true)}>
                <Trash2 slot="start" className="text-error w-5 h-5" />
                <IonLabel color="danger">
                  <h3>{intl.formatMessage({ id: 'manage.delete_business' })}</h3>
                </IonLabel>
              </IonItem>
            </>
          )}
        </IonList>
      </div>
      <EditNameModal isOpen={nameOpen} onClose={() => setNameOpen(false)} />
      <EditTypeModal isOpen={typeOpen} onClose={() => setTypeOpen(false)} />
      <EditLocationModal isOpen={locationOpen} onClose={() => setLocationOpen(false)} />
      <EditLogoModal isOpen={logoOpen} onClose={() => setLogoOpen(false)} />
      <TransferOwnershipModal isOpen={transferOpen} onClose={() => setTransferOpen(false)} />
      <CancelTransferModal isOpen={cancelTransferOpen} onClose={() => setCancelTransferOpen(false)} />
      <LeaveBusinessModal isOpen={leaveOpen} onClose={() => setLeaveOpen(false)} />
      <DeleteBusinessModal isOpen={deleteOpen} onClose={() => setDeleteOpen(false)} />
      <IncomingTransferModal
        isOpen={incomingTransferOpen}
        onClose={() => setIncomingTransferOpen(false)}
      />
    </div>
  );
}
