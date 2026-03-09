/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Providers (Proveedores) feature
 *
 * Creates providers collection and adds provider relation to orders.
 */

const PROVIDERS_ID = "providers00001"
const ORDERS_ID = "orders0000001"

migrate((app) => {
  // ============================================
  // PROVIDERS
  // ============================================
  const providers = new Collection({
    id: PROVIDERS_ID,
    name: 'providers',
    type: 'base',
    system: false,
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.role = 'owner' || @request.auth.role = 'partner'",
    updateRule: "@request.auth.role = 'owner' || @request.auth.role = 'partner'",
    deleteRule: "@request.auth.role = 'owner' || @request.auth.role = 'partner'",
    fields: [
      {
        id: "provname0001",
        name: 'name',
        type: 'text',
        required: true,
        presentable: true,
      },
      {
        id: "provphone001",
        name: 'phone',
        type: 'text',
        required: false,
      },
      {
        id: "provemail001",
        name: 'email',
        type: 'email',
        required: false,
      },
      {
        id: "provnotes001",
        name: 'notes',
        type: 'text',
        required: false,
      },
      {
        id: "provactive01",
        name: 'active',
        type: 'bool',
        required: false,
      }
    ],
    indexes: [],
  })
  app.save(providers)

  // ============================================
  // ADD PROVIDER RELATION TO ORDERS
  // ============================================
  const orders = app.findCollectionByNameOrId(ORDERS_ID)
  if (orders) {
    orders.fields.add(new Field({
      id: "orderprov001",
      name: 'provider',
      type: 'relation',
      required: false,
      collectionId: PROVIDERS_ID,
      cascadeDelete: false,
      maxSelect: 1,
    }))
    app.save(orders)
  }

}, (app) => {
  // Revert migration

  // Remove provider field from orders
  const orders = app.findCollectionByNameOrId(ORDERS_ID)
  if (orders) {
    orders.fields.removeById("orderprov001")
    app.save(orders)
  }

  // Delete providers collection
  try {
    const providers = app.findCollectionByNameOrId('providers')
    if (providers) {
      app.delete(providers)
    }
  } catch (e) {
    // Collection doesn't exist, skip
  }
})
