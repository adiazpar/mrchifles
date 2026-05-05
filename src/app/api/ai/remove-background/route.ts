import { NextResponse } from 'next/server'
import { fal } from '@fal-ai/client'
import sharp from 'sharp'

// See generate-icon for the rationale on module-scope fal.config().
if (process.env.FAL_KEY) {
  fal.config({ credentials: process.env.FAL_KEY })
}
import { errorResponse, withAuth, applyRateLimit, enforceMaxContentLength } from '@/lib/api-middleware'
import { ApiMessageCode } from '@/lib/api-messages'
import { RateLimits } from '@/lib/rate-limit'
import { decodeAndSniffAiImage } from '@/lib/file-sniff'
import { logServerError } from '@/lib/server-logger'

// See identify-product for rationale.
const MAX_AI_IMAGE_BYTES = 1_500_000
const MAX_FAL_RESPONSE_BYTES = 10 * 1024 * 1024
// Sharp's default limitInputPixels is ~268M (16383x16383). Tighten
// to 16M (4096x4096) — more than enough for any legit photo, and
// stops a decompression-bomb PNG from allocating multi-GB pixel
// buffers and OOMing the Lambda.
const SHARP_PIXEL_LIMIT = 16_777_216

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

  // See identify-product for the three-layer rationale.
  const rateLimited = await applyRateLimit(`ai:${user.userId}`, RateLimits.ai)
  if (rateLimited) return rateLimited
  const userDailyLimited = await applyRateLimit(
    `ai-daily:${user.userId}`,
    RateLimits.aiDaily,
    ApiMessageCode.AI_RATE_LIMITED,
  )
  if (userDailyLimited) return userDailyLimited
  const today = new Date().toISOString().slice(0, 10)
  const globalLimited = await applyRateLimit(
    `ai-global:${today}`,
    RateLimits.aiGlobalDaily,
    ApiMessageCode.AI_RATE_LIMITED,
  )
  if (globalLimited) return globalLimited

  try {
    const { image } = await request.json()

    // Decode + content-sniff before fal.ai. Same rationale as the
    // sister AI routes — stops non-image strings from burning provider
    // tokens and hardens against a future change that ever forwards
    // the input to a less-trusted service.
    const sniffResult = decodeAndSniffAiImage(image, MAX_AI_IMAGE_BYTES)
    if (!sniffResult.ok) {
      return errorResponse(ApiMessageCode.AI_IMAGE_REQUIRED, 400)
    }

    if (!process.env.FAL_KEY) {
      return errorResponse(ApiMessageCode.AI_NOT_CONFIGURED, 500)
    }

    const startTime = Date.now()

    // Use run() instead of subscribe() for faster direct execution (no queue overhead)
    const result = await fal.run('fal-ai/birefnet', {
      input: {
        // SNIFFED data URL — never the raw client-declared one.
        image_url: sniffResult.dataUrl,
        model: 'General Use (Light)', // Fast and good quality
        output_format: 'png',
        refine_foreground: true, // Polish edges
      },
    })

    const _elapsed = Date.now() - startTime

    // Extract the result image URL
    const imageData = result.data?.image
    if (!imageData?.url) {
      logServerError(
        'ai.remove-background.no-image',
        new Error('fal returned no image in response'),
        { resultData: result.data },
      )
      return errorResponse(ApiMessageCode.AI_BACKGROUND_FAILED, 500)
    }

    const imageUrl = imageData.url

    // Fetch the image and convert to base64 data URL for client.
    // Cap the response size — see generate-icon for rationale.
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      logServerError(
        'ai.remove-background.fetch-failed',
        new Error(`fal image fetch returned ${imageResponse.status}`),
      )
      return errorResponse(ApiMessageCode.AI_BACKGROUND_FAILED, 500)
    }
    const declaredLength = Number(imageResponse.headers.get('content-length') ?? 0)
    if (declaredLength > MAX_FAL_RESPONSE_BYTES) {
      logServerError(
        'ai.remove-background.oversize-response',
        new Error(`fal response declared ${declaredLength} bytes, cap is ${MAX_FAL_RESPONSE_BYTES}`),
      )
      return errorResponse(ApiMessageCode.AI_BACKGROUND_FAILED, 502)
    }

    const rawBuffer = Buffer.from(await imageResponse.arrayBuffer())
    if (rawBuffer.byteLength > MAX_FAL_RESPONSE_BYTES) {
      return errorResponse(ApiMessageCode.AI_BACKGROUND_FAILED, 502)
    }

    // Standardize: trim transparent pixels, add padding, resize to fixed canvas.
    // limitInputPixels caps decoded bytes — defense against PNG
    // decompression bombs that compress to <1 KB but expand to GBs.
    const trimmed = sharp(rawBuffer, { limitInputPixels: SHARP_PIXEL_LIMIT }).trim()
    const trimmedBuffer = await trimmed.toBuffer()
    const trimmedMeta = await sharp(trimmedBuffer, { limitInputPixels: SHARP_PIXEL_LIMIT }).metadata()

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
    logServerError('ai.remove-background', error)
    return errorResponse(ApiMessageCode.AI_BACKGROUND_FAILED, 500)
  }
})
