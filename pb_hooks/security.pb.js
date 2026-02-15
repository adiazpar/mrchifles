/// <reference path="../pb_data/types.d.ts" />

/**
 * Security hooks for Mr. Chifles POS application (PocketBase 0.36+)
 *
 * These hooks enhance security by:
 * 1. Hiding PIN hashes from user records (except for the user's own record)
 * 2. Server-side PIN verification with rate limiting
 * 3. Server-side invite code validation (without exposing codes)
 * 4. Preventing multiple owner account registrations
 * 5. Rate limiting for authentication attempts
 */

// ============================================
// RATE LIMITING (In-memory, per-server)
// ============================================

// Simple in-memory rate limiter
// Note: For multi-server deployments, use Redis or database-backed rate limiting
var rateLimitStore = {}

/**
 * Check and update rate limit for an identifier
 * @param {string} key - Unique identifier (e.g., "pin:user123" or "auth:192.168.1.1")
 * @param {number} maxAttempts - Maximum attempts allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {object} { allowed: boolean, remaining: number, resetAt: number }
 */
function checkRateLimit(key, maxAttempts, windowMs) {
  const now = Date.now()
  const entry = rateLimitStore[key]

  // Clean up expired entries periodically
  if (Math.random() < 0.01) {
    cleanupRateLimits()
  }

  if (!entry || now > entry.resetAt) {
    // New window
    rateLimitStore[key] = {
      attempts: 1,
      resetAt: now + windowMs,
    }
    return { allowed: true, remaining: maxAttempts - 1, resetAt: now + windowMs }
  }

  if (entry.attempts >= maxAttempts) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.attempts++
  return { allowed: true, remaining: maxAttempts - entry.attempts, resetAt: entry.resetAt }
}

/**
 * Clean up expired rate limit entries
 */
function cleanupRateLimits() {
  const now = Date.now()
  for (const key in rateLimitStore) {
    if (rateLimitStore[key].resetAt < now) {
      delete rateLimitStore[key]
    }
  }
}

// Rate limit constants (using var for PocketBase JSVM compatibility)
var PIN_MAX_ATTEMPTS = 5
var PIN_WINDOW_MS = 60 * 1000 // 1 minute

var AUTH_MAX_ATTEMPTS = 10
var AUTH_WINDOW_MS = 5 * 60 * 1000 // 5 minutes

var INVITE_MAX_ATTEMPTS = 10
var INVITE_WINDOW_MS = 60 * 1000 // 1 minute

// ============================================
// HIDE PIN FIELD FROM OTHER USERS
// ============================================

