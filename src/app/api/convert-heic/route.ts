import { NextResponse } from 'next/server'
import { errorResponse, withAuth, applyRateLimit, enforceMaxContentLength } from '@/lib/api-middleware'
import { ApiMessageCode } from '@/lib/api-messages'
import { RateLimits } from '@/lib/rate-limit'

// iPhone HEIC captures top out around 10-15 MB; cap at 30 MB for headroom.
const MAX_BODY_BYTES = 30 * 1024 * 1024

export const POST = withAuth(async (request, user) => {
  const oversize = enforceMaxContentLength(request, MAX_BODY_BYTES)
  if (oversize) return oversize

  const rateLimited = await applyRateLimit(`heic:${user.userId}`, RateLimits.heic)
  if (rateLimited) return rateLimited

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return errorResponse(ApiMessageCode.HEIC_NO_FILE, 400)
    }

    // Debug logging for HEIC conversion

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const inputBuffer = Buffer.from(arrayBuffer)

    let jpegBuffer: Buffer

    try {
      // Try heic-convert first (works on all platforms including Vercel)
      const convert = (await import('heic-convert')).default

      const outputBuffer = await convert({
        buffer: inputBuffer,
        format: 'JPEG',
        quality: 0.9,
      })

      jpegBuffer = Buffer.from(outputBuffer)
    } catch {
      // heic-convert failed, try sips fallback (macOS only)

      // Fallback to macOS sips command (uses execFile for security)
      const { writeFile, unlink, readFile } = await import('fs/promises')
      const { tmpdir } = await import('os')
      const { join } = await import('path')
      const { execFile } = await import('child_process')
      const { promisify } = await import('util')

      const execFileAsync = promisify(execFile)

      const tempInput = join(tmpdir(), `heic-${Date.now()}.heic`)
      const tempOutput = join(tmpdir(), `heic-${Date.now()}.jpg`)

      await writeFile(tempInput, inputBuffer)

      try {
        // Using execFile (not exec) to prevent shell injection
        await execFileAsync('sips', [
          '-s', 'format', 'jpeg',
          '-s', 'formatOptions', '90',
          tempInput,
          '--out', tempOutput
        ])

        jpegBuffer = await readFile(tempOutput)

        // Cleanup
        await unlink(tempInput).catch(() => {})
        await unlink(tempOutput).catch(() => {})
      } catch {
        await unlink(tempInput).catch(() => {})
        await unlink(tempOutput).catch(() => {})
        throw new Error('Both heic-convert and sips failed')
      }
    }

    // Convert to base64 data URL
    const base64 = `data:image/jpeg;base64,${jpegBuffer.toString('base64')}`

    return NextResponse.json({
      success: true,
      data: {
        image: base64,
      },
    })
  } catch (error) {
    console.error('[convert-heic] Error:', error)
    return errorResponse(ApiMessageCode.HEIC_CONVERT_FAILED, 500)
  }
})
