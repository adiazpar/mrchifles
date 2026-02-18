import { NextRequest, NextResponse } from 'next/server'
import PocketBase from 'pocketbase'
import { sendTransferAcceptedViaWhatsApp, isTwilioConfigured } from '@/lib/twilio'
import { isValidE164 } from '@/lib/countries'

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090'

/**
 * POST /api/transfer/send-accepted
 *
 * Send notification to owner that transfer was accepted. Recipient only.
 *
 * Body: { ownerPhone: "+51987654321" }
 * Headers: { Authorization: "Bearer <token>" }
 * Response: { success: true } or { error: "..." }
 */
export async function POST(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    // Verify user is authenticated
    const pb = new PocketBase(POCKETBASE_URL)
    pb.authStore.save(token, null)

    let recipientName = 'El destinatario'

    try {
      const authData = await pb.collection('users').authRefresh()
      const user = authData.record
      recipientName = user.name || 'El destinatario'
    } catch {
      return NextResponse.json(
        { error: 'Sesion invalida' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { ownerPhone } = body as {
      ownerPhone: string
    }

    // Validate phone number
    if (!ownerPhone || !isValidE164(ownerPhone)) {
      return NextResponse.json(
        { error: 'Numero de telefono invalido' },
        { status: 400 }
      )
    }

    // Send accepted notification via WhatsApp
    if (isTwilioConfigured()) {
      const result = await sendTransferAcceptedViaWhatsApp(ownerPhone, recipientName)
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 500 }
        )
      }
    } else {
      // In development without Twilio, log the notification
      console.warn(`[DEV] Transfer accepted notification to owner ${ownerPhone}: Accepted by ${recipientName}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending WhatsApp transfer accepted:', error)
    return NextResponse.json(
      { error: 'Error al enviar la notificacion' },
      { status: 500 }
    )
  }
}
