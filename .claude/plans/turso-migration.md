# Turso Migration Plan: PocketBase to Turso + Drizzle + Clerk

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan.

> **Goal:** Migrate from PocketBase to a $0/month stack while supporting multi-tenant architecture for multiple feria businesses.

## Target Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│                 Next.js 15 (Vercel Free)                    │
│              Existing React components + UI                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API LAYER                               │
│              Next.js API Routes + Server Actions            │
│                    Drizzle ORM (libSQL)                     │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│     TURSO       │ │      AUTH       │ │    STORAGE      │
│    Database     │ │     Clerk       │ │  Cloudflare R2  │
│    (libSQL)     │ │  (50K MAU free) │ │   (10GB free)   │
│    $0/month     │ │  Email+Passkey  │ │    $0/month     │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

## Cost Comparison

| Service | Current (PocketBase) | New Stack |
|---------|---------------------|-----------|
| Database | PocketHost $5/mo | Turso $0/mo |
| Auth | Firebase SMS (~$0.06/SMS) | Clerk $0/mo (email + passkeys) |
| File Storage | Included | Cloudflare R2 $0/mo (10GB) |
| Hosting | Vercel $0/mo | Vercel $0/mo |
| **Total** | **$5/month + SMS costs** | **$0/month** |

## Auth Strategy: No SMS

**Removing SMS authentication entirely.** New auth flow uses Clerk's free tier:

| Method | Security | Cost | UX |
|--------|----------|------|-----|
| Email + Password | Good | Free | Familiar |
| Magic Links | Good | Free | Simple |
| Passkeys (biometric) | Excellent | Free | Modern, fast |
| Social (Google) | Good | Free | One-click |

**User flow changes:**
- Old: Phone number → SMS code → PIN → Logged in
- New: Email → Passkey setup (once) → Face/fingerprint → Logged in

---

## Phase 1: Setup & Infrastructure (Day 1-2)

### Task 1.1: Create Turso Account & Database

- [ ] Sign up at https://turso.tech
- [ ] Install Turso CLI: `brew install tursodatabase/tap/turso`
- [ ] Authenticate: `turso auth login`
- [ ] Create database: `turso db create feria-pos`
- [ ] Get connection URL: `turso db show feria-pos --url`
- [ ] Create auth token: `turso db tokens create feria-pos`

**Files to create:**
```
.env.local (update)
├── TURSO_DATABASE_URL=libsql://feria-pos-[username].turso.io
└── TURSO_AUTH_TOKEN=eyJ...
```

### Task 1.2: Install Dependencies

```bash
npm install @libsql/client drizzle-orm
npm install -D drizzle-kit
```

### Task 1.3: Create Clerk Account

- [ ] Sign up at https://clerk.com
- [ ] Create application "Feria POS"
- [ ] Configure authentication methods:
  - [ ] Enable Email + Password
  - [ ] Enable Magic Links
  - [ ] Enable Passkeys (under "Multi-factor" settings)
  - [ ] Optionally enable Google OAuth
- [ ] **DO NOT enable Phone/SMS** (paid feature)
- [ ] Get API keys

**Files to update:**
```
.env.local (update)
├── NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
└── CLERK_SECRET_KEY=sk_...
```

### Task 1.4: Create Cloudflare R2 Bucket

- [ ] Sign up/login at https://dash.cloudflare.com
- [ ] Create R2 bucket "feria-pos-files"
- [ ] Generate API token with R2 permissions
- [ ] Configure CORS for your domain
- [ ] Set up public access or signed URLs

**Files to update:**
```
.env.local (update)
├── R2_ACCOUNT_ID=...
├── R2_ACCESS_KEY_ID=...
├── R2_SECRET_ACCESS_KEY=...
├── R2_BUCKET_NAME=feria-pos-files
└── R2_PUBLIC_URL=pub-xxx.r2.dev (or custom domain)
```

---

## Phase 2: Database Schema & ORM (Day 3-5)

### Task 2.1: Create Drizzle Configuration

**Create: `drizzle.config.ts`**
```typescript
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'turso',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  },
})
```

### Task 2.2: Create Database Client

**Create: `src/db/index.ts`**
```typescript
import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import * as schema from './schema'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

export const db = drizzle(client, { schema })
```

### Task 2.3: Define Schema (Migrate from PocketBase)

