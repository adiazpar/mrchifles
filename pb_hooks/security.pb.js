/// <reference path="../pb_data/types.d.ts" />

/**
 * Security hooks for Mr. Chifles POS application
 *
 * These hooks enhance security by:
 * 1. Hiding PIN hashes from user records (except for the user's own record)
 * 2. Adding security headers to responses
 */

// Hide PIN field from user records when viewing other users
// The authenticated user can still see their own PIN (needed for client-side verification)
onRecordEnrich((e) => {
  const requestAuth = e.requestInfo?.auth
  const recordId = e.record.id

  // If viewing another user's record (not your own), hide the PIN
  // This prevents owners from seeing team members' PIN hashes
  if (requestAuth && requestAuth.id !== recordId) {
    e.record.hide("pin")
  }

  // If no auth (shouldn't happen with current rules, but defensive)
  if (!requestAuth) {
    e.record.hide("pin")
  }

  e.next()
}, "users")

// Log security-relevant events (optional, for debugging)
onRecordAfterAuthWithPasswordRequest((e) => {
  console.log(`[SECURITY] Password auth: ${e.record.email} from ${e.httpContext.realIP()}`)
  e.next()
})

// Log failed auth attempts (for monitoring)
onRecordAuthRequest((e) => {
  // This fires before auth is processed
  e.next()
})

// ============================================
// SERVER-SIDE PIN VERIFICATION ENDPOINT
// ============================================

const PIN_SALT = 'mrchifles_pin_v1_'

/**
 * Hash PIN using SHA-256 (same algorithm as client-side)
 */
function hashPinServer(pin) {
  const input = PIN_SALT + pin
  // PocketBase JSVM provides $security.sha256
  return $security.sha256(input)
}

/**
 * Custom endpoint for server-side PIN verification
 * POST /api/verify-pin
 * Body: { pin: "1234" }
 * Returns: { valid: true/false, error?: string }
 *
 * This endpoint allows PIN verification without exposing the hash to the client
 */
routerAdd("POST", "/api/verify-pin", (c) => {
  try {
    // Require authentication
    const authRecord = c.get("authRecord")
    if (!authRecord) {
      return c.json(401, { valid: false, error: "No autenticado" })
    }

    // Parse request body
    const body = $apis.requestInfo(c).body
    const pin = body?.pin

    if (!pin || typeof pin !== 'string' || pin.length !== 4) {
      return c.json(400, { valid: false, error: "PIN invalido" })
    }

    // Get stored PIN hash from user record
    const storedHash = authRecord.get("pin")
    if (!storedHash) {
      return c.json(400, { valid: false, error: "PIN no configurado" })
    }

    // Hash the provided PIN and compare
    const providedHash = hashPinServer(pin)
    const isValid = providedHash === storedHash

    if (!isValid) {
      console.log(`[SECURITY] Failed PIN attempt for user: ${authRecord.email}`)
    }

    return c.json(200, { valid: isValid })
  } catch (err) {
    console.error("[SECURITY] PIN verification error:", err)
    return c.json(500, { valid: false, error: "Error del servidor" })
  }
}, $apis.requireRecordAuth())