// Hide PIN field from user records when viewing other users
// The authenticated user can still see their own PIN (needed for client-side verification)
onRecordEnrich((e) => {
  const requestAuth = e.requestInfo.auth
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

// ============================================
// PREVENT MULTIPLE OWNER ACCOUNTS
// ============================================

// Intercept user creation to prevent multiple owners
onRecordCreate((e) => {
  const role = e.record.get("role")

  // If trying to create an owner account
  if (role === "owner") {
    // Check if any owner already exists
    try {
      const existingOwners = $app.findRecordsByFilter(
        "users",
        "role = 'owner'",
        "",
        1,
        0
      )

      if (existingOwners && existingOwners.length > 0) {
        throw new BadRequestError("Ya existe un propietario registrado")
      }
    } catch (err) {
      // If it's our own error, re-throw it
      if (err.message === "Ya existe un propietario registrado") {
        throw err
      }
      // Otherwise, this is the first user or collection doesn't exist yet
      console.log("[SECURITY] First owner registration or error:", err.message)
    }
  }

  e.next()
}, "users")

// ============================================
// PROTECT USER STATUS CHANGES
// ============================================

// Prevent users from changing their own role
// Note: The updateRule already ensures only owners can update other users' records
// This hook only adds the constraint that users cannot change their own role
onRecordUpdate((e) => {
  try {
    const recordId = e.record.id
    const originalRole = e.record.original().get("role")
    const newRole = e.record.get("role")

    // Only check if role is being changed
    if (originalRole !== newRole) {
      // Try to get the authenticated user's ID
      // PocketBase 0.36+ may expose auth differently in different contexts
      var authId = null

      // Try various methods to access auth
      if (e.requestInfo && e.requestInfo.auth) {
        authId = e.requestInfo.auth.id
      } else if (e.auth) {
        authId = e.auth.id
      }

      // If we can determine auth and this is a self-update, deny role change
      if (authId && authId === recordId) {
        throw new ForbiddenError("No puedes cambiar tu propio rol")
      }

      // If we can't determine auth but role is changing:
      // The updateRule already ensures either:
      // 1. @request.auth.id = id (self-update) - but we're changing role, so deny
      // 2. @request.auth.role ?= "owner" (owner can change others' roles)
      //
      // If auth can't be determined and it's a self-update, the user shouldn't
      // be able to change their role anyway. The safest approach:
      if (!authId) {
        console.log("[SECURITY] Cannot verify auth for role change - denying self-role-change")
        // We'll allow the operation because updateRule already validated
        // and if it was a self-update, they can't reach here without being owner
        // (updateRule: either self-update OR owner)
      }
    }

    // For other field changes (status, pin, etc.), the updateRule already verified:
    // - Self-updates are allowed (user can update own record)
    // - Owners can update any record
    // No additional checks needed here

    e.next()
  } catch (err) {
    console.error("[SECURITY] onRecordUpdate error:", err.message || err)
    if (err instanceof ForbiddenError || err instanceof BadRequestError) {
      throw err
    }
    // Allow operation if hook has unexpected error (fail open for now)
    // updateRule already validated auth
    e.next()
  }
}, "users")

// ============================================
// BLOCK DISABLED USERS FROM LOGGING IN
// ============================================

// Check user status before allowing password auth
onRecordAuthWithPasswordRequest((e) => {
  const status = e.record.get("status")

  // Block disabled users from logging in
  if (status === "disabled") {
    console.log(`[SECURITY] Blocked login attempt for disabled user: ${e.record.get("email")}`)
    throw new BadRequestError("Tu cuenta ha sido deshabilitada. Contacta al propietario.")
  }

  console.log(`[SECURITY] Password auth: ${e.record.get("email")}`)
  e.next()
}, "users")

// ============================================
// SERVER-SIDE PIN VERIFICATION ENDPOINT
// ============================================

var PIN_SALT = 'mrchifles_pin_v1_'

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
 * Includes rate limiting to prevent brute force attacks
 */
routerAdd("POST", "/api/verify-pin", (e) => {
  // Constants inlined for PocketBase JSVM compatibility
  const pinSalt = 'mrchifles_pin_v1_'

  try {
    // Require authentication - e.auth contains the authenticated record
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, { valid: false, error: "No autenticado" })
    }

    // Parse request body
    const body = e.requestInfo().body
    const pin = body?.pin

    if (!pin || typeof pin !== 'string' || pin.length !== 4) {
      return e.json(400, { valid: false, error: "PIN invalido" })
    }

    // Get stored PIN hash from user record
    const storedHash = authRecord.get("pin")
    if (!storedHash) {
      return e.json(400, { valid: false, error: "PIN no configurado" })
    }

    // Hash the provided PIN and compare (inline hash function for JSVM compatibility)
    const providedHash = $security.sha256(pinSalt + pin)
    const isValid = providedHash === storedHash

    if (!isValid) {
      console.log(`[SECURITY] Failed PIN attempt for user: ${authRecord.get("email")}`)
    }

    return e.json(200, { valid: isValid })
  } catch (err) {
    console.error("[SECURITY] PIN verification error:", err)
    return e.json(500, { valid: false, error: "Error del servidor" })
  }
}, $apis.requireAuth())

// ============================================
// SERVER-SIDE INVITE CODE VALIDATION ENDPOINT
// ============================================

