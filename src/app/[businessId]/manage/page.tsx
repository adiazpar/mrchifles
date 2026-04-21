'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Building2, MapPin, Users, Truck, Crown, LogOut, Trash2, Palette } from 'lucide-react'
import { useBusiness } from '@/contexts/business-context'
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

  const [nameOpen, setNameOpen] = useState(false)
  const [typeOpen, setTypeOpen] = useState(false)
  const [locationOpen, setLocationOpen] = useState(false)
  const [logoOpen, setLogoOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const canEdit = role === 'owner' || role === 'partner'

  if (!business || !businessId) return null

  return (
    <main className="page-content space-y-2">
      <BusinessHeaderCard
        business={business}
        onTap={canEdit ? () => setLogoOpen(true) : undefined}
      />

      <SettingsSectionHeader label={t('section_details')} />
      <SettingsRow
        icon={Building2}
        label={t('row_name')}
        value={business.name}
        onClick={canEdit ? () => setNameOpen(true) : undefined}
        hideChevron={!canEdit}
      />
      <SettingsRow
        icon={Palette}
        label={t('row_type')}
        value={business.type ? tCreate(`business_type_${business.type}`) : '—'}
        onClick={canEdit ? () => setTypeOpen(true) : undefined}
        hideChevron={!canEdit}
      />
      <SettingsRow
        icon={MapPin}
        label={t('row_location')}
        value={`${business.locale} · ${business.currency}`}
        onClick={canEdit ? () => setLocationOpen(true) : undefined}
        hideChevron={!canEdit}
      />

      <SettingsSectionHeader label={t('section_shortcuts')} />
      <SettingsRow
        icon={Users}
        label={t('shortcut_team')}
        onClick={() => router.push(`/${businessId}/team`)}
      />
      <SettingsRow
        icon={Truck}
        label={t('shortcut_providers')}
        onClick={() => router.push(`/${businessId}/providers`)}
      />

      {isOwner && (
        <>
          <SettingsSectionHeader label={t('section_ownership')} />
          <PendingTransferCard />
          <SettingsRow
            icon={Crown}
            label={t('transfer_ownership')}
            onClick={() => setTransferOpen(true)}
          />
        </>
      )}

      <SettingsSectionHeader label={t('section_danger')} danger />
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
