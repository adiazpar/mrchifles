/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Simplified schema for Mr. Chifles business (PocketBase 0.36+)
 *
 * 5 tables:
 * - products: what we sell
 * - sales: customer transactions
 * - sale_items: line items per sale
 * - orders: purchases from DaSol
 * - order_items: line items per order
 */

const PRODUCTS_ID = "products00001"
const SALES_ID = "sales00000001"
const SALE_ITEMS_ID = "saleitems0001"
const ORDERS_ID = "orders0000001"
const ORDER_ITEMS_ID = "orderitems001"

migrate((app) => {
  // Delete old collections if they exist
  const collectionsToDelete = [
    'order_items',
    'orders',
    'sale_items',
    'sales',
    'cash_transactions',
    'cash_drawers',
    'products'
  ]

  for (const name of collectionsToDelete) {
    try {
      const collection = app.findCollectionByNameOrId(name)
      if (collection) {
        app.delete(collection)
      }
    } catch (e) {
      // Collection doesn't exist, skip
    }
  }

  // ============================================
  // PRODUCTS
  // ============================================
  const products = new Collection({
    id: PRODUCTS_ID,
    name: 'products',
    type: 'base',
    system: false,
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.role = 'owner' || @request.auth.role = 'partner'",
    fields: [
      {
        id: "prodname0001",
        name: 'name',
        type: 'text',
        required: true,
        presentable: true,
      },
      {
        id: "prodprice001",
        name: 'price',
        type: 'number',
        required: true,
        min: 0,
      },
      {
        id: "prodcost0001",
        name: 'costPrice',
        type: 'number',
        required: false,
        min: 0,
      },
      {
        id: "prodactive01",
        name: 'active',
        type: 'bool',
        required: false,
      }
    ],
    indexes: [],
  })
  app.save(products)

  // ============================================
  // SALES
  // ============================================
  const sales = new Collection({
    id: SALES_ID,
    name: 'sales',
    type: 'base',
    system: false,
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.role = 'owner' || @request.auth.role = 'partner'",
    fields: [
      {
        id: "saledate0001",
        name: 'date',
        type: 'date',
        required: true,
        presentable: true,
      },
      {
        id: "saletotal001",
        name: 'total',
        type: 'number',
        required: true,
        min: 0,
      },
      {
        id: "salepayment1",
        name: 'paymentMethod',
        type: 'select',
        required: true,
        values: ['cash', 'yape', 'pos'],
        maxSelect: 1,
      },
      {
        id: "salechannel1",
        name: 'channel',
        type: 'select',
        required: true,
        values: ['feria', 'whatsapp'],
        maxSelect: 1,
      },
      {
        id: "salenotes001",
        name: 'notes',
        type: 'text',
        required: false,
      },
      {
        id: "saleemployee",
        name: 'employee',
        type: 'relation',
        required: true,
        collectionId: "_pb_users_auth_",
        cascadeDelete: false,
        maxSelect: 1,
      }
    ],
    indexes: [],
  })
  app.save(sales)

  // ============================================
  // SALE_ITEMS
  // ============================================
  const saleItems = new Collection({
    id: SALE_ITEMS_ID,
    name: 'sale_items',
    type: 'base',
    system: false,
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.role = 'owner' || @request.auth.role = 'partner'",
    fields: [
      {
        id: "sisale000001",
        name: 'sale',
        type: 'relation',
        required: true,
        collectionId: SALES_ID,
        cascadeDelete: true,
        maxSelect: 1,
      },
      {
        id: "siproduct001",
        name: 'product',
        type: 'relation',
        required: true,
        collectionId: PRODUCTS_ID,
        cascadeDelete: false,
        maxSelect: 1,
      },
      {
        id: "siquantity01",
        name: 'quantity',
        type: 'number',
        required: true,
        min: 1,
        onlyInt: true,
      },
      {
        id: "siunitprice1",
        name: 'unitPrice',
        type: 'number',
        required: true,
        min: 0,
      },
      {
        id: "sisubtotal01",
        name: 'subtotal',
        type: 'number',
        required: true,
        min: 0,
      }
    ],
    indexes: [],
  })
  app.save(saleItems)

  // ============================================
  // ORDERS (purchases from DaSol)
  // ============================================
  const orders = new Collection({
    id: ORDERS_ID,
    name: 'orders',
    type: 'base',
    system: false,
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.role = 'owner' || @request.auth.role = 'partner'",
    fields: [
      {
        id: "orderdate001",
        name: 'date',
        type: 'date',
        required: true,
        presentable: true,
      },
      {
        id: "orderrecv001",
        name: 'receivedDate',
        type: 'date',
        required: false,
      },
      {
        id: "ordertotal01",
        name: 'total',
        type: 'number',
        required: true,
        min: 0,
      },
      {
        id: "orderstatus1",
        name: 'status',
        type: 'select',
        required: true,
        values: ['pending', 'received'],
        maxSelect: 1,
      },
      {
        id: "ordernotes01",
        name: 'notes',
        type: 'text',
        required: false,
      }
    ],
    indexes: [],
  })
  app.save(orders)

  // ============================================
  // ORDER_ITEMS
  // ============================================
  const orderItems = new Collection({
    id: ORDER_ITEMS_ID,
    name: 'order_items',
    type: 'base',
    system: false,
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.role = 'owner' || @request.auth.role = 'partner'",
    fields: [
      {
        id: "oiorder00001",
        name: 'order',
        type: 'relation',
        required: true,
        collectionId: ORDERS_ID,
        cascadeDelete: true,
        maxSelect: 1,
      },
      {
        id: "oiproduct001",
        name: 'product',
        type: 'relation',
        required: true,
        collectionId: PRODUCTS_ID,
        cascadeDelete: false,
        maxSelect: 1,
      },
      {
        id: "oiquantity01",
        name: 'quantity',
        type: 'number',
        required: true,
        min: 1,
        onlyInt: true,
      }
    ],
    indexes: [],
  })
  app.save(orderItems)

}, (app) => {
  // Revert migration
  const collectionsToDelete = [
    'order_items',
    'orders',
    'sale_items',
    'sales',
    'products'
  ]

  for (const name of collectionsToDelete) {
    try {
      const collection = app.findCollectionByNameOrId(name)
      if (collection) {
        app.delete(collection)
      }
    } catch (e) {
      // Collection doesn't exist, skip
    }
  }
})
