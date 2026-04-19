import { db, providers, providerNotes } from '@/db'
import { eq, and, desc, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { canManageBusiness } from '@/lib/business-auth'
import { withBusinessAuth, validationError, errorResponse, successResponse } from '@/lib/api-middleware'
import { ApiMessageCode } from '@/lib/api-messages'
import { MAX_PROVIDER_NOTES, NOTE_TITLE_MAX, NOTE_BODY_MAX } from '@/lib/provider-notes'

const createNoteSchema = z.object({
  title: z.string().min(1).max(NOTE_TITLE_MAX),
  body: z.string().min(1).max(NOTE_BODY_MAX),
})

/**
 * POST /api/businesses/[businessId]/providers/[id]/notes
 *
 * Create a new note on a provider. Caps at MAX_PROVIDER_NOTES per provider.
 */
export const POST = withBusinessAuth(async (request, access, routeParams) => {
  if (!canManageBusiness(access.role)) {
    return errorResponse(ApiMessageCode.PROVIDER_FORBIDDEN_NOT_MANAGER, 403)
  }

  const providerId = routeParams?.id
  if (!providerId) {
    return errorResponse(ApiMessageCode.PROVIDER_NOT_FOUND, 404)
  }

  const [existingProvider] = await db
    .select({ id: providers.id })
    .from(providers)
    .where(and(eq(providers.id, providerId), eq(providers.businessId, access.businessId)))
    .limit(1)

  if (!existingProvider) {
    return errorResponse(ApiMessageCode.PROVIDER_NOT_FOUND, 404)
  }

  const body = await request.json()
  const validation = createNoteSchema.safeParse(body)
  if (!validation.success) {
    return validationError(validation)
  }

  // Limit check: count existing notes before inserting so a client-side
  // stale count can't bypass the cap.
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(providerNotes)
    .where(and(
      eq(providerNotes.providerId, providerId),
      eq(providerNotes.businessId, access.businessId),
    ))

  if (Number(count) >= MAX_PROVIDER_NOTES) {
    return errorResponse(ApiMessageCode.PROVIDER_NOTES_LIMIT_REACHED, 400, {
      max: MAX_PROVIDER_NOTES,
    })
  }

  const now = new Date()
  const [newNote] = await db
    .insert(providerNotes)
    .values({
      id: nanoid(),
      providerId,
      businessId: access.businessId,
      title: validation.data.title.trim(),
      body: validation.data.body.trim(),
      createdAt: now,
      updatedAt: now,
    })
    .returning()

  // Return the fresh list so the client can replace state in one shot — no
  // extra round-trip to re-sort.
  const notes = await db
    .select()
    .from(providerNotes)
    .where(and(
      eq(providerNotes.providerId, providerId),
      eq(providerNotes.businessId, access.businessId),
    ))
    .orderBy(desc(providerNotes.createdAt))

  return successResponse({ note: newNote, notes }, ApiMessageCode.PROVIDER_NOTE_CREATED)
})