**Create: `src/db/schema.ts`**
```typescript
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'

// Users (replaces PocketBase users collection)
// NOTE: No phone field - using email-based auth now
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  clerkId: text('clerk_id').unique().notNull(),
  email: text('email').unique().notNull(),
  name: text('name').notNull(),
  pin: text('pin'), // Hashed PIN for quick re-auth within session
  role: text('role', { enum: ['dueno', 'admin', 'cajero'] }).notNull(),
  businessId: text('business_id').references(() => businesses.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

// Businesses (for multi-tenant)
export const businesses = sqliteTable('businesses', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  ownerId: text('owner_id').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

// Products
export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  businessId: text('business_id').references(() => businesses.id).notNull(),
  name: text('name').notNull(),
  price: real('price').notNull(),
  costPrice: real('cost_price'),
  category: text('category'),
  stock: integer('stock').default(0),
  icon: text('icon'), // R2 URL for product icon
  active: integer('active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

// Sales
export const sales = sqliteTable('sales', {
  id: text('id').primaryKey(),
  businessId: text('business_id').references(() => businesses.id).notNull(),
  date: integer('date', { mode: 'timestamp' }).notNull(),
  total: real('total').notNull(),
  paymentMethod: text('payment_method', { enum: ['cash', 'yape', 'plin'] }).notNull(),
  channel: text('channel', { enum: ['feria', 'whatsapp'] }),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

// Sale Items
export const saleItems = sqliteTable('sale_items', {
  id: text('id').primaryKey(),
  saleId: text('sale_id').references(() => sales.id).notNull(),
  productId: text('product_id').references(() => products.id),
  productName: text('product_name').notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: real('unit_price').notNull(),
  subtotal: real('subtotal').notNull(),
})

// Cash Sessions
export const cashSessions = sqliteTable('cash_sessions', {
  id: text('id').primaryKey(),
  businessId: text('business_id').references(() => businesses.id).notNull(),
  openedBy: text('opened_by').references(() => users.id).notNull(),
  closedBy: text('closed_by').references(() => users.id),
  openedAt: integer('opened_at', { mode: 'timestamp' }).notNull(),
  closedAt: integer('closed_at', { mode: 'timestamp' }),
  openingBalance: real('opening_balance').notNull(),
  closingBalance: real('closing_balance'),
  expectedBalance: real('expected_balance'),
  discrepancy: real('discrepancy'),
  discrepancyNote: text('discrepancy_note'),
})

// Cash Movements
export const cashMovements = sqliteTable('cash_movements', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').references(() => cashSessions.id).notNull(),
  type: text('type', { enum: ['ingreso', 'retiro'] }).notNull(),
  category: text('category').notNull(),
  amount: real('amount').notNull(),
  note: text('note'),
  employeeId: text('employee_id').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

// Providers
export const providers = sqliteTable('providers', {
  id: text('id').primaryKey(),
  businessId: text('business_id').references(() => businesses.id).notNull(),
  name: text('name').notNull(),
  phone: text('phone'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

// Orders
export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  businessId: text('business_id').references(() => businesses.id).notNull(),
  providerId: text('provider_id').references(() => providers.id).notNull(),
  status: text('status', { enum: ['pendiente', 'recibido', 'cancelado'] }).notNull(),
  deliveryDate: integer('delivery_date', { mode: 'timestamp' }),
  total: real('total').notNull(),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

// Order Items
export const orderItems = sqliteTable('order_items', {
  id: text('id').primaryKey(),
  orderId: text('order_id').references(() => orders.id).notNull(),
  productId: text('product_id').references(() => products.id),
  productName: text('product_name').notNull(),
  quantity: integer('quantity').notNull(),
  unitCost: real('unit_cost').notNull(),
  subtotal: real('subtotal').notNull(),
})

// Invite Codes (email-based now)
export const inviteCodes = sqliteTable('invite_codes', {
  id: text('id').primaryKey(),
  businessId: text('business_id').references(() => businesses.id).notNull(),
  code: text('code').unique().notNull(),
  role: text('role', { enum: ['admin', 'cajero'] }).notNull(),
  createdBy: text('created_by').references(() => users.id).notNull(),
  usedBy: text('used_by').references(() => users.id),
  usedAt: integer('used_at', { mode: 'timestamp' }),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

// Relations
export const usersRelations = relations(users, ({ one }) => ({
  business: one(businesses, {
    fields: [users.businessId],
    references: [businesses.id],
  }),
}))

export const productsRelations = relations(products, ({ one }) => ({
  business: one(businesses, {
    fields: [products.businessId],
    references: [businesses.id],
  }),
}))

// ... add more relations as needed
```

### Task 2.4: Generate & Run Migrations

```bash
# Generate migration
npx drizzle-kit generate

# Push to Turso
npx drizzle-kit push
```

---

## Phase 3: Auth Migration - Clerk (Day 6-8)

### Task 3.1: Install Clerk

```bash
npm install @clerk/nextjs
```

### Task 3.2: Configure Clerk Provider

**Update: `src/app/layout.tsx`**
```typescript
import { ClerkProvider } from '@clerk/nextjs'
import { esES } from '@clerk/localizations'

export default function RootLayout({ children }) {
  return (
    <ClerkProvider localization={esES}>
      <html lang="es">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
```

