'use client'

import { useEffect } from 'react'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Spinner } from '@/components/ui'
import { SupplierIcon } from '@/components/icons'
import { useProviderManagement } from '@/hooks'
import { useBusiness } from '@/contexts/business-context'
import { ProviderListItem, ProviderModal } from '@/components/providers'
import { useTranslations } from 'next-intl'
import { useNavbar } from '@/contexts/navbar-context'

export default function ProveedoresPage() {
  const { businessId } = useBusiness()
  const router = useRouter()
  const { setPendingHref, setSlideDirection, setSlideTargetPath, hide, show } = useNavbar()
  const t = useTranslations('providers')

  // Providers is a drill-down page (not in bottom nav). Hide the bottom nav
  // while viewing so it feels like a focused detail flow, matching Account
  // settings and the provider detail page.
  useEffect(() => {
    hide()
    return () => show()
  }, [hide, show])

  const {
    // Data
    providers,
    sortedProviders,
    isLoading,
    error,

    // Permissions
    canManage,

    // Modal state
    isModalOpen,
    editingProvider,
    isSaving,
    providerSaved,

    // Form state
    name,
    setName,
    phone,
    setPhone,
    email,
    setEmail,
    active,
    setActive,

    // Actions
    handleOpenModal,
    handleCloseModal,
    handleModalExitComplete,
    handleSubmit,
  } = useProviderManagement({ businessId: businessId || '' })

  if (isLoading) {
    return (
      <main className="page-loading">
        <Spinner className="spinner-lg" />
      </main>
    )
  }

  return (
    <>
      <main className="page-content space-y-6">
        {error && !isModalOpen && (
            <div className="p-4 bg-error-subtle text-error rounded-lg">
              {error}
            </div>
          )}

          {/* Providers Card - only show when providers exist */}
          {providers.length > 0 && (
            <div className="card p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">
                  {t('count', { count: providers.length })}
                </span>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => handleOpenModal()}
                    className="btn btn-primary"
                    style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-2) var(--space-4)', minHeight: 'unset', gap: 'var(--space-2)', borderRadius: 'var(--radius-md)' }}
                  >
                    <Plus style={{ width: 14, height: 14 }} />
                    {t('add_button')}
                  </button>
                )}
              </div>

              <hr className="border-border" />

              <div>
                {sortedProviders.map((provider) => (
                  <ProviderListItem
                    key={provider.id}
                    provider={provider}
                    onClick={() => {
                      const href = `/${businessId}/providers/${provider.id}`
                      setSlideTargetPath(href)
                      setSlideDirection('forward')
                      setPendingHref(href)
                      router.push(href)
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty state - no providers at all */}
          {providers.length === 0 && (
            <div className="empty-state-fill">
              <SupplierIcon className="empty-state-icon" />
              <h3 className="empty-state-title">{t('empty_title')}</h3>
              <p className="empty-state-description">
                {t('empty_description')}
              </p>
              {canManage && (
                <button
                  type="button"
                  onClick={() => handleOpenModal()}
                  className="btn btn-primary mt-4"
                  style={{ fontSize: 'var(--text-sm)', padding: '10px var(--space-5)', minHeight: 'unset', gap: 'var(--space-2)' }}
                >
                  <Plus className="w-4 h-4" />
                  {t('add_provider_button')}
                </button>
              )}
            </div>
          )}
      </main>

      {/* Provider Modal — only used for Add on this page (editing lives on
          the detail page), so delete controls are stubbed off. */}
      <ProviderModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onExitComplete={handleModalExitComplete}
        name={name}
        onNameChange={setName}
        phone={phone}
        onPhoneChange={setPhone}
        email={email}
        onEmailChange={setEmail}
        active={active}
        onActiveChange={setActive}
        editingProvider={editingProvider}
        isSaving={isSaving}
        error={error}
        providerSaved={providerSaved}
        onSubmit={handleSubmit}
        canDelete={false}
        isDeleting={false}
        providerDeleted={false}
        onDelete={async () => false}
      />
    </>
  )
}
