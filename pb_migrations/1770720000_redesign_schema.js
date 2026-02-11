/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Simplified schema for Mr. Chifles business
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

migrate((db) => {
  const dao = new Dao(db)

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
      const collection = dao.findCollectionByNameOrId(name)
      if (collection) {
        dao.deleteCollection(collection)
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
    schema: [
      {
        system: false,
        id: "prodname0001",
        name: 'name',
        type: 'text',
        required: true,
        presentable: true,
        unique: false,
        options: { min: null, max: null, pattern: "" }
      },
      {
        system: false,
        id: "prodprice001",
        name: 'price',
        type: 'number',
        required: true,
        presentable: false,
        unique: false,
        options: { min: 0, max: null, noDecimal: false }
      },
      {
        system: false,
        id: "prodcost0001",
        name: 'costPrice',
        type: 'number',
        required: false,
        presentable: false,
        unique: false,
        options: { min: 0, max: null, noDecimal: false }
      },
      {
        system: false,
        id: "prodactive01",
        name: 'active',
        type: 'bool',
        required: false,
        presentable: false,
        unique: false,
        options: {}
      }
    ],
    indexes: [],
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
    options: {}
  })
  dao.saveCollection(products)

  // ============================================
  // SALES
  // ============================================
  const sales = new Collection({
    id: SALES_ID,
    name: 'sales',
    type: 'base',
    system: false,
    schema: [
      {
        system: false,
        id: "saledate0001",
        name: 'date',
        type: 'date',
        required: true,
        presentable: true,
        unique: false,
        options: { min: "", max: "" }
      },
      {
        system: false,
        id: "saletotal001",
        name: 'total',
        type: 'number',
        required: true,
        presentable: false,
        unique: false,
        options: { min: 0, max: null, noDecimal: false }
      },
      {
        system: false,
        id: "salepayment1",
        name: 'paymentMethod',
        type: 'select',
        required: true,
        presentable: false,
        unique: false,
        options: { maxSelect: 1, values: ['cash', 'yape', 'pos'] }
      },
      {
        system: false,
        id: "salechannel1",
        name: 'channel',
        type: 'select',
        required: true,
        presentable: false,
        unique: false,
        options: { maxSelect: 1, values: ['feria', 'whatsapp'] }
      },
      {
        system: false,
        id: "salenotes001",
        name: 'notes',
        type: 'text',
        required: false,
        presentable: false,
        unique: false,
        options: { min: null, max: null, pattern: "" }
      },
      {
        system: false,
        id: "saleemployee",
        name: 'employee',
        type: 'relation',
        required: true,
        presentable: false,
        unique: false,
        options: {
          collectionId: "_pb_users_auth_",
          cascadeDelete: false,
          minSelect: null,
          maxSelect: 1,
          displayFields: ["name"]
        }
      }
    ],
    indexes: [],
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
    options: {}
  })
  dao.saveCollection(sales)

  // ============================================
  // SALE_ITEMS
  // ============================================
  const saleItems = new Collection({
    id: SALE_ITEMS_ID,
    name: 'sale_items',
    type: 'base',
    system: false,
    schema: [
      {
        system: false,
        id: "sisale000001",
        name: 'sale',
        type: 'relation',
        required: true,
        presentable: false,
        unique: false,
        options: {
          collectionId: SALES_ID,
          cascadeDelete: true,
          minSelect: null,
          maxSelect: 1,
          displayFields: null
        }
      },
      {
        system: false,
        id: "siproduct001",
        name: 'product',
        type: 'relation',
        required: true,
        presentable: false,
        unique: false,
        options: {
          collectionId: PRODUCTS_ID,
          cascadeDelete: false,
          minSelect: null,
          maxSelect: 1,
          displayFields: null
        }
      },
      {
        system: false,
        id: "siquantity01",
        name: 'quantity',
        type: 'number',
        required: true,
        presentable: false,
        unique: false,
        options: { min: 1, max: null, noDecimal: true }
      },
      {
        system: false,
        id: "siunitprice1",
        name: 'unitPrice',
        type: 'number',
        required: true,
        presentable: false,
        unique: false,
        options: { min: 0, max: null, noDecimal: false }
      },
      {
        system: false,
        id: "sisubtotal01",
        name: 'subtotal',
        type: 'number',
        required: true,
        presentable: false,
        unique: false,
        options: { min: 0, max: null, noDecimal: false }
      }
    ],
    indexes: [],
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
    options: {}
  })
  dao.saveCollection(saleItems)

  // ============================================
  // ORDERS (purchases from DaSol)
  // ============================================
  const orders = new Collection({
    id: ORDERS_ID,
    name: 'orders',
    type: 'base',
    system: false,
    schema: [
      {
        system: false,
        id: "orderdate001",
        name: 'date',
        type: 'date',
        required: true,
        presentable: true,
        unique: false,
        options: { min: "", max: "" }
      },
      {
        system: false,
        id: "orderrecv001",
        name: 'receivedDate',
        type: 'date',
        required: false,
        presentable: false,
        unique: false,
        options: { min: "", max: "" }
      },
      {
        system: false,
        id: "ordertotal01",
        name: 'total',
        type: 'number',
        required: true,
        presentable: false,
        unique: false,
        options: { min: 0, max: null, noDecimal: false }
      },
      {
        system: false,
        id: "orderstatus1",
        name: 'status',
        type: 'select',
        required: true,
        presentable: false,
        unique: false,
        options: { maxSelect: 1, values: ['pending', 'received'] }
      },
      {
        system: false,
        id: "ordernotes01",
        name: 'notes',
        type: 'text',
        required: false,
        presentable: false,
        unique: false,
        options: { min: null, max: null, pattern: "" }
      }
    ],
    indexes: [],
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
    options: {}
  })
  dao.saveCollection(orders)

  // ============================================
  // ORDER_ITEMS
  // ============================================
  const orderItems = new Collection({
    id: ORDER_ITEMS_ID,
    name: 'order_items',
    type: 'base',
    system: false,
    schema: [
      {
        system: false,
        id: "oiorder00001",
        name: 'order',
        type: 'relation',
        required: true,
        presentable: false,
        unique: false,
        options: {
          collectionId: ORDERS_ID,
          cascadeDelete: true,
          minSelect: null,
          maxSelect: 1,
          displayFields: null
        }
      },
      {
        system: false,
        id: "oiproduct001",
        name: 'product',
        type: 'relation',
        required: true,
        presentable: false,
        unique: false,
        options: {
          collectionId: PRODUCTS_ID,
          cascadeDelete: false,
          minSelect: null,
          maxSelect: 1,
          displayFields: null
        }
      },
      {
        system: false,
        id: "oiquantity01",
        name: 'quantity',
        type: 'number',
        required: true,
        presentable: false,
        unique: false,
        options: { min: 1, max: null, noDecimal: true }
      }
    ],
    indexes: [],
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
    options: {}
  })
  dao.saveCollection(orderItems)

}, (db) => {
  // Revert migration
  const dao = new Dao(db)

  const collectionsToDelete = [
    'order_items',
    'orders',
    'sale_items',
    'sales',
    'products'
  ]

  for (const name of collectionsToDelete) {
    try {
      const collection = dao.findCollectionByNameOrId(name)
      if (collection) {
        dao.deleteCollection(collection)
      }
    } catch (e) {
      // Collection doesn't exist, skip
    }
  }
})
