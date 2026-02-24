import { NextRequest, NextResponse } from 'next/server'
import PocketBase from 'pocketbase'
import { isValidE164 } from '@/lib/countries'

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090'

// Firebase project ID from environment
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

/**
 * Verify a Firebase ID token
 * This is a lightweight verification that checks the token structure and claims.
 * For production, consider using Firebase Admin SDK for full verification.
 */
async function verifyFirebaseToken(idToken: string): Promise<{
  valid: boolean
  phoneNumber?: string
  error?: string
}> {
  try {
    // Decode the JWT (base64) to get the payload
    const parts = idToken.split('.')
    if (parts.length !== 3) {
      return { valid: false, error: 'Token invalido' }
    }

    // Decode payload (middle part)
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64').toString('utf-8')
    )

    // Basic validation
    const now = Math.floor(Date.now() / 1000)

    // Check expiration
    if (payload.exp && payload.exp < now) {
      return { valid: false, error: 'Token expirado' }
    }

    // Check issued at (not in the future)
    if (payload.iat && payload.iat > now + 60) {
      return { valid: false, error: 'Token invalido' }
    }

    // Check issuer matches our Firebase project
    const expectedIssuer = `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`
    if (payload.iss !== expectedIssuer) {
      return { valid: false, error: 'Token invalido' }
    }

    // Check audience matches our Firebase project
    if (payload.aud !== FIREBASE_PROJECT_ID) {
      return { valid: false, error: 'Token invalido' }
    }

    // Check phone number is present
    if (!payload.phone_number) {
      return { valid: false, error: 'Token no contiene numero de telefono' }
    }

    return {
      valid: true,
      phoneNumber: payload.phone_number,
    }
  } catch (error) {
    console.error('Error verifying Firebase token:', error)
    return { valid: false, error: 'Error al verificar token' }
  }
}

/**
 * POST /api/otp/verify
 *
 * Verify a Firebase ID token and confirm phone number verification.
 *
 * Body: { idToken: "firebase_id_token", phoneNumber: "+51987654321" }
 * Response: { valid: true, phoneNumber: "+51987654321" } or { valid: false, error: "..." }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { idToken, phoneNumber } = body as {
      idToken: string
      phoneNumber: string
    }

    // Validate phone number format
    if (!phoneNumber || !isValidE164(phoneNumber)) {
      return NextResponse.json(
        { valid: false, error: 'Numero de telefono invalido' },
        { status: 400 }
      )
    }

    // Validate token is provided
    if (!idToken) {
      return NextResponse.json(
        { valid: false, error: 'Token de verificacion requerido' },
        { status: 400 }
      )
    }

    // Check if Firebase is configured
    if (!FIREBASE_PROJECT_ID) {
      console.error('Firebase project ID not configured')
      return NextResponse.json(
        { valid: false, error: 'Error de configuracion del servidor' },
        { status: 500 }
      )
    }

    // Verify the Firebase ID token
    const verification = await verifyFirebaseToken(idToken)

    if (!verification.valid) {
      return NextResponse.json({
        valid: false,
        error: verification.error || 'Token invalido',
      })
    }

    // Check that the phone number in the token matches the requested phone
    if (verification.phoneNumber !== phoneNumber) {
      return NextResponse.json({
        valid: false,
        error: 'El numero verificado no coincide',
      })
    }

    // For registration, check if phone is already registered
    const purpose = body.purpose as string | undefined
    if (purpose === 'registration' || purpose === 'phone-change') {
      const pb = new PocketBase(POCKETBASE_URL)

      const adminEmail = process.env.PB_ADMIN_EMAIL
      const adminPassword = process.env.PB_ADMIN_PASSWORD

      if (adminEmail && adminPassword) {
        try {
          await pb.collection('_superusers').authWithPassword(adminEmail, adminPassword)

          const existingUsers = await pb.collection('users').getList(1, 1, {
            filter: `phoneNumber = "${phoneNumber}"`,
          })

          if (existingUsers.totalItems > 0) {
            return NextResponse.json({
              valid: false,
              error: 'Este numero ya esta registrado',
            })
          }
        } catch (error) {
          console.warn('Could not check for existing phone number:', error)
          // Continue - registration will catch duplicates later
        }
      }
    }

    return NextResponse.json({
      valid: true,
      phoneNumber: verification.phoneNumber,
    })
  } catch (error) {
    console.error('Error verifying OTP:', error)
    return NextResponse.json(
      { valid: false, error: 'Error al verificar el codigo' },
      { status: 500 }
    )
  }
}
