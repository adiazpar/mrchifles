import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { errorResponse, withAuth, applyRateLimit } from '@/lib/api-middleware'
import { ApiMessageCode } from '@kasero/shared/api-messages'
import { RateLimits } from '@/lib/rate-limit'
import { isHeic } from '@/lib/file-sniff'
import { logServerError } from '@/lib/server-logger'

// iPhone HEIC captures top out around 10-15 MB; cap at 30 MB for headroom.
const MAX_BODY_BYTES = 30 * 1024 * 1024

export const POST = withAuth(async (request, user) => {
  const rateLimited = await applyRateLimit(`heic:${user.userId}`, RateLimits.heic)
  if (rateLimited) return rateLimited

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return errorResponse(ApiMessageCode.HEIC_NO_FILE, 400)
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const inputBuffer = Buffer.from(arrayBuffer)

    // Magic-byte sniff BEFORE handing the bytes to heic-convert /
    // libheif. heic-convert wraps native parsers with a long history
    // of CVEs; sniffing first refuses to invoke the parser on
    // anything that isn't actually HEIC. Belt-and-suspenders with
    // the rate limit + body size cap above.
    if (!isHeic(inputBuffer)) {
      return errorResponse(ApiMessageCode.HEIC_NO_FILE, 400)
    }

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

      // Use crypto.randomUUID() instead of Date.now() — under
      // concurrent calls within the same millisecond the old name
      // collided, with the second writer overwriting the first
      // writer's input file.
      const requestId = randomUUID()
      const tempInput = join(tmpdir(), `heic-${requestId}.heic`)
      const tempOutput = join(tmpdir(), `heic-${requestId}.jpg`)

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
    logServerError('heic.convert', error)
    return errorResponse(ApiMessageCode.HEIC_CONVERT_FAILED, 500)
  }
}, { maxBodyBytes: MAX_BODY_BYTES })
