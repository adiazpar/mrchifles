import { NextRequest, NextResponse } from 'next/server'
import PocketBase from 'pocketbase'
import { isValidE164 } from '@/lib/countries'

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090'

/**
 * Convert phone number to auth email format for PocketBase
 * +51987654321 -> 51987654321@phone.local
 */
function phoneToAuthEmail(phoneNumber: string): string {
  const digits = phoneNumber.replace('+', '')
  return `${digits}@phone.local`
}

/**
 * POST /api/phone/change
 *
 * Update user's phone number after OTP verification.
 * Requires authentication via Authorization header.
 *
 * Body: { newPhoneNumber: "+51987654321", otpCode: "123456" }
 * Response: { success: true, user: User } or { success: false, error: "..." }
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Extract token (supports both "Bearer token" and plain "token" formats)
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader

    const body = await request.json()
    const { newPhoneNumber, otpCode } = body as {
      newPhoneNumber: string
      otpCode: string
    }

    // Validate new phone number format
    if (!newPhoneNumber || !isValidE164(newPhoneNumber)) {
      return NextResponse.json(
        { success: false, error: 'Numero de telefono invalido' },
        { status: 400 }
      )
    }

    // Validate OTP code format (6 digits)
    if (!otpCode || !/^\d{6}$/.test(otpCode)) {
      return NextResponse.json(
        { success: false, error: 'Codigo debe tener 6 digitos' },
        { status: 400 }
      )
    }

    // Connect to PocketBase as admin to verify OTP and update user
    const pb = new PocketBase(POCKETBASE_URL)

    const adminEmail = process.env.PB_ADMIN_EMAIL
    const adminPassword = process.env.PB_ADMIN_PASSWORD

    if (!adminEmail || !adminPassword) {
      return NextResponse.json(
        { success: false, error: 'Error de configuracion del servidor' },
        { status: 500 }
      )
    }

    try {
      await pb.collection('_superusers').authWithPassword(adminEmail, adminPassword)
    } catch (authError) {
      console.error('Admin auth failed:', authError)
      return NextResponse.json(
        { success: false, error: 'Error del servidor' },
        { status: 500 }
      )
    }

    // Verify user token is valid by checking user exists
    // Create a separate PocketBase instance to validate the user token
    const userPb = new PocketBase(POCKETBASE_URL)
    userPb.authStore.save(token, null)

    let currentUser
    try {
      const authData = await userPb.collection('users').authRefresh()
      currentUser = authData.record
    } catch {
      return NextResponse.json(
        { success: false, error: 'Sesion invalida' },
        { status: 401 }
      )
    }

    // Check if new phone is already registered by another user
    try {
      const existingUsers = await pb.collection('users').getList(1, 1, {
        filter: `phoneNumber = "${newPhoneNumber}" && id != "${currentUser.id}"`,
      })
      if (existingUsers.totalItems > 0) {
        return NextResponse.json(
          { success: false, error: 'Este numero ya esta registrado' },
          { status: 400 }
        )
      }
    } catch {
      console.warn('Could not check for existing phone number')
    }

    // Verify OTP for the new phone number
    const otps = await pb.collection('otp_codes').getList(1, 1, {
      filter: `phoneNumber = "${newPhoneNumber}" && used = false && purpose = "phone-change"`,
      sort: '-created',
    })

    if (otps.totalItems === 0) {
      return NextResponse.json({
        success: false,
        error: 'No hay codigo pendiente. Solicita uno nuevo.',
      })
    }

    const otpRecord = otps.items[0]

    // Check if expired
    const expiresAt = new Date(otpRecord.expiresAt)
    if (expiresAt < new Date()) {
      await pb.collection('otp_codes').update(otpRecord.id, { used: true })
      return NextResponse.json({
        success: false,
        error: 'Codigo expirado. Solicita uno nuevo.',
      })
    }

    // Check if code matches
    if (otpRecord.code !== otpCode) {
      return NextResponse.json({
        success: false,
        error: 'Codigo incorrecto',
      })
    }

    // Mark OTP as used
    await pb.collection('otp_codes').update(otpRecord.id, { used: true })

    // Update user's phone number and email (auth email)
    const newAuthEmail = phoneToAuthEmail(newPhoneNumber)

    const updatedUser = await pb.collection('users').update(currentUser.id, {
      phoneNumber: newPhoneNumber,
      email: newAuthEmail,
      phoneVerified: true,
    })

    return NextResponse.json({
      success: true,
      user: updatedUser,
    })
  } catch (error) {
    console.error('Error changing phone number:', error)
    return NextResponse.json(
      { success: false, error: 'Error al cambiar el numero de telefono' },
      { status: 500 }
    )
  }
}