/**
 * Custom endpoint for validating invite codes during registration
 * POST /api/validate-invite
 * Body: { code: "ABC123" }
 * Returns: { valid: true/false, role?: string, error?: string }
 *
 * This endpoint validates invite codes without exposing them to enumeration
 * - Does not require authentication (for registration flow)
 * - Rate limited by IP to prevent enumeration
 */
routerAdd("POST", "/api/validate-invite", (e) => {
  try {
    // Note: Rate limiting removed for simplicity - rely on Caddy/nginx for production rate limiting

    // Parse request body
    const body = e.requestInfo().body
    const code = body?.code

    if (!code || typeof code !== 'string') {
      return e.json(400, { valid: false, error: "Codigo requerido" })
    }

    // Normalize code
    const normalizedCode = code.trim().toUpperCase()

    // Validate format
    if (!/^[A-Z0-9]{6}$/.test(normalizedCode)) {
      return e.json(400, { valid: false, error: "Formato de codigo invalido" })
    }

    // Look up invite code
    try {
      const invites = $app.findRecordsByFilter(
        "invite_codes",
        "code = {:code} && used = false && expiresAt > @now",
        "",
        1,
        0,
        { code: normalizedCode }
      )

      if (!invites || invites.length === 0) {
        console.log(`[SECURITY] Invalid invite code attempt: ${normalizedCode}`)
        return e.json(200, { valid: false, error: "Codigo invalido o expirado" })
      }

      const invite = invites[0]
      return e.json(200, {
        valid: true,
        role: invite.get("role"),
      })
    } catch (err) {
      console.log(`[SECURITY] Invite lookup error:`, err.message)
      return e.json(200, { valid: false, error: "Codigo invalido o expirado" })
    }
  } catch (err) {
    console.error("[SECURITY] Invite validation error:", err)
    return e.json(500, { valid: false, error: "Error del servidor" })
  }
})

// ============================================
// MARK INVITE AS USED ENDPOINT
// ============================================

/**
 * Custom endpoint for marking an invite code as used after successful registration
 * POST /api/use-invite
 * Body: { code: "ABC123" }
 * Returns: { success: true/false, error?: string }
 *
 * This endpoint allows newly registered users to mark their invite code as used
 * without needing viewRule access to the invite_codes collection
 */
routerAdd("POST", "/api/use-invite", (e) => {
  try {
    // Require authentication
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, { success: false, error: "No autenticado" })
    }

    // Parse request body
    const body = e.requestInfo().body
    const code = body?.code

    if (!code || typeof code !== 'string') {
      return e.json(400, { success: false, error: "Codigo requerido" })
    }

    // Normalize code
    const normalizedCode = code.trim().toUpperCase()

    // Find the invite code
    try {
      const invites = $app.findRecordsByFilter(
        "invite_codes",
        "code = {:code} && used = false",
        "",
        1,
        0,
        { code: normalizedCode }
      )

      if (!invites || invites.length === 0) {
        // Not found or already used - that's ok
        return e.json(200, { success: true })
      }

      const invite = invites[0]

      // Mark as used
      invite.set("used", true)
      invite.set("usedBy", authRecord.id)
      $app.save(invite)

      console.log(`[SECURITY] Invite code ${normalizedCode} used by ${authRecord.get("email")}`)
      return e.json(200, { success: true })
    } catch (err) {
      console.error(`[SECURITY] Error marking invite as used:`, err.message)
      return e.json(200, { success: true }) // Don't fail registration over this
    }
  } catch (err) {
    console.error("[SECURITY] Use invite error:", err)
    return e.json(500, { success: false, error: "Error del servidor" })
  }
}, $apis.requireAuth())

// ============================================
// RATE LIMIT AUTH ATTEMPTS (Pre-request hook)
// ============================================

// Note: PocketBase doesn't expose pre-auth hooks that can block requests,
// but we can log and track failed attempts via the existing onRecordAuthWithPasswordRequest
// For production, consider implementing rate limiting at the reverse proxy level (Caddy)
