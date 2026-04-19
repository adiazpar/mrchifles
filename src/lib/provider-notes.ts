/**
 * Per-provider cap on notes. Enforced server-side in the create route and
 * reflected client-side by disabling the "Add note" button when reached.
 *
 * Changing this value in isolation is safe — both sides read from here — but
 * the count is also surfaced in UI copy ("X/5"), so check the translations
 * in the `providers` namespace if the cap changes meaningfully.
 */
export const MAX_PROVIDER_NOTES = 5

export const NOTE_TITLE_MAX = 80
export const NOTE_BODY_MAX = 2000
