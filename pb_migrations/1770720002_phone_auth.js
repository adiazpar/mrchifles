/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Phone number authentication
 *
 * - Adds phoneNumber field to users (E.164 format for WhatsApp)
 * - Adds phoneVerified field to users
 * - Creates otp_codes collection for OTP verification
 * - Updates app_config to track owner phone
 *
 * NOTE: PocketBase auth requires email for authentication. We use a formatted
 * phone number as email (e.g., 51987654321@phone.local) while storing the
 * proper E.164 format (+51987654321) in phoneNumber field for WhatsApp.
 */

const OTP_CODES_ID = "otpcodes0001"

migrate((app) => {
  // ============================================
  // EXTEND USERS COLLECTION WITH PHONE FIELDS
  // ============================================
  const users = app.findCollectionByNameOrId("users")

  // Add phoneNumber field (E.164 format: +51987654321)
  // This is the display/WhatsApp number, separate from auth email
  users.fields.add(new TextField({
    id: "userphone001",
    name: 'phoneNumber',
    required: false, // Optional during migration, will be required for new users
    presentable: true,
    min: 10,
    max: 16,
  }))

  // Add phoneVerified field
  users.fields.add(new BoolField({
    id: "phoneverif1",
    name: 'phoneVerified',
    required: false,
  }))

  // Add unique index on phoneNumber
  users.indexes.push("CREATE UNIQUE INDEX idx_user_phone ON users (phoneNumber) WHERE phoneNumber != ''")

  app.save(users)

  // ============================================
  // OTP_CODES COLLECTION
  // For phone verification via WhatsApp
  // ============================================
  const otpCodes = new Collection({
    id: OTP_CODES_ID,
    name: 'otp_codes',
    type: 'base',
    system: false,
    // Server-side only - no public access
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

  // ============================================
  // UPDATE APP_CONFIG
  // Add ownerPhone field
  // ============================================
  const appConfig = app.findCollectionByNameOrId('app_config')

  appConfig.fields.add(new TextField({
    id: "acownerph01",
    name: 'ownerPhone',
    required: false,
  }))

  app.save(appConfig)

}, (app) => {
  // Revert migration

  // Remove otp_codes collection
  try {
    const otpCodes = app.findCollectionByNameOrId('otp_codes')
    if (otpCodes) {
      app.delete(otpCodes)
    }
  } catch (e) {
    // Collection doesn't exist, skip
  }

  // Remove phone fields from users
  try {
    const users = app.findCollectionByNameOrId("users")
    users.fields.removeByName('phoneNumber')
    users.fields.removeByName('phoneVerified')

    // Remove phone index
    const phoneIndex = users.indexes.findIndex(idx => idx.includes('idx_user_phone'))
    if (phoneIndex !== -1) {
      users.indexes.splice(phoneIndex, 1)
    }

    app.save(users)
  } catch (e) {
    // Fields don't exist, skip
  }

  // Remove ownerPhone from app_config
  try {
    const appConfig = app.findCollectionByNameOrId('app_config')
    appConfig.fields.removeByName('ownerPhone')
    app.save(appConfig)
  } catch (e) {
    // Field doesn't exist, skip
  }
})
