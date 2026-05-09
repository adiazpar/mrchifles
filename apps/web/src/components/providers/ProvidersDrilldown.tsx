'use client'

import { useIntl } from 'react-intl';
import { useRouter } from '@/lib/next-navigation-shim'
import { Plus, Handshake } from 'lucide-react'
import {
  IonButton,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonList,
} from '@ionic/react'
import { useProviderManagement } from '@/hooks'
import { useOrderFlows } from '@/hooks/useOrderFlows'
import { useOrders } from '@/contexts/orders-context'
import { ProviderListItem, ProviderModal } from '@/components/providers'
import { PageSpinner } from '@/components/ui'

interface ProvidersDrilldownProps {
  businessId: string
}

/**
 * The wrapping `IonHeader` + `IonBackButton` inside `ProvidersTab`
 * provides the title and back affordance for this view.
 */
export function ProvidersDrilldown({ businessId }: ProvidersDrilldownProps) {
  const router = useRouter()
  const intl = useIntl()

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
      {isLoading ? (
        <PageSpinner />
      ) : (
        <div className="px-4 py-6 space-y-6">
          {error && !isModalOpen && (
            <div className="p-4 bg-error-subtle text-error rounded-lg">
              {error}
            </div>
          )}

          {providers.length > 0 && (
            <div className="bg-bg-surface rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">
                  {intl.formatMessage({
                    id: 'providers.count'
                  }, { count: providers.length })}
                </span>
                {canManage && (
                  <IonButton
                    size="small"
                    shape="round"
                    onClick={() => handleOpenModal()}
                  >
                    <Plus slot="start" style={{ width: 14, height: 14 }} />
                    {intl.formatMessage({
                      id: 'providers.add_button'
                    })}
                  </IonButton>
                )}
              </div>

              <hr className="border-border" />

              <IonList lines="full" className="bg-bg-surface rounded-2xl overflow-hidden">
                {sortedProviders.map((provider) => {
                  const swipeActions = canManage
                    ? [
                        {
                          label: intl.formatMessage({
                            id: 'providers.action_new_order'
                          }),
                          color: 'primary' as const,
                          onClick: () => orderFlows.openNewOrder(provider.id),
                        },
                        {
                          label: intl.formatMessage({
                            id: 'providers.action_edit'
                          }),
                          color: 'medium' as const,
                          onClick: () => handleOpenModal(provider),
                        },
                        {
                          label: intl.formatMessage({
                            id: 'providers.action_delete'
                          }),
                          color: 'danger' as const,
                          onClick: () => handleOpenDelete(provider),
                        },
                      ]
                    : []
                  return (
                    <IonItemSliding key={provider.id}>
                      <IonItem lines="full">
                        <ProviderListItem
                          provider={provider}
                          onClick={() => router.push(`/${businessId}/providers/${provider.id}`)}
                        />
                      </IonItem>
                      {swipeActions.length > 0 && (
                        <IonItemOptions side="end">
                          {swipeActions.map((action) => (
                            <IonItemOption
                              key={action.label}
                              color={action.color}
                              onClick={action.onClick}
                            >
                              {action.label}
                            </IonItemOption>
                          ))}
                        </IonItemOptions>
                      )}
                    </IonItemSliding>
                  )
                })}
              </IonList>
            </div>
          )}

          {providers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Handshake className="w-16 h-16 text-text-tertiary mb-5" />
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                {intl.formatMessage({
                  id: 'providers.empty_title'
                })}
              </h3>
              <p className="text-sm text-text-secondary max-w-xs">
                {intl.formatMessage({
                  id: 'providers.empty_description'
                })}
              </p>
              {canManage && (
                <IonButton
                  size="small"
                  onClick={() => handleOpenModal()}
                  className="mt-4"
                >
                  <Plus slot="start" className="w-4 h-4" />
                  {intl.formatMessage({
                    id: 'providers.add_provider_button'
                  })}
                </IonButton>
              )}
            </div>
          )}
        </div>
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
  );
}
