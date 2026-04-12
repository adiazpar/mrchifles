'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  Palette,
  KeyRound,
  Info,
  LifeBuoy,
  LogOut,
  UserX,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { useNavbar } from '@/contexts/navbar-context'
import { Spinner } from '@/components/ui'
import { useTheme } from '@/hooks/useTheme'
import { getUserInitials } from '@/lib/auth'
import { SettingsRow } from '@/components/account/SettingsRow'
import { SettingsSectionHeader } from '@/components/account/SettingsSectionHeader'
import { LanguageRow } from '@/components/account/LanguageRow'
import { ThemeModal } from '@/components/account/ThemeModal'
import { EditProfileModal } from '@/components/account/EditProfileModal'
import { IncomingTransferCard } from '@/components/account/IncomingTransferCard'
import { ChangePasswordModal } from '@/components/account/ChangePasswordModal'
import { AboutModal } from '@/components/account/AboutModal'
import { ContactSupportModal } from '@/components/account/ContactSupportModal'
import { DeleteAccountModal } from '@/components/account/DeleteAccountModal'

export default function AccountPage() {
  const { user, isLoading, logout } = useAuth()
  const router = useRouter()
  const { hide, show } = useNavbar()
  const t = useTranslations('account')
  const { theme } = useTheme()
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false)
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  // Hide the mobile nav while viewing account settings
  useEffect(() => {
    hide()
    return () => show()
  }, [hide, show])

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
    <main className="page-content page-content--no-navbar space-y-4">
      {/* Profile header card — tappable, opens the edit profile modal */}
      <button
        type="button"
        onClick={() => setIsProfileModalOpen(true)}
        className="card card-interactive w-full p-4 flex items-center gap-4 text-left"
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
        <ChevronRight className="w-5 h-5 text-text-tertiary flex-shrink-0" />
      </button>

      {/* Notifications: pending incoming ownership transfers (hides when none) */}
      <IncomingTransferCard />

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
            icon={LifeBuoy}
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
    </main>
  )
}