### Task 3.3: Configure Clerk Middleware

**Replace: `middleware.ts`**
```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/login(.*)',
  '/register(.*)',
  '/invite(.*)',
  '/api/webhooks(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
```

### Task 3.4: Create New Auth Context

**Replace: `src/contexts/auth-context.tsx`**
```typescript
'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useUser, useClerk } from '@clerk/nextjs'

interface AppUser {
  id: string
  email: string
  name: string
  role: 'dueno' | 'admin' | 'cajero'
  businessId: string | null
  pin: string | null
}

interface AuthContextType {
  user: AppUser | null
  isLoaded: boolean
  signOut: () => Promise<void>
  // PIN verification for quick re-auth
  verifyPin: (pin: string) => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser()
  const { signOut: clerkSignOut } = useClerk()
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    async function fetchAppUser() {
      if (!clerkUser) {
        setAppUser(null)
        setIsLoaded(true)
        return
      }

      try {
        const response = await fetch('/api/auth/me')
        if (response.ok) {
          const data = await response.json()
          setAppUser(data.user)
        }
      } catch (error) {
        console.error('Failed to fetch app user:', error)
      }
      setIsLoaded(true)
    }

    if (clerkLoaded) {
      fetchAppUser()
    }
  }, [clerkUser, clerkLoaded])

  const signOut = async () => {
    await clerkSignOut()
    setAppUser(null)
  }

  const verifyPin = async (pin: string): Promise<boolean> => {
    const response = await fetch('/api/auth/verify-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    })
    return response.ok
  }

  return (
    <AuthContext.Provider value={{ user: appUser, isLoaded, signOut, verifyPin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
```

### Task 3.5: Create Login Page with Clerk

**Replace: `src/app/(auth)/login/page.tsx`**
```typescript
'use client'

import { SignIn } from '@clerk/nextjs'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary">
      <SignIn
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'bg-bg-secondary shadow-lg',
            headerTitle: 'text-text-primary',
            headerSubtitle: 'text-text-secondary',
            formButtonPrimary: 'btn btn-primary',
          },
        }}
        routing="path"
        path="/login"
        signUpUrl="/register"
        afterSignInUrl="/inicio"
      />
    </div>
  )
}
```

### Task 3.6: Remove Firebase Dependencies

```bash
# Uninstall Firebase
npm uninstall firebase

# Delete Firebase files
rm src/lib/firebase.ts
rm -rf src/app/api/otp/
```

**Files to delete:**
- `src/lib/firebase.ts`
- `src/app/api/otp/` (entire directory)
- Any Firebase-related components in `src/components/auth/`

---

## Phase 4: File Storage Migration - R2 (Day 9-10)

### Task 4.1: Install AWS SDK (R2 Compatible)

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### Task 4.2: Create R2 Client

**Create: `src/lib/r2.ts`**
```typescript
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export async function uploadFile(key: string, body: Buffer, contentType: string): Promise<string> {
  await r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
  }))

  return `https://${process.env.R2_PUBLIC_URL}/${key}`
}

export async function deleteFile(key: string): Promise<void> {
  await r2.send(new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
  }))
}

export async function getSignedUploadUrl(key: string, contentType: string): Promise<string> {
  return getSignedUrl(r2, new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  }), { expiresIn: 3600 })
}
```

### Task 4.3: Create Upload API Route

**Create: `src/app/api/upload/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { uploadFile } from '@/lib/r2'
import { nanoid } from 'nanoid'

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File
  const type = formData.get('type') as string // 'product-icon', etc.

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const extension = file.name.split('.').pop() || 'png'
  const key = `${type}/${nanoid()}.${extension}`

  const url = await uploadFile(key, buffer, file.type)

  return NextResponse.json({ url })
}
```

### Task 4.4: Update Product Icon Upload

**Update: `src/hooks/useProductCrud.ts`**

Replace PocketBase file upload with R2:

```typescript
// Old (PocketBase)
const formData = new FormData()
formData.append('icon', iconBlob)
await pb.collection('products').update(id, formData)

// New (R2 + Turso)
const uploadFormData = new FormData()
uploadFormData.append('file', iconBlob, 'icon.png')
uploadFormData.append('type', 'product-icons')

const uploadResponse = await fetch('/api/upload', {
  method: 'POST',
  body: uploadFormData,
})
const { url } = await uploadResponse.json()

// Save URL to database
await updateProduct(productId, { icon: url })
```

---

## Phase 5: Data Layer Refactor (Day 11-15)

### Task 5.1: Create Data Access Layer

**Create: `src/db/queries/products.ts`**
```typescript
import { db } from '@/db'
import { products } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { nanoid } from 'nanoid'

