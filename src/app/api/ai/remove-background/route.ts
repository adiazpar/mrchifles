import { NextRequest, NextResponse } from 'next/server'
import { fal } from '@fal-ai/client'

/**
 * POST /api/ai/remove-background
 *
 * Removes background from an image using BiRefNet on fal.ai.
 * Much faster than client-side removal (~1-3s vs ~10-15s).
 *
 * Cost: ~$0.005/image (estimated)
 * Speed: ~1-3 seconds
 *
 * Request body:
 * { image: string } // base64 encoded image (data URL)
 *
 * Response:
 * { success: true, data: { image: string } } // base64 PNG with transparent bg
 * { success: false, error: string }
 */

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json()

    if (!image || typeof image !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Se requiere una imagen' },
        { status: 400 }
      )
    }

    const apiKey = process.env.FAL_KEY

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API de fal.ai no configurada' },
        { status: 500 }
      )
    }

    // Configure fal.ai client
    fal.config({ credentials: apiKey })

    const startTime = Date.now()

    // Use run() instead of subscribe() for faster direct execution (no queue overhead)
    const result = await fal.run('fal-ai/birefnet', {
      input: {
        image_url: image, // fal.ai accepts base64 data URIs
        model: 'General Use (Light)', // Fast and good quality
        output_format: 'png',
        refine_foreground: true, // Polish edges
      },
    })

    const _elapsed = Date.now() - startTime

    // Extract the result image URL
    const imageData = result.data?.image
    if (!imageData?.url) {
      console.error('[remove-background] No image in response:', JSON.stringify(result.data, null, 2))
      return NextResponse.json(
        { success: false, error: 'No se proceso la imagen' },
        { status: 500 }
      )
    }

    const imageUrl = imageData.url

    // Fetch the image and convert to base64 data URL for client
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      console.error('[remove-background] Failed to fetch processed image')
      return NextResponse.json(
        { success: false, error: 'Error al obtener la imagen procesada' },
        { status: 500 }
      )
    }

    const imageBuffer = await imageResponse.arrayBuffer()
    const base64 = Buffer.from(imageBuffer).toString('base64')
    const contentType = imageResponse.headers.get('content-type') || 'image/png'
    const dataUrl = `data:${contentType};base64,${base64}`

    return NextResponse.json({
      success: true,
      data: {
        image: dataUrl,
      },
    })
  } catch (error) {
    console.error('[remove-background] Error:', error)

    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
