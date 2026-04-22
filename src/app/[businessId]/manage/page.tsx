'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Building2, MapPin, Users, Handshake, Crown, LogOut, Trash2, Palette, ChevronRight } from 'lucide-react'
import { useBusiness } from '@/contexts/business-context'
import { useNavbar } from '@/contexts/navbar-context'
import { SettingsRow } from '@/components/account/SettingsRow'
import { SettingsSectionHeader } from '@/components/account/SettingsSectionHeader'
import {
  BusinessHeaderCard,
  EditNameModal,
  EditTypeModal,
  EditLocationModal,
  EditLogoModal,
  PendingTransferCard,
  TransferOwnershipModal,
  LeaveBusinessModal,
  DeleteBusinessModal,
} from '@/components/manage'

export default function ManagePage() {
  const t = useTranslations('manage')
  const tCreate = useTranslations('createBusiness')
  const router = useRouter()
  const { business, businessId, role, isOwner } = useBusiness()
  const { setSlideDirection, setSlideTargetPath, setPendingHref } = useNavbar()

  const [nameOpen, setNameOpen] = useState(false)
  const [typeOpen, setTypeOpen] = useState(false)
  const [locationOpen, setLocationOpen] = useState(false)
  const [logoOpen, setLogoOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
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

      {isOwner && (
        <div>
          <SettingsSectionHeader label={t('section_ownership')} />
          <PendingTransferCard />
          <div className="bg-bg-surface rounded-xl overflow-hidden">
            <SettingsRow
              icon={Crown}
              label={t('transfer_ownership')}
              onClick={() => setTransferOpen(true)}
            />
          </div>
        </div>
      )}

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
            <SettingsRow
              icon={Trash2}
              label={t('delete_business')}
              danger
              onClick={() => setDeleteOpen(true)}
            />
          )}
        </div>
      </div>

      <EditNameModal isOpen={nameOpen} onClose={() => setNameOpen(false)} />
      <EditTypeModal isOpen={typeOpen} onClose={() => setTypeOpen(false)} />
      <EditLocationModal isOpen={locationOpen} onClose={() => setLocationOpen(false)} />
      <EditLogoModal isOpen={logoOpen} onClose={() => setLogoOpen(false)} />
      <TransferOwnershipModal isOpen={transferOpen} onClose={() => setTransferOpen(false)} />
      <LeaveBusinessModal isOpen={leaveOpen} onClose={() => setLeaveOpen(false)} />
      <DeleteBusinessModal isOpen={deleteOpen} onClose={() => setDeleteOpen(false)} />
    </main>
  )
}
