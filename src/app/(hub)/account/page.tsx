'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  Palette,
  KeyRound,
  Info,
  UserX,
  ChevronRight,
  CircleHelp,
  LogOut,
  ArrowRightLeft,
} from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { useIncomingTransferContext } from '@/contexts/incoming-transfer-context'
import { Spinner } from '@/components/ui'
import { useTheme } from '@/hooks/useTheme'
import { getUserInitials } from '@/lib/auth'
import { SettingsRow } from '@/components/account/SettingsRow'
import { SettingsSectionHeader } from '@/components/account/SettingsSectionHeader'
import { LanguageRow } from '@/components/account/LanguageRow'

// Every modal on this page is closed by default and only needed on user
// action. Dynamic import with `ssr: false` keeps the modal code (plus
// framer-motion transitively via the Modal compound) out of the initial
// account-page chunk.
const ThemeModal = dynamic(
  () => import('@/components/account/ThemeModal').then(m => m.ThemeModal),
  { ssr: false },
)
const EditProfileModal = dynamic(
  () => import('@/components/account/EditProfileModal').then(m => m.EditProfileModal),
  { ssr: false },
)
const ChangePasswordModal = dynamic(
  () => import('@/components/account/ChangePasswordModal').then(m => m.ChangePasswordModal),
  { ssr: false },
)
const AboutModal = dynamic(
  () => import('@/components/account/AboutModal').then(m => m.AboutModal),
  { ssr: false },
)
const ContactSupportModal = dynamic(
  () => import('@/components/account/ContactSupportModal').then(m => m.ContactSupportModal),
  { ssr: false },
)
const DeleteAccountModal = dynamic(
  () => import('@/components/account/DeleteAccountModal').then(m => m.DeleteAccountModal),
  { ssr: false },
)
const IncomingTransferModal = dynamic(
  () => import('@/components/transfer/IncomingTransferModal').then(m => m.IncomingTransferModal),
  { ssr: false },
)

export default function AccountPage() {
  const { user, isLoading, logout } = useAuth()
  const router = useRouter()
  const t = useTranslations('account')
  const { theme } = useTheme()
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false)
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const { transfer: incomingTransfer } = useIncomingTransferContext()

  if (isLoading) {
    return (
      <main className="page-loading">
        <Spinner className="spinner-lg" />
      </main>
    )
  }

  if (!user) {
    router.push('/login')
    return null
  }

  const themeLabel = t(`theme_${theme}`)

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  return (
    <main className="page-content space-y-4">
      {/* Profile header card — tappable, opens the edit profile modal */}
      <button
        type="button"
        onClick={() => setIsProfileModalOpen(true)}
        data-tap-feedback
        className="bg-bg-surface rounded-xl card-interactive w-full p-4 flex items-center gap-4 text-left data-[pressed='true']:bg-bg-muted"
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
          style={{ backgroundColor: 'var(--brand-100)', color: 'var(--brand-700)' }}
        >
          {user.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatar}
              alt=""
              className="w-14 h-14 rounded-full object-cover"
            />
          ) : (
            <span className="text-xl font-semibold">
              {getUserInitials(user.name)}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-base font-semibold text-text-primary truncate">
            {user.name}
          </div>
          <div className="text-sm text-text-tertiary truncate">
            {user.email}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-text-tertiary flex-shrink-0" />
      </button>

      {incomingTransfer && (
        <button
          type="button"
          onClick={() => setIsTransferModalOpen(true)}
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
            <ArrowRightLeft className="w-5 h-5 text-warning" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-warning">
              {t('incoming_transfer_heading')}
            </div>
            <div className="text-xs text-text-secondary mt-0.5 truncate">
              {incomingTransfer.fromUser
                ? t('incoming_transfer_description', {
                    name: incomingTransfer.fromUser.name,
                    business: incomingTransfer.business.name,
                  })
                : t('incoming_transfer_description_anonymous', {
                    business: incomingTransfer.business.name,
                  })}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-text-tertiary flex-shrink-0" />
        </button>
      )}

      {/* Preferences */}
      <div>
        <SettingsSectionHeader label={t('section_preferences')} />
        <div className="bg-bg-surface rounded-xl overflow-hidden">
          <SettingsRow
            icon={Palette}
            label={t('row_theme')}
            value={themeLabel}
            onClick={() => setIsThemeModalOpen(true)}
          />
          <div className="settings-divider" />
          <LanguageRow />
        </div>
      </div>

      {/* Security */}
      <div>
        <SettingsSectionHeader label={t('section_security')} />
        <div className="bg-bg-surface rounded-xl overflow-hidden">
          <SettingsRow
            icon={KeyRound}
            label={t('row_change_password')}
            onClick={() => setIsPasswordModalOpen(true)}
          />
        </div>
      </div>

      {/* Support */}
      <div>
        <SettingsSectionHeader label={t('section_support')} />
        <div className="bg-bg-surface rounded-xl overflow-hidden">
          <SettingsRow
            icon={Info}
            label={t('row_about')}
            onClick={() => setIsAboutModalOpen(true)}
          />
          <div className="settings-divider" />
          <SettingsRow
            icon={CircleHelp}
            label={t('row_contact_support')}
            onClick={() => setIsSupportModalOpen(true)}
          />
        </div>
      </div>

      {/* Danger zone */}
      <div>
        <SettingsSectionHeader label={t('section_danger_zone')} danger />
        <div className="bg-bg-surface rounded-xl overflow-hidden">
          <SettingsRow
            icon={LogOut}
            label={t('row_logout')}
            onClick={handleLogout}
            danger
          />
          <div className="settings-divider" />
          <SettingsRow
            icon={UserX}
            label={t('row_delete_account')}
            onClick={() => setIsDeleteModalOpen(true)}
            danger
          />
        </div>
      </div>

      <ThemeModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
      />
      <EditProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
      <AboutModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />
      <ContactSupportModal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
      />
      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
      />
      <IncomingTransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
      />
    </main>
  )
}
