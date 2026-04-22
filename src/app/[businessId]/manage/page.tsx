'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Building2, MapPin, Users, Handshake, ArrowRightLeft, LogOut, Trash2, Palette, ChevronRight, Clock } from 'lucide-react'
import { useBusiness } from '@/contexts/business-context'
import { useNavbar } from '@/contexts/navbar-context'
import { usePendingTransferContext } from '@/contexts/pending-transfer-context'
import { SettingsRow } from '@/components/account/SettingsRow'
import { SettingsSectionHeader } from '@/components/account/SettingsSectionHeader'
import {
  BusinessHeaderCard,
  EditNameModal,
  EditTypeModal,
  EditLocationModal,
  EditLogoModal,
  TransferOwnershipModal,
  CancelTransferModal,
  LeaveBusinessModal,
  DeleteBusinessModal,
} from '@/components/manage'

export default function ManagePage() {
  const t = useTranslations('manage')
  const tCreate = useTranslations('createBusiness')
  const router = useRouter()
  const { business, businessId, role, isOwner } = useBusiness()
  const { setSlideDirection, setSlideTargetPath, setPendingHref } = useNavbar()
  const { transfer: pendingTransfer } = usePendingTransferContext()

  const [nameOpen, setNameOpen] = useState(false)
  const [typeOpen, setTypeOpen] = useState(false)
  const [locationOpen, setLocationOpen] = useState(false)
  const [logoOpen, setLogoOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [cancelTransferOpen, setCancelTransferOpen] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const canEdit = role === 'owner' || role === 'partner'

  const slideTo = (href: string) => {
    setSlideTargetPath(href)
    setSlideDirection('forward')
    setPendingHref(href)
    router.push(href)
  }

  if (!business || !businessId) return null

  return (
    <main className="page-content space-y-4">
      <BusinessHeaderCard
        business={business}
        onTap={canEdit ? () => setLogoOpen(true) : undefined}
      />

      {isOwner && pendingTransfer && (
        <button
          type="button"
          onClick={() => setCancelTransferOpen(true)}
          data-tap-feedback
          className="card banner-semantic banner-semantic--warning w-full p-3 flex items-center gap-3 text-left"
        >
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor:
                'color-mix(in oklab, var(--color-warning) 22%, transparent)',
            }}
          >
            <Clock className="w-5 h-5 text-warning" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-warning">
              {t('transfer_pending_heading')}
            </div>
            <div className="text-xs text-text-secondary mt-0.5 truncate">
              {t('transfer_pending_waiting', { recipient: pendingTransfer.toEmail })}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-text-tertiary flex-shrink-0" />
        </button>
      )}

      <div>
        <SettingsSectionHeader label={t('section_details')} />
        <div className="bg-bg-surface rounded-xl overflow-hidden">
          <SettingsRow
            icon={Building2}
            label={t('row_name')}
            value={business.name}
            onClick={canEdit ? () => setNameOpen(true) : undefined}
            hideChevron={!canEdit}
          />
          <div className="settings-divider" />
          <SettingsRow
            icon={Palette}
            label={t('row_type')}
            value={business.type ? tCreate(`business_type_${business.type}`) : '—'}
            onClick={canEdit ? () => setTypeOpen(true) : undefined}
            hideChevron={!canEdit}
          />
          <div className="settings-divider" />
          <SettingsRow
            icon={MapPin}
            label={t('row_location')}
            value={`${business.locale} · ${business.currency}`}
            onClick={canEdit ? () => setLocationOpen(true) : undefined}
            hideChevron={!canEdit}
          />
        </div>
      </div>

      <div>
        <SettingsSectionHeader label={t('section_shortcuts')} />
        <div className="caja-actions">
          <button
            type="button"
            onClick={() => slideTo(`/${businessId}/team`)}
            className="caja-action-btn caja-action-btn--large caja-action-btn--align-start"
          >
            <div className="flex items-start justify-between w-full">
              <Users className="caja-action-btn__icon text-brand" />
              <ChevronRight className="w-4 h-4 text-text-tertiary flex-shrink-0" />
            </div>
            <div className="caja-action-btn__text">
              <span className="caja-action-btn__title">{t('shortcut_team')}</span>
              <span className="caja-action-btn__desc">{t('shortcut_team_desc')}</span>
            </div>
          </button>
          <button
            type="button"
            onClick={() => slideTo(`/${businessId}/providers`)}
            className="caja-action-btn caja-action-btn--large caja-action-btn--align-start"
          >
            <div className="flex items-start justify-between w-full">
              <Handshake className="caja-action-btn__icon text-brand" />
              <ChevronRight className="w-4 h-4 text-text-tertiary flex-shrink-0" />
            </div>
            <div className="caja-action-btn__text">
              <span className="caja-action-btn__title">{t('shortcut_providers')}</span>
              <span className="caja-action-btn__desc">{t('shortcut_providers_desc')}</span>
            </div>
          </button>
        </div>
      </div>

      <div>
        <SettingsSectionHeader label={t('section_danger')} danger />
        <div className="bg-bg-surface rounded-xl overflow-hidden">
          {!isOwner && (
            <SettingsRow
              icon={LogOut}
              label={t('leave_business')}
              danger
              onClick={() => setLeaveOpen(true)}
            />
          )}
          {isOwner && (
            <>
              <SettingsRow
                icon={ArrowRightLeft}
                label={t('transfer_ownership')}
                danger
                disabled={Boolean(pendingTransfer)}
                onClick={() => setTransferOpen(true)}
              />
              <div className="settings-divider" />
              <SettingsRow
                icon={Trash2}
                label={t('delete_business')}
                danger
                onClick={() => setDeleteOpen(true)}
              />
            </>
          )}
        </div>
      </div>

      <EditNameModal isOpen={nameOpen} onClose={() => setNameOpen(false)} />
      <EditTypeModal isOpen={typeOpen} onClose={() => setTypeOpen(false)} />
      <EditLocationModal isOpen={locationOpen} onClose={() => setLocationOpen(false)} />
      <EditLogoModal isOpen={logoOpen} onClose={() => setLogoOpen(false)} />
      <TransferOwnershipModal isOpen={transferOpen} onClose={() => setTransferOpen(false)} />
      <CancelTransferModal isOpen={cancelTransferOpen} onClose={() => setCancelTransferOpen(false)} />
      <LeaveBusinessModal isOpen={leaveOpen} onClose={() => setLeaveOpen(false)} />
      <DeleteBusinessModal isOpen={deleteOpen} onClose={() => setDeleteOpen(false)} />
    </main>
  )
}