export async function getProducts(businessId: string) {
  return db.select()
    .from(products)
    .where(and(
      eq(products.businessId, businessId),
      eq(products.active, true)
    ))
    .orderBy(desc(products.updatedAt))
}

export async function getProduct(id: string) {
  const [product] = await db.select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1)
  return product
}

export async function createProduct(data: Omit<typeof products.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>) {
  const now = new Date()
  const [product] = await db.insert(products)
    .values({
      id: nanoid(),
      ...data,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
  return product
}

export async function updateProduct(id: string, data: Partial<typeof products.$inferInsert>) {
  const [product] = await db.update(products)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning()
  return product
}

export async function deleteProduct(id: string) {
  await db.update(products)
    .set({ active: false, updatedAt: new Date() })
    .where(eq(products.id, id))
}
```

### Task 5.2: Create Server Actions

**Create: `src/app/actions/products.ts`**
```typescript
'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import * as productQueries from '@/db/queries/products'
import { getBusinessIdForUser } from '@/db/queries/users'

export async function createProductAction(formData: FormData) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const businessId = await getBusinessIdForUser(userId)
  if (!businessId) throw new Error('No business found')

  const product = await productQueries.createProduct({
    businessId,
    name: formData.get('name') as string,
    price: parseFloat(formData.get('price') as string),
    category: formData.get('category') as string || null,
    icon: formData.get('icon') as string || null,
  })

  revalidatePath('/productos')
  return product
}

export async function updateProductAction(id: string, formData: FormData) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const product = await productQueries.updateProduct(id, {
    name: formData.get('name') as string,
    price: parseFloat(formData.get('price') as string),
    category: formData.get('category') as string || null,
    icon: formData.get('icon') as string || null,
  })

  revalidatePath('/productos')
  return product
}

export async function deleteProductAction(id: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  await productQueries.deleteProduct(id)
  revalidatePath('/productos')
}
```

### Task 5.3: Update Hooks to Use Server Actions

Convert existing hooks from PocketBase to server actions. Example pattern:

```typescript
// Old hook (PocketBase)
const { pb } = useAuth()
const products = await pb.collection('products').getFullList()

// New hook (Server Action + React Query or SWR)
import { getProducts } from '@/app/actions/products'
const products = await getProducts(businessId)
```

---

## Phase 6: Cleanup & Testing (Day 14-16)

### Task 6.1: Delete Old Files

```bash
# Remove PocketBase
rm -rf pb_migrations/
rm -rf pocketbase/

# Remove Firebase
rm src/lib/firebase.ts
rm -rf src/app/api/otp/

# Remove old auth components that use phone/SMS
# (review and delete as needed)
```

### Task 6.2: Clean Environment Variables

Remove from `.env.local`:
```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
POCKETBASE_URL
PB_ADMIN_EMAIL
PB_ADMIN_PASSWORD
```

### Task 6.3: Local Testing

- [ ] Test Clerk sign up with email
- [ ] Test Clerk sign in with email
- [ ] Test passkey registration
- [ ] Test passkey login
- [ ] Test all CRUD operations
- [ ] Test file uploads to R2
- [ ] Test cash register flow

### Task 6.4: Deploy to Production

```bash
# Set Vercel environment variables
vercel env add TURSO_DATABASE_URL
vercel env add TURSO_AUTH_TOKEN
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
vercel env add CLERK_SECRET_KEY
vercel env add R2_ACCOUNT_ID
vercel env add R2_ACCESS_KEY_ID
vercel env add R2_SECRET_ACCESS_KEY
vercel env add R2_BUCKET_NAME
vercel env add R2_PUBLIC_URL

# Deploy
vercel --prod
```

### Task 6.5: Cancel Old Services

- [ ] Cancel PocketHost subscription ($5/month saved)
- [ ] Disable Firebase project (no more SMS costs)

---

## Timeline Summary

| Phase | Days | Tasks |
|-------|------|-------|
| 1. Infrastructure Setup | 1-2 | Turso, Clerk, R2 accounts |
| 2. Database Schema | 3-5 | Drizzle schema, migrations |
| 3. Auth Migration | 6-8 | Clerk integration (email + passkeys) |
| 4. Storage Migration | 9-10 | R2 setup |
| 5. Data Layer Refactor | 11-13 | Queries, server actions, hooks |
| 6. Cleanup & Deploy | 14-16 | Delete old files, test, deploy |

**Total: ~16 days of focused work**

---

## Final Stack

| Service | Purpose | Cost |
|---------|---------|------|
| **Turso** | Database (5GB, 500M reads) | $0/month |
| **Clerk** | Auth (50K MAU, email + passkeys) | $0/month |
| **Cloudflare R2** | File storage (10GB) | $0/month |
| **Vercel** | Hosting (100GB bandwidth) | $0/month |
| **Total** | | **$0/month** |
