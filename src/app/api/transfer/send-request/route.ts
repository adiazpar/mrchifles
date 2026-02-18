import { NextRequest, NextResponse } from 'next/server'
import PocketBase from 'pocketbase'
import { sendTransferRequestViaWhatsApp, isTwilioConfigured } from '@/lib/twilio'
import { isValidE164 } from '@/lib/countries'

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090'

/**
 * POST /api/transfer/send-request
 *
 * Send ownership transfer request via WhatsApp. Owner only.
 *
 * Body: { phoneNumber: "+51987654321", transferCode: "ABCD1234" }
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

    // Verify user is owner
    const pb = new PocketBase(POCKETBASE_URL)
    pb.authStore.save(token, null)

    let ownerName = 'El propietario'

    try {
      const authData = await pb.collection('users').authRefresh()
      const user = authData.record

      if (user.role !== 'owner') {
        return NextResponse.json(
          { error: 'Solo el propietario puede enviar transferencias' },
          { status: 403 }
        )
      }

      ownerName = user.name || 'El propietario'
    } catch {
      return NextResponse.json(
        { error: 'Sesion invalida' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { phoneNumber, transferCode } = body as {
      phoneNumber: string
      transferCode: string
    }

    // Validate phone number
    if (!phoneNumber || !isValidE164(phoneNumber)) {
      return NextResponse.json(
        { error: 'Numero de telefono invalido' },
        { status: 400 }
      )
    }

    // Validate transfer code format
    if (!transferCode || !/^[A-Z0-9]{8}$/.test(transferCode)) {
      return NextResponse.json(
        { error: 'Codigo de transferencia invalido' },
        { status: 400 }
      )
    }

    // Send transfer request via WhatsApp
    if (isTwilioConfigured()) {
      const result = await sendTransferRequestViaWhatsApp(phoneNumber, ownerName, transferCode)
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 500 }
        )
      }
    } else {
      // In development without Twilio, log the transfer
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mrchifles.vercel.app'
      console.warn(`[DEV] Transfer request to ${phoneNumber}: Code=${transferCode}, Link=${appUrl}/transfer?code=${transferCode}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending WhatsApp transfer request:', error)
    return NextResponse.json(
      { error: 'Error al enviar la solicitud' },
      { status: 500 }
    )
  }
}
