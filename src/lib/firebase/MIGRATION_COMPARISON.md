# Firestore Migration Comparison: Products

This document compares the current PocketBase implementation with the Firestore equivalent.

## Summary

| Aspect | PocketBase | Firestore | Verdict |
|--------|------------|-----------|---------|
| Lines of code | ~50 lines scattered | ~200 lines in products.ts | More code |
| Image upload | Automatic (FormData) | Manual (separate service) | More work |
| Thumbnails | Automatic | Not available | Missing feature |
| Complexity | Low | Medium | Harder |
| Cost | $5/mo | Free | Cheaper |

---

## Code Comparison

### 1. Loading Products

**BEFORE (PocketBase):**
```typescript
// In useEffect
const records = await pb.collection('products').getFullList<Product>({
  sort: 'name',
})
setProducts(records)
```

**AFTER (Firestore):**
```typescript
import { getAllProducts } from '@/lib/firebase/products'

// In useEffect
const products = await getAllProducts()
setProducts(products)
```

**Verdict:** Similar simplicity due to abstraction layer.

---

### 2. Creating a Product

**BEFORE (PocketBase):**
```typescript
const formData = new FormData()
formData.append('name', name)
formData.append('price', price)
formData.append('category', category)
formData.append('active', active.toString())
if (imageFile) {
  formData.append('image', imageFile) // Just works!
}

const record = await pb.collection('products').create<Product>(formData)
```

**AFTER (Firestore):**
```typescript
import { createProduct } from '@/lib/firebase/products'

const record = await createProduct({
  name,
  price: parseFloat(price),
  category,
  active,
  imageFile, // Handled internally, uploaded to Firebase Storage
})
```

**Verdict:** Abstraction makes it similar, but internally more complex.

---

### 3. Updating a Product

**BEFORE (PocketBase):**
```typescript
const formData = new FormData()
formData.append('name', name)
formData.append('price', price)
if (imageFile) {
  formData.append('image', imageFile)
} else if (removeImage) {
  formData.append('image', '') // Clear image
}

const record = await pb.collection('products').update<Product>(id, formData)
```

**AFTER (Firestore):**
```typescript
import { updateProduct } from '@/lib/firebase/products'

const record = await updateProduct(id, {
  name,
  price: parseFloat(price),
  imageFile,
  removeImage,
})
```

**Verdict:** API is cleaner, but image deletion is manual internally.

---

### 4. Deleting a Product

**BEFORE (PocketBase):**
```typescript
await pb.collection('products').delete(productId)
// Image is automatically deleted
```

**AFTER (Firestore):**
```typescript
import { deleteProduct } from '@/lib/firebase/products'

await deleteProduct(productId)
// Image deletion handled internally, but manually coded
```

**Verdict:** Same API, but Firestore version requires manual image cleanup.

---

### 5. Bulk Status Update

**BEFORE (PocketBase):**
```typescript
const updatePromises = Array.from(selectedProducts).map(id =>
  pb.collection('products').update<Product>(id, { active: newStatus })
)
const updatedRecords = await Promise.all(updatePromises)
```

**AFTER (Firestore):**
```typescript
import { bulkUpdateStatus } from '@/lib/firebase/products'

const updatedRecords = await bulkUpdateStatus(
  Array.from(selectedProducts),
  newStatus
)
```

**Verdict:** Firestore batch writes are actually better (atomic).

---

### 6. Image URLs

**BEFORE (PocketBase):**
```typescript
import { getProductImageUrl } from '@/lib/products'

const imageUrl = getProductImageUrl(product, '100x100')
// Returns: http://pocketbase/api/files/products/abc123/image.jpg?thumb=100x100
```

**AFTER (Firestore):**
```typescript
import { getProductImageUrl } from '@/lib/firebase/products'

const imageUrl = getProductImageUrl(product)
// Returns: https://firebasestorage.googleapis.com/...
// NO THUMBNAILS - full image only
```

**Verdict:** Lost thumbnail feature. Would need Cloud Functions ($) or client-side resize.

---

## What Changes in productos/page.tsx

```diff
- import { useAuth } from '@/contexts/auth-context'
- import { getProductImageUrl } from '@/lib/products'
+ import { useAuth } from '@/contexts/firebase-auth-context' // New auth context
+ import {
+   getAllProducts,
+   createProduct,
+   updateProduct,
+   deleteProduct,
+   bulkUpdateStatus,
+   getProductImageUrl,
+ } from '@/lib/firebase/products'

  // In useEffect for loading:
- const records = await pb.collection('products').getFullList<Product>({ sort: 'name' })
+ const records = await getAllProducts()

  // In handleSave:
- const formData = new FormData()
- formData.append('name', name)
- // ... all the formData.append calls
- const record = await pb.collection('products').create<Product>(formData)
+ const record = await createProduct({ name, price: parseFloat(price), ... })

  // In handleDelete:
- await pb.collection('products').delete(deleteProduct.id)
+ await deleteProduct(deleteProduct.id)

  // In handleBulkUpdateStatus:
- const updatePromises = Array.from(selectedProducts).map(id =>
-   pb.collection('products').update<Product>(id, { active: newStatus })
- )
- const updatedRecords = await Promise.all(updatePromises)
+ const updatedRecords = await bulkUpdateStatus(Array.from(selectedProducts), newStatus)
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/firebase/config.ts` | CREATE | Firebase initialization |
| `src/lib/firebase/products.ts` | CREATE | Product CRUD operations |
| `src/lib/firebase/auth.ts` | CREATE | Auth context (replace PocketBase auth) |
| `src/contexts/firebase-auth-context.tsx` | CREATE | React auth context |
| `src/app/(dashboard)/productos/page.tsx` | MODIFY | Use new imports |
| `src/lib/products.ts` | DELETE | No longer needed |
| `.env.local` | MODIFY | Add FIREBASE_STORAGE_BUCKET |

---

## Missing Features After Migration

1. **Thumbnails** - PocketBase auto-generates 100x100, 200x200
2. **Admin Dashboard** - PocketBase has `/_/` for data management
3. **File cleanup** - PocketBase auto-deletes files; Firestore is manual

---

## New Environment Variables Needed

```bash
# Add to .env.local
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=mrchifles-135b2.appspot.com
```

---

## Conclusion

The migration is **doable** but involves:
- ~200 lines of new abstraction code per collection
- Manual image handling
- Loss of thumbnail feature
- Loss of admin dashboard

For 6 collections, estimate **400-600 lines** of new Firebase code.

Is saving $60/year worth this complexity?
