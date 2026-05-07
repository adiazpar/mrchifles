'use client'

import { useIntl } from 'react-intl';
import { useState } from 'react'
import {
  IonCard,
  IonCardContent,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSpinner,
} from '@ionic/react'
import dynamic from '@/lib/next-dynamic-shim'
import { useRouter } from '@/lib/next-navigation-shim'
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
import { useAuthGate } from '@/contexts/auth-gate-context'
import { useIncomingTransferContext } from '@/contexts/incoming-transfer-context'
import { useTheme } from '@/hooks/useTheme'
import { getUserInitials } from '@kasero/shared/auth'
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

/**
 * Body of the Account page. The Ionic chrome (header + back button) is
 * provided by the route-level wrapper at `apps/web/src/routes/AccountPage.tsx`,
 * so this component renders ONLY the scrollable settings body.
 *
 * Renamed from `AccountPage` to `AccountPageContent` during the
 * apps/web migration to avoid colliding with the new route component.
 */
export function AccountPageContent() {
  const { user, isLoading } = useAuth()
  const { playExit } = useAuthGate()
  const router = useRouter()
  const intl = useIntl()
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
      <div className="flex h-full items-center justify-center">
        <IonSpinner name="crescent" />
      </div>
    )
  }

  if (!user) {
    router.push('/login')
    return null
  }

  const themeLabel = intl.formatMessage({
    id: `account.theme_${theme}`
  })

  const handleLogout = async () => {
    await playExit('/login')
  }

  return (
    <>
      <div className="py-6 space-y-8">
        {/* Profile header card — tappable, opens the edit profile modal */}
        <IonCard button onClick={() => setIsProfileModalOpen(true)} className="mx-4">
          <IonCardContent className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden bg-brand-subtle text-text-brand">
              {user.avatar ? (
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
          </IonCardContent>
        </IonCard>

        {/* Incoming transfer banner */}
        {incomingTransfer && (
          <IonCard button onClick={() => setIsTransferModalOpen(true)} className="mx-4">
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
                        }
                      )
                    : intl.formatMessage(
                        { id: 'account.incoming_transfer_description_anonymous' },
                        { business: incomingTransfer.business.name }
                      )}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-text-tertiary flex-shrink-0" />
            </IonCardContent>
          </IonCard>
        )}

        {/* Preferences */}
        <div>
          <h2 className="text-base font-semibold text-text-primary mb-2 px-4">
            {intl.formatMessage({ id: 'account.section_preferences' })}
          </h2>
          <IonList inset lines="full">
            <IonItem button detail onClick={() => setIsThemeModalOpen(true)}>
              <Palette slot="start" className="text-text-secondary w-5 h-5" />
              <IonLabel>
                <h3>{intl.formatMessage({ id: 'account.row_theme' })}</h3>
              </IonLabel>
              <IonNote slot="end">{themeLabel}</IonNote>
            </IonItem>
            <LanguageRow />
          </IonList>
        </div>

        {/* Security */}
        <div>
          <h2 className="text-base font-semibold text-text-primary mb-2 px-4">
            {intl.formatMessage({ id: 'account.section_security' })}
          </h2>
          <IonList inset lines="full">
            <IonItem button detail onClick={() => setIsPasswordModalOpen(true)}>
              <KeyRound slot="start" className="text-text-secondary w-5 h-5" />
              <IonLabel>
                <h3>{intl.formatMessage({ id: 'account.row_change_password' })}</h3>
              </IonLabel>
            </IonItem>
          </IonList>
        </div>

        {/* Support */}
        <div>
          <h2 className="text-base font-semibold text-text-primary mb-2 px-4">
            {intl.formatMessage({ id: 'account.section_support' })}
          </h2>
          <IonList inset lines="full">
            <IonItem button detail onClick={() => setIsAboutModalOpen(true)}>
              <Info slot="start" className="text-text-secondary w-5 h-5" />
              <IonLabel>
                <h3>{intl.formatMessage({ id: 'account.row_about' })}</h3>
              </IonLabel>
            </IonItem>
            <IonItem button detail onClick={() => setIsSupportModalOpen(true)}>
              <CircleHelp slot="start" className="text-text-secondary w-5 h-5" />
              <IonLabel>
                <h3>{intl.formatMessage({ id: 'account.row_contact_support' })}</h3>
              </IonLabel>
            </IonItem>
          </IonList>
        </div>

        {/* Danger zone */}
        <div>
          <h2 className="text-base font-semibold text-error mb-2 px-4">
            {intl.formatMessage({ id: 'account.section_danger_zone' })}
          </h2>
          <IonList inset lines="full">
            <IonItem button detail onClick={handleLogout}>
              <LogOut slot="start" className="text-error w-5 h-5" />
              <IonLabel color="danger">
                <h3>{intl.formatMessage({ id: 'account.row_logout' })}</h3>
              </IonLabel>
            </IonItem>
            <IonItem button detail onClick={() => setIsDeleteModalOpen(true)}>
              <UserX slot="start" className="text-error w-5 h-5" />
              <IonLabel color="danger">
                <h3>{intl.formatMessage({ id: 'account.row_delete_account' })}</h3>
              </IonLabel>
            </IonItem>
          </IonList>
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
    </>
  )
}
