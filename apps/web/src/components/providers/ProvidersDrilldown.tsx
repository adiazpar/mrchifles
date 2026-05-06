'use client'

import { Fragment } from 'react'
import { useRouter } from '@/lib/next-navigation-shim'
import { Plus, Handshake, ShoppingCart, Pencil, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Spinner, SwipeableRow } from '@/components/ui'
import { useProviderManagement } from '@/hooks'
import { useOrderFlows } from '@/hooks/useOrderFlows'
import { useOrders } from '@/contexts/orders-context'
import { ProviderListItem, ProviderModal } from '@/components/providers'
import { DrillDownHeader } from '@/components/layout/DrillDownHeader'

interface ProvidersDrilldownProps {
  businessId: string
}

export function ProvidersDrilldown({ businessId }: ProvidersDrilldownProps) {
  const router = useRouter()
  const t = useTranslations('providers')
  const tNav = useTranslations('navigation')

  const { setOrders } = useOrders()

  const {
    providers,
    sortedProviders,
    isLoading,
    error,
    canManage,
    isModalOpen,
    modalInitialStep,
    editingProvider,
    isSaving,
    providerSaved,
    isDeleting,
    providerDeleted,
    name,
    setName,
    phone,
    setPhone,
    email,
    setEmail,
    active,
    setActive,
    handleOpenModal,
    handleOpenDelete,
    handleCloseModal,
    handleModalExitComplete,
    handleSubmit,
    handleDelete,
  } = useProviderManagement({ businessId, setOrders })

  const orderFlows = useOrderFlows({
    businessId,
    providers,
    canDelete: canManage,
    canManage,
  })

  return (
    <>
      <DrillDownHeader title={tNav('providers')} onBack={() => router.back()} />
      {isLoading ? (
        <main className="page-loading">
          <Spinner className="spinner-lg" />
        </main>
      ) : (
        <main className="page-content space-y-6">
          {error && !isModalOpen && (
            <div className="p-4 bg-error-subtle text-error rounded-lg">
              {error}
            </div>
          )}

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
                    style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-2) var(--space-4)', minHeight: 'unset', gap: 'var(--space-2)', borderRadius: 'var(--radius-full)' }}
                  >
                    <Plus style={{ width: 14, height: 14 }} />
                    {t('add_button')}
                  </button>
                )}
              </div>

              <hr className="border-border" />

              <div className="list-divided">
                {sortedProviders.map((provider, i) => {
                  const swipeActions = canManage
                    ? [
                        {
                          icon: <ShoppingCart size={20} />,
                          label: t('action_new_order'),
                          variant: 'info' as const,
                          onClick: () => orderFlows.openNewOrder(provider.id),
                        },
                        {
                          icon: <Pencil size={20} />,
                          label: t('action_edit'),
                          variant: 'neutral' as const,
                          onClick: () => handleOpenModal(provider),
                        },
                        {
                          icon: <Trash2 size={20} />,
                          label: t('action_delete'),
                          variant: 'danger' as const,
                          onClick: () => handleOpenDelete(provider),
                        },
                      ]
                    : []
                  return (
                    <Fragment key={provider.id}>
                      {i > 0 && <hr className="list-divider" />}
                      {swipeActions.length > 0 ? (
                        <SwipeableRow actions={swipeActions}>
                          <ProviderListItem
                            provider={provider}
                            onClick={() => router.push(`/${businessId}/providers/${provider.id}`)}
                          />
                        </SwipeableRow>
                      ) : (
                        <ProviderListItem
                          provider={provider}
                          onClick={() => router.push(`/${businessId}/providers/${provider.id}`)}
                        />
                      )}
                    </Fragment>
                  )
                })}
              </div>
            </div>
          )}

          {providers.length === 0 && (
            <div className="empty-state-fill">
              <Handshake className="empty-state-icon" />
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
      )}

      <ProviderModal
        isOpen={isModalOpen}
        initialStep={modalInitialStep}
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
        canDelete={canManage}
        isDeleting={isDeleting}
        providerDeleted={providerDeleted}
        onDelete={handleDelete}
      />

      {orderFlows.modals}
    </>
  )
}
