import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, users } from '@/db'
import { getCurrentUser } from '@/lib/simple-auth'
import { setLocaleCookieServer } from '@/lib/locale-cookie'
import { SUPPORTED_LOCALES } from '@/i18n/config'
import { validationError } from '@/lib/api-middleware'

const bodySchema = z.object({
  language: z.enum(SUPPORTED_LOCALES),
})

/**
 * PATCH /api/user/language
 *
 * Update the current user's UI language preference. Persists to the users
 * table and rewrites the kasero-locale cookie so the next RSC render picks
 * up the new message bundle.
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getCurrentUser()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = bodySchema.safeParse(body)
    if (!validation.success) {
      return validationError(validation)
    }

    const { language } = validation.data

    await db
      .update(users)
      .set({ language })
      .where(eq(users.id, session.userId))

    await setLocaleCookieServer(language)

    return NextResponse.json({ language })
  } catch (error) {
    console.error('Update language error:', error)
    return NextResponse.json(
      { error: 'Failed to update language' },
      { status: 500 }
    )
  }
}
