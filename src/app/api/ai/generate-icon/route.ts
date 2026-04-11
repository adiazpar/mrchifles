import { NextRequest, NextResponse } from 'next/server'
import { fal } from '@fal-ai/client'
import { errorResponse } from '@/lib/api-middleware'
import { ApiMessageCode } from '@/lib/api-messages'

/**
 * POST /api/ai/generate-icon
 *
 * Generates an emoji-style icon from a product image.
 * Uses Nano Banana (Gemini 2.5 Flash Image) on fal.ai.
 *
 * Cost: ~$0.039/image
 * Speed: ~2-5 seconds
 *
 * Request body:
 * { image: string } // base64 encoded image (data URL)
 *
 * Response:
 * { success: true, data: { icon: string } } // base64 PNG image
 * { success: false, error: string }
 */

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json()

    if (!image || typeof image !== 'string') {
      return errorResponse(ApiMessageCode.AI_IMAGE_REQUIRED, 400)
    }

    const apiKey = process.env.FAL_KEY

    if (!apiKey) {
      return errorResponse(ApiMessageCode.AI_NOT_CONFIGURED, 500)
    }

    // Configure fal.ai client
    fal.config({ credentials: apiKey })

    // ========================================
    // Generate emoji icon using Nano Banana (Gemini 2.5 Flash Image)
    // Cost: ~$0.039/image
    // Speed: ~2-5 seconds
    // ========================================
    const startTime = Date.now()

    // Use run() instead of subscribe() for faster direct execution (no queue overhead)
    const result = await fal.run('fal-ai/nano-banana/edit', {
      input: {
        prompt:
          'Transform into a clean Apple iOS emoji style icon. Simple centered single object, vibrant saturated colors, cartoon-like, pure white background, stylized like an official Apple emoji. No shadows, no gradients on background.',
        image_urls: [image], // Nano Banana accepts array of image URLs/data URIs
      },
    })

    const _elapsed = Date.now() - startTime

    // Extract the generated image URL from response
    const images = result.data?.images
    if (!images || images.length === 0 || !images[0].url) {
      console.error('[generate-icon] No image in response:', JSON.stringify(result.data, null, 2))
      return errorResponse(ApiMessageCode.AI_ICON_FAILED, 500)
    }

    const imageUrl = images[0].url

    // Fetch the image and convert to base64 data URL for client
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      console.error('[generate-icon] Failed to fetch generated image')
      return errorResponse(ApiMessageCode.AI_ICON_FAILED, 500)
    }

    const imageBuffer = await imageResponse.arrayBuffer()
    const base64 = Buffer.from(imageBuffer).toString('base64')
    const contentType = imageResponse.headers.get('content-type') || 'image/png'
    const dataUrl = `data:${contentType};base64,${base64}`

    return NextResponse.json({
      success: true,
      data: {
        icon: dataUrl,
      },
    })
  } catch (error) {
    console.error('[generate-icon] Error:', error)

    // Check for rate limit
    if (error instanceof Error && (error.message.includes('rate') || error.message.includes('quota'))) {
      return errorResponse(ApiMessageCode.AI_RATE_LIMITED, 429)
    }

    return errorResponse(ApiMessageCode.AI_ICON_FAILED, 500)
  }
}
