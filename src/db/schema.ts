import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { relations, sql } from 'drizzle-orm'

// ===========================================
// BUSINESSES (Multi-tenant support)
// ===========================================
export const businesses = sqliteTable('businesses', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  // Business profile
  type: text('type', {
    enum: ['food', 'retail', 'services', 'wholesale', 'manufacturing', 'other']
  }),
  icon: text('icon'), // Emoji or base64 image
  // Localization
  locale: text('locale').default('en-US'), // e.g., 'en-US', 'es-MX', 'fr-FR'
  currency: text('currency').default('USD'), // ISO 4217 code
  // Product settings (inline - no separate table needed)
  defaultCategoryId: text('default_category_id'),
  sortPreference: text('sort_preference').default('name_asc'),
})

// ===========================================
// USERS
// ===========================================
// Simple email/password auth
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  password: text('password').notNull(), // bcrypt hash
  name: text('name').notNull(),
  avatar: text('avatar'), // Base64 or URL
  language: text('language').default('en-US').notNull(), // UI language (next-intl bundle); distinct from per-business locale/currency
})

// ===========================================
// BUSINESS USERS (Multi-business membership)
// ===========================================
// Join table enabling users to belong to multiple businesses
export const businessUsers = sqliteTable('business_users', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  businessId: text('business_id').references(() => businesses.id, { onDelete: 'cascade' }).notNull(),
  role: text('role', { enum: ['owner', 'partner', 'employee'] }).notNull(),
  status: text('status', { enum: ['active', 'pending', 'disabled'] }).default('active').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  userIdIdx: index('idx_business_users_user_id').on(table.userId),
  businessIdIdx: index('idx_business_users_business_id').on(table.businessId),
  statusIdx: index('idx_business_users_status').on(table.status),
}))

// ===========================================
// PRODUCT CATEGORIES
// ===========================================
export const productCategories = sqliteTable('product_categories', {
  id: text('id').primaryKey(),
  businessId: text('business_id').references(() => businesses.id).notNull(),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
}, (table) => ({
  businessIdIdx: index('idx_product_categories_business_id').on(table.businessId),
}))

// ===========================================
// PRODUCTS
// ===========================================
export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  businessId: text('business_id').references(() => businesses.id).notNull(),
  name: text('name').notNull(),
  price: real('price').notNull(),
  costPrice: real('cost_price'),
  categoryId: text('category_id').references(() => productCategories.id, { onDelete: 'set null' }),
  stock: integer('stock').default(0),
  lowStockThreshold: integer('low_stock_threshold').default(10),
  icon: text('icon'), // Base64-encoded image data
  barcode: text('barcode'), // Physical barcode/QR code value (as shown on the label)
  barcodeFormat: text('barcode_format', {
    enum: ['CODABAR', 'CODE_39', 'CODE_93', 'CODE_128', 'ITF', 'EAN_13', 'EAN_8', 'UPC_A', 'UPC_E', 'UPC_EAN_EXTENSION']
  }),
  barcodeSource: text('barcode_source', {
    enum: ['scanned', 'generated', 'manual']
  }),
  // Canonical 14-digit GTIN for retail barcodes (EAN-13, UPC-A, EAN-8, UPC-E).
  // Computed automatically on write. Null for non-retail formats. This is the
  // stable external identity used by supplier / POS / e-commerce integrations.
  barcodeGtin: text('barcode_gtin'),
  active: integer('active', { mode: 'boolean' }).default(true).notNull(),
}, (table) => ({
  businessIdIdx: index('idx_products_business_id').on(table.businessId),
  categoryIdIdx: index('idx_products_category_id').on(table.categoryId),
  businessActiveIdx: index('idx_products_business_active').on(table.businessId, table.active),
  barcodeGtinIdx: index('idx_products_barcode_gtin').on(table.barcodeGtin),
  // Partial unique index on (businessId, barcode). Archived products no longer
  // exist (hard-delete), so we only need to exclude NULL barcodes. SQLite
  // treats NULLs as distinct in unique indexes, so the IS NOT NULL clause is
  // technically redundant but documents intent.
  uniqueBusinessBarcode: uniqueIndex('idx_unique_products_business_barcode')
    .on(table.businessId, table.barcode)
    .where(sql`${table.barcode} IS NOT NULL`),
}))

// ===========================================
// PROVIDERS (Suppliers)
// ===========================================
export const providers = sqliteTable('providers', {
  id: text('id').primaryKey(),
  businessId: text('business_id').references(() => businesses.id).notNull(),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  notes: text('notes'),
  active: integer('active', { mode: 'boolean' }).default(true),
  // Functional timestamp: displayed on the provider detail page ("Since Oct 2025").
  // Nullable so pre-existing rows without a stamp gracefully omit the line.
  createdAt: integer('created_at', { mode: 'timestamp' }),
}, (table) => ({
  businessIdIdx: index('idx_providers_business_id').on(table.businessId),
}))

