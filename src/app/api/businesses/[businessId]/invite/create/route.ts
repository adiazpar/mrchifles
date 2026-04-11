import { db, inviteCodes } from '@/db'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { isOwner } from '@/lib/business-auth'
import { withBusinessAuth, validationError, errorResponse, successResponse } from '@/lib/api-middleware'
import { ApiMessageCode } from '@/lib/api-messages'

const createInviteSchema = z.object({
  code: z.string().length(6).toUpperCase(),
  role: z.enum(['partner', 'employee']),
  expiresAt: z.iso.datetime(),
})

/**
 * POST /api/businesses/[businessId]/invite/create
 *
 * Create a new invite code.
 */
export const POST = withBusinessAuth(async (request, access) => {
  if (!isOwner(access.role)) {
    return errorResponse(ApiMessageCode.TEAM_FORBIDDEN_NOT_OWNER, 403)
  }

  const body = await request.json()
  const validation = createInviteSchema.safeParse(body)

  if (!validation.success) {
    return validationError(validation)
  }

  const { code, role, expiresAt } = validation.data

  const inviteId = nanoid()

  await db.insert(inviteCodes).values({
    id: inviteId,
    businessId: access.businessId,
    code,
    role,
    expiresAt: new Date(expiresAt),
  })

  return successResponse({ id: inviteId, code })
})
