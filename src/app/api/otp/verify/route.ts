import { NextRequest, NextResponse } from 'next/server'
import PocketBase from 'pocketbase'
import { isValidE164 } from '@/lib/countries'

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090'

/**
 * POST /api/otp/verify
 *
 * Verify an OTP code.
 *
 * Body: { phoneNumber: "+51987654321", code: "123456" }
 * Response: { valid: true } or { valid: false, error: "..." }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phoneNumber, code } = body as {
      phoneNumber: string
      code: string
    }

    // Validate phone number format
    if (!phoneNumber || !isValidE164(phoneNumber)) {
      return NextResponse.json(
        { valid: false, error: 'Numero de telefono invalido' },
        { status: 400 }
      )
    }

    // Validate code format (6 digits)
    if (!code || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { valid: false, error: 'Codigo debe tener 6 digitos' },
        { status: 400 }
      )
    }

    // Connect to PocketBase as admin
    const pb = new PocketBase(POCKETBASE_URL)

    const adminEmail = process.env.PB_ADMIN_EMAIL
    const adminPassword = process.env.PB_ADMIN_PASSWORD

    if (adminEmail && adminPassword) {
      try {
        await pb.collection('_superusers').authWithPassword(adminEmail, adminPassword)
      } catch (authError) {
        console.error('Admin auth failed:', authError)
        return NextResponse.json(
          { valid: false, error: 'Error del servidor' },
          { status: 500 }
        )
      }
    }

    // Find the OTP record
    const otps = await pb.collection('otp_codes').getList(1, 1, {
      filter: `phoneNumber = "${phoneNumber}" && used = false`,
      sort: '-created',
    })

    if (otps.totalItems === 0) {
      return NextResponse.json({
        valid: false,
        error: 'No hay codigo pendiente. Solicita uno nuevo.',
      })
    }

    const otpRecord = otps.items[0]

    // Check if expired
    const expiresAt = new Date(otpRecord.expiresAt)
    if (expiresAt < new Date()) {
      // Mark as used so it can't be tried again
      await pb.collection('otp_codes').update(otpRecord.id, { used: true })
      return NextResponse.json({
        valid: false,
        error: 'Codigo expirado. Solicita uno nuevo.',
      })
    }

    // Check if code matches
    if (otpRecord.code !== code) {
      return NextResponse.json({
        valid: false,
        error: 'Codigo incorrecto',
      })
    }

    // Code is valid - mark as used
    await pb.collection('otp_codes').update(otpRecord.id, { used: true })

    return NextResponse.json({
      valid: true,
      purpose: otpRecord.purpose,
    })
  } catch (error) {
    console.error('Error verifying OTP:', error)
    return NextResponse.json(
      { valid: false, error: 'Error al verificar el codigo' },
      { status: 500 }
    )
  }
}