// ===========================================
// ORDERS (Purchase orders from suppliers)
// ===========================================
export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  businessId: text('business_id').references(() => businesses.id).notNull(),
  providerId: text('provider_id').references(() => providers.id),
  date: integer('date', { mode: 'timestamp' }).notNull(),
  receivedDate: integer('received_date', { mode: 'timestamp' }),
  total: real('total').notNull(),
  status: text('status', { enum: ['pending', 'received'] }).default('pending').notNull(),
  estimatedArrival: integer('estimated_arrival', { mode: 'timestamp' }),
  receipt: text('receipt'), // R2 URL for receipt image
  notes: text('notes'),
}, (table) => ({
  businessIdIdx: index('idx_orders_business_id').on(table.businessId),
  providerIdIdx: index('idx_orders_provider_id').on(table.providerId),
  dateIdx: index('idx_orders_date').on(table.date),
}))

// ===========================================
// ORDER ITEMS
// ===========================================
export const orderItems = sqliteTable('order_items', {
  id: text('id').primaryKey(),
  orderId: text('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  productId: text('product_id').references(() => products.id, { onDelete: 'set null' }),
  productName: text('product_name').notNull(), // Snapshot at order time
  quantity: integer('quantity').notNull(),
  unitCost: real('unit_cost'),
  subtotal: real('subtotal'),
  receivedQuantity: integer('received_quantity'),
}, (table) => ({
  orderIdIdx: index('idx_order_items_order_id').on(table.orderId),
}))

// ===========================================
// INVITE CODES
// ===========================================
export const inviteCodes = sqliteTable('invite_codes', {
  id: text('id').primaryKey(),
  businessId: text('business_id').references(() => businesses.id).notNull(),
  code: text('code').unique().notNull(), // 6 uppercase alphanumeric
  role: text('role', { enum: ['partner', 'employee'] }).notNull(),
  usedBy: text('used_by').references(() => users.id),
  usedAt: integer('used_at', { mode: 'timestamp' }),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  businessIdIdx: index('idx_invite_codes_business_id').on(table.businessId),
  usedExpiresIdx: index('idx_invite_codes_used_expires').on(table.usedBy, table.expiresAt),
}))

// ===========================================
// OWNERSHIP TRANSFERS
// ===========================================
export const ownershipTransfers = sqliteTable('ownership_transfers', {
  id: text('id').primaryKey(),
  businessId: text('business_id').references(() => businesses.id).notNull(),
  code: text('code').unique().notNull(), // 6 uppercase alphanumeric
  fromUser: text('from_user').references(() => users.id).notNull(),
  toEmail: text('to_email').notNull(), // Email instead of phone
  toUser: text('to_user').references(() => users.id),
  status: text('status', {
    enum: ['pending', 'accepted', 'completed', 'expired', 'cancelled']
  }).default('pending').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  acceptedAt: integer('accepted_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
}, (table) => ({
  businessIdIdx: index('idx_ownership_transfers_business_id').on(table.businessId),
  statusIdx: index('idx_ownership_transfers_status').on(table.status),
}))

// ===========================================
// RELATIONS
// ===========================================

export const businessesRelations = relations(businesses, ({ many }) => ({
  businessUsers: many(businessUsers),
  products: many(products),
  productCategories: many(productCategories),
  providers: many(providers),
  orders: many(orders),
  inviteCodes: many(inviteCodes),
  ownershipTransfers: many(ownershipTransfers),
}))

export const usersRelations = relations(users, ({ many }) => ({
  businessMemberships: many(businessUsers),
}))

export const businessUsersRelations = relations(businessUsers, ({ one }) => ({
  user: one(users, {
    fields: [businessUsers.userId],
    references: [users.id],
  }),
  business: one(businesses, {
    fields: [businessUsers.businessId],
    references: [businesses.id],
  }),
}))

export const productsRelations = relations(products, ({ one, many }) => ({
  business: one(businesses, {
    fields: [products.businessId],
    references: [businesses.id],
  }),
  productCategory: one(productCategories, {
    fields: [products.categoryId],
    references: [productCategories.id],
  }),
  orderItems: many(orderItems),
}))

export const productCategoriesRelations = relations(productCategories, ({ one, many }) => ({
  business: one(businesses, {
    fields: [productCategories.businessId],
    references: [businesses.id],
  }),
  products: many(products),
}))

export const providersRelations = relations(providers, ({ one, many }) => ({
  business: one(businesses, {
    fields: [providers.businessId],
    references: [businesses.id],
  }),
  orders: many(orders),
}))

export const ordersRelations = relations(orders, ({ one, many }) => ({
  business: one(businesses, {
    fields: [orders.businessId],
    references: [businesses.id],
  }),
  provider: one(providers, {
    fields: [orders.providerId],
    references: [providers.id],
  }),
  items: many(orderItems),
}))

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}))

export const inviteCodesRelations = relations(inviteCodes, ({ one }) => ({
  business: one(businesses, {
    fields: [inviteCodes.businessId],
    references: [businesses.id],
  }),
  usedByUser: one(users, {
    fields: [inviteCodes.usedBy],
    references: [users.id],
  }),
}))

export const ownershipTransfersRelations = relations(ownershipTransfers, ({ one }) => ({
  business: one(businesses, {
    fields: [ownershipTransfers.businessId],
    references: [businesses.id],
  }),
  fromUserRelation: one(users, {
    fields: [ownershipTransfers.fromUser],
    references: [users.id],
  }),
  toUserRelation: one(users, {
    fields: [ownershipTransfers.toUser],
    references: [users.id],
  }),
}))

