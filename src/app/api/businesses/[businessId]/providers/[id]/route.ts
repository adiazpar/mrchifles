import { db, providers, orders } from '@/db'
import { eq, and, sql } from 'drizzle-orm'
import { z } from 'zod'
import { canManageBusiness } from '@/lib/business-auth'
import { withBusinessAuth, validationError, errorResponse, successResponse } from '@/lib/api-middleware'
import { ApiMessageCode } from '@/lib/api-messages'
import { Schemas } from '@/lib/schemas'

const updateProviderSchema = z.object({
  name: Schemas.name().optional(),
  phone: Schemas.phone(),
  email: Schemas.email().nullable().optional(),
  notes: Schemas.notes(),
  active: z.boolean().optional(),
})

/**
 * GET /api/businesses/[businessId]/providers/[id]
 *
 * Return one provider with aggregated stats: total orders, total spent,
 * most recent order date. Used by the provider detail page.
 */
export const GET = withBusinessAuth(async (_request, access, routeParams) => {
  const id = routeParams?.id
  if (!id) {
    return errorResponse(ApiMessageCode.PROVIDER_NOT_FOUND, 404)
  }

  const [provider] = await db
    .select()
    .from(providers)
    .where(and(eq(providers.id, id), eq(providers.businessId, access.businessId)))
    .limit(1)

  if (!provider) {
    return errorResponse(ApiMessageCode.PROVIDER_NOT_FOUND, 404)
  }

  const [stats] = await db
    .select({
      totalOrders: sql<number>`count(${orders.id})`,
      totalSpent: sql<number>`coalesce(sum(${orders.total}), 0)`,
      lastOrderDate: sql<number | null>`max(${orders.date})`,
    })
    .from(orders)
    .where(and(eq(orders.providerId, id), eq(orders.businessId, access.businessId)))

  return successResponse({
    provider,
    stats: {
      totalOrders: Number(stats?.totalOrders ?? 0),
      totalSpent: Number(stats?.totalSpent ?? 0),
      lastOrderDate: stats?.lastOrderDate ? new Date(Number(stats.lastOrderDate) * 1000).toISOString() : null,
    },
  })
})

/**
 * PATCH /api/businesses/[businessId]/providers/[id]
 *
 * Update a provider. All fields optional — provide only what changes.
 */
export const PATCH = withBusinessAuth(async (request, access, routeParams) => {
  if (!canManageBusiness(access.role)) {
    return errorResponse(ApiMessageCode.PROVIDER_FORBIDDEN_NOT_MANAGER, 403)
  }

  const id = routeParams?.id
  if (!id) {
    return errorResponse(ApiMessageCode.PROVIDER_NOT_FOUND, 404)
  }

  const [existing] = await db
    .select()
    .from(providers)
    .where(and(eq(providers.id, id), eq(providers.businessId, access.businessId)))
    .limit(1)

  if (!existing) {
    return errorResponse(ApiMessageCode.PROVIDER_NOT_FOUND, 404)
  }

  const body = await request.json()
  const validation = updateProviderSchema.safeParse(body)
  if (!validation.success) {
    return validationError(validation)
  }

  const { name, phone, email, notes, active } = validation.data
  const updateData: Record<string, unknown> = {}
  if (name !== undefined) updateData.name = name
  if (phone !== undefined) updateData.phone = phone || null
  if (email !== undefined) updateData.email = email || null
  if (notes !== undefined) updateData.notes = notes || null
  if (active !== undefined) updateData.active = active

  const [updated] = await db
    .update(providers)
    .set(updateData)
    .where(eq(providers.id, id))
    .returning()

  return successResponse({ provider: updated })
})

/**
 * DELETE /api/businesses/[businessId]/providers/[id]
 *
 * Hard-delete the provider. The orders table has a nullable providerId FK
 * with no onDelete cascade declared, so we null it out on dependent orders
 * first. Product name snapshots on each order item are unaffected.
 */
export const DELETE = withBusinessAuth(async (_request, access, routeParams) => {
  if (!canManageBusiness(access.role)) {
    return errorResponse(ApiMessageCode.PROVIDER_FORBIDDEN_NOT_MANAGER, 403)
  }

  const id = routeParams?.id
  if (!id) {
    return errorResponse(ApiMessageCode.PROVIDER_NOT_FOUND, 404)
  }

  const [existing] = await db
    .select()
    .from(providers)
    .where(and(eq(providers.id, id), eq(providers.businessId, access.businessId)))
    .limit(1)

  if (!existing) {
    return errorResponse(ApiMessageCode.PROVIDER_NOT_FOUND, 404)
  }

  await db
    .update(orders)
    .set({ providerId: null })
    .where(and(eq(orders.providerId, id), eq(orders.businessId, access.businessId)))

  await db.delete(providers).where(eq(providers.id, id))

  return successResponse({})
})
