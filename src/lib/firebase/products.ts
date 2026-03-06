/**
 * Firestore Product Operations
 *
 * PROOF OF CONCEPT - Shows how product CRUD would work with Firestore
 * Compare this to the current PocketBase implementation
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage'
import { db, storage } from './config'
import type { Product, ProductCategory } from '@/types'

// Collection reference
const productsRef = collection(db, 'products')

// ============================================
// TYPE DEFINITIONS (Firestore version)
// ============================================

// Firestore stores data differently - no collectionId/collectionName
export interface FirestoreProduct {
  id: string
  name: string
  price: number
  costPrice?: number
  active: boolean
  category?: ProductCategory
  imageUrl?: string // Direct URL instead of filename
  created: Timestamp
  updated: Timestamp
}

// Convert Firestore document to our Product type
function toProduct(id: string, data: Record<string, unknown>): Product {
  return {
    id,
    collectionId: 'products', // Hardcoded since Firestore doesn't have this
    collectionName: 'products',
    name: data.name as string,
    price: data.price as number,
    costPrice: data.costPrice as number | undefined,
    active: data.active as boolean,
    category: data.category as ProductCategory | undefined,
    image: data.imageUrl as string | undefined, // Map imageUrl to image field
    created: (data.created as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
    updated: (data.updated as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
  }
}

// ============================================
// READ OPERATIONS
// ============================================

/**
 * Get all products
 *
 * PocketBase equivalent:
 *   pb.collection('products').getFullList({ sort: 'name' })
 */
export async function getAllProducts(): Promise<Product[]> {
  const q = query(productsRef, orderBy('name'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => toProduct(doc.id, doc.data()))
}

/**
 * Get active products only
 *
 * PocketBase equivalent:
 *   pb.collection('products').getFullList({ filter: 'active = true', sort: 'name' })
 */
export async function getActiveProducts(): Promise<Product[]> {
  const q = query(
    productsRef,
    where('active', '==', true),
    orderBy('name')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => toProduct(doc.id, doc.data()))
}

/**
 * Get single product by ID
 *
 * PocketBase equivalent:
 *   pb.collection('products').getOne(id)
 */
export async function getProduct(id: string): Promise<Product | null> {
  const docRef = doc(db, 'products', id)
  const snapshot = await getDoc(docRef)
  if (!snapshot.exists()) return null
  return toProduct(snapshot.id, snapshot.data())
}

// ============================================
// CREATE OPERATIONS
// ============================================

/**
 * Create a new product
 *
 * PocketBase equivalent:
 *   pb.collection('products').create(formData)
 *
 * KEY DIFFERENCE: Image upload is separate in Firestore
 */
export async function createProduct(data: {
  name: string
  price: number
  costPrice?: number
  category?: ProductCategory
  active?: boolean
  imageFile?: File
}): Promise<Product> {
  // 1. Upload image first if provided
  let imageUrl: string | undefined
  if (data.imageFile) {
    imageUrl = await uploadProductImage(data.imageFile)
  }

  // 2. Create Firestore document
  const docRef = await addDoc(productsRef, {
    name: data.name,
    price: data.price,
    costPrice: data.costPrice || null,
    category: data.category || null,
    active: data.active ?? true,
    imageUrl: imageUrl || null,
    created: serverTimestamp(),
    updated: serverTimestamp(),
  })

  // 3. Return the created product
  const created = await getProduct(docRef.id)
  if (!created) throw new Error('Failed to create product')
  return created
}

// ============================================
// UPDATE OPERATIONS
// ============================================

/**
 * Update a product
 *
 * PocketBase equivalent:
 *   pb.collection('products').update(id, formData)
 *
 * KEY DIFFERENCE: Image handling is more manual
 */
export async function updateProduct(
  id: string,
  data: {
    name?: string
    price?: number
    costPrice?: number
    category?: ProductCategory | ''
    active?: boolean
    imageFile?: File
    removeImage?: boolean
  }
): Promise<Product> {
  const docRef = doc(db, 'products', id)

  // Build update object
  const updateData: Record<string, unknown> = {
    updated: serverTimestamp(),
  }

  if (data.name !== undefined) updateData.name = data.name
  if (data.price !== undefined) updateData.price = data.price
  if (data.costPrice !== undefined) updateData.costPrice = data.costPrice || null
  if (data.category !== undefined) updateData.category = data.category || null
  if (data.active !== undefined) updateData.active = data.active

  // Handle image changes
  if (data.removeImage) {
    // Delete old image from storage
    const existing = await getProduct(id)
    if (existing?.image) {
      await deleteProductImage(existing.image)
    }
    updateData.imageUrl = null
  } else if (data.imageFile) {
    // Delete old image first
    const existing = await getProduct(id)
    if (existing?.image) {
      await deleteProductImage(existing.image)
    }
    // Upload new image
    updateData.imageUrl = await uploadProductImage(data.imageFile, id)
  }

  await updateDoc(docRef, updateData)

  const updated = await getProduct(id)
  if (!updated) throw new Error('Failed to update product')
  return updated
}

/**
 * Bulk update product status (activate/deactivate)
 *
 * PocketBase equivalent:
 *   Promise.all(ids.map(id => pb.collection('products').update(id, { active })))
 *
 * FIRESTORE ADVANTAGE: Batch writes are atomic
 */
export async function bulkUpdateStatus(ids: string[], active: boolean): Promise<Product[]> {
  const batch = writeBatch(db)

  for (const id of ids) {
    const docRef = doc(db, 'products', id)
    batch.update(docRef, {
      active,
      updated: serverTimestamp(),
    })
  }

  await batch.commit()

  // Fetch updated products
  const products = await Promise.all(ids.map(id => getProduct(id)))
  return products.filter((p): p is Product => p !== null)
}

// ============================================
// DELETE OPERATIONS
// ============================================

/**
 * Delete a product
 *
 * PocketBase equivalent:
 *   pb.collection('products').delete(id)
 *
 * KEY DIFFERENCE: Must manually delete image from storage
 */
export async function deleteProduct(id: string): Promise<void> {
  // Delete image from storage first
  const product = await getProduct(id)
  if (product?.image) {
    await deleteProductImage(product.image)
  }

  // Delete Firestore document
  await deleteDoc(doc(db, 'products', id))
}

// ============================================
// IMAGE HANDLING (Firebase Storage)
// ============================================

/**
 * Upload product image to Firebase Storage
 *
 * PocketBase equivalent:
 *   Just append to FormData - handled automatically
 *
 * KEY DIFFERENCE: Manual upload, no automatic thumbnails
 */
async function uploadProductImage(file: File, productId?: string): Promise<string> {
  const timestamp = Date.now()
  const filename = `${productId || 'new'}_${timestamp}_${file.name}`
  const storageRef = ref(storage, `products/${filename}`)

  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}

/**
 * Delete product image from Firebase Storage
 */
async function deleteProductImage(imageUrl: string): Promise<void> {
  try {
    // Extract path from URL
    const storageRef = ref(storage, imageUrl)
    await deleteObject(storageRef)
  } catch (error) {
    // Image might already be deleted, ignore
    console.warn('Failed to delete image:', error)
  }
}

/**
 * Get product image URL
 *
 * PocketBase equivalent:
 *   pb.files.getURL(product, product.image, { thumb: '100x100' })
 *
 * KEY DIFFERENCE: No automatic thumbnails!
 * Would need Cloud Functions or client-side resize
 */
export function getProductImageUrl(
  product: Product,
  _thumb?: '100x100' | '200x200' // Ignored - no thumbnails in Firebase
): string | null {
  // In Firestore version, image field stores the full URL directly
  return product.image || null
}
