/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Delete otp_codes collection
 *
 * The otp_codes collection is no longer needed since we migrated to Firebase Phone Auth.
 * Firebase handles OTP generation, sending, and verification on the client side.
 */

migrate((app) => {
  // Delete the otp_codes collection
  try {
    const otpCodes = app.findCollectionByNameOrId('otp_codes')
    if (otpCodes) {
      app.delete(otpCodes)
    }
  } catch (e) {
    // Collection doesn't exist, skip
  }
}, (app) => {
  // Revert: recreate otp_codes collection
  const otpCodes = new Collection({
    id: "otpcodes0001",
    name: 'otp_codes',
    type: 'base',
    system: false,
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      {
        id: "otcphone001",
        name: 'phoneNumber',
        type: 'text',
        required: true,
        min: 10,
        max: 16,
      },
      {
        id: "otccode0001",
        name: 'code',
        type: 'text',
        required: true,
        min: 6,
        max: 6,
      },
      {
        id: "otcexpires1",
        name: 'expiresAt',
        type: 'date',
        required: true,
      },
      {
        id: "otcused0001",
        name: 'used',
        type: 'bool',
        required: false,
      },
      {
        id: "otcpurpose1",
        name: 'purpose',
        type: 'select',
        required: true,
        values: ['registration', 'login', 'reset'],
        maxSelect: 1,
      },
      {
        id: "otccreated1",
        name: 'created',
        type: 'autodate',
        onCreate: true,
        onUpdate: false,
      },
    ],
    indexes: [
      "CREATE INDEX idx_otp_phone ON otp_codes (phoneNumber)",
      "CREATE INDEX idx_otp_expires ON otp_codes (expiresAt)",
    ],
  })
  app.save(otpCodes)
})
