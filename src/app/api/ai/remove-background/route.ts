import { NextResponse } from 'next/server'
import { fal } from '@fal-ai/client'
import sharp from 'sharp'
import { errorResponse, withAuth, applyRateLimit, enforceMaxContentLength } from '@/lib/api-middleware'
import { ApiMessageCode } from '@/lib/api-messages'
import { RateLimits } from '@/lib/rate-limit'

const MAX_BODY_BYTES = 2 * 1024 * 1024

const ICON_SIZE = 256
const ICON_PADDING = 24 // pixels of transparent padding around the subject

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

export const POST = withAuth(async (request, user) => {
  const oversize = enforceMaxContentLength(request, MAX_BODY_BYTES)
  if (oversize) return oversize

  const rateLimited = applyRateLimit(`ai:${user.userId}`, RateLimits.ai)
  if (rateLimited) return rateLimited

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
      return errorResponse(ApiMessageCode.AI_BACKGROUND_FAILED, 500)
    }

    const imageUrl = imageData.url

    // Fetch the image and convert to base64 data URL for client
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      console.error('[remove-background] Failed to fetch processed image')
      return errorResponse(ApiMessageCode.AI_BACKGROUND_FAILED, 500)
    }

    const rawBuffer = Buffer.from(await imageResponse.arrayBuffer())

    // Standardize: trim transparent pixels, add padding, resize to fixed canvas
    const trimmed = sharp(rawBuffer).trim()
    const trimmedBuffer = await trimmed.toBuffer()
    const trimmedMeta = await sharp(trimmedBuffer).metadata()

    const subjectW = trimmedMeta.width || ICON_SIZE
    const subjectH = trimmedMeta.height || ICON_SIZE

    // Calculate the size the subject should fit into (canvas minus padding)
    const innerSize = ICON_SIZE - ICON_PADDING * 2

    // Scale subject to fit within innerSize, preserving aspect ratio
    const scale = Math.min(innerSize / subjectW, innerSize / subjectH)
    const fitW = Math.round(subjectW * scale)
    const fitH = Math.round(subjectH * scale)

    const resizedSubject = await sharp(trimmedBuffer)
      .resize(fitW, fitH, { fit: 'inside' })
      .toBuffer()

    // Place centered on a transparent canvas
    const standardized = await sharp({
      create: {
        width: ICON_SIZE,
        height: ICON_SIZE,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{
        input: resizedSubject,
        gravity: 'centre',
      }])
      .png()
      .toBuffer()

    const base64 = standardized.toString('base64')
    const dataUrl = `data:image/png;base64,${base64}`

    return NextResponse.json({
      success: true,
      data: {
        image: dataUrl,
      },
    })
  } catch (error) {
    console.error('[remove-background] Error:', error)
    return errorResponse(ApiMessageCode.AI_BACKGROUND_FAILED, 500)
  }
})
