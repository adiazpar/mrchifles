/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Authentication system
 *
 * - Extends users collection with PIN, role, status fields
 * - Creates invite_codes collection for team invitations
 * - Creates app_config collection for app setup state
 */

const INVITE_CODES_ID = "invitecodes01"
const APP_CONFIG_ID = "appconfig0001"

migrate((db) => {
  const dao = new Dao(db)

  // ============================================
  // EXTEND USERS COLLECTION
  // ============================================
  const users = dao.findCollectionByNameOrId("_pb_users_auth_")

  // Clone the existing schema and add new fields
  const existingSchema = users.schema

  // Add PIN field (stored as hash, ~64 chars for SHA-256)
  existingSchema.addField(new SchemaField({
    system: false,
    id: "userpin00001",
    name: 'pin',
    type: 'text',
    required: false,
    presentable: false,
    unique: false,
    options: { min: null, max: null, pattern: "" }
  }))

  // Add role field
  existingSchema.addField(new SchemaField({
    system: false,
    id: "userrole0001",
    name: 'role',
    type: 'select',
    required: true,
    presentable: false,
    unique: false,
    options: { maxSelect: 1, values: ['owner', 'partner', 'employee'] }
  }))

  // Add status field
  existingSchema.addField(new SchemaField({
    system: false,
    id: "userstatus01",
    name: 'status',
    type: 'select',
    required: true,
    presentable: false,
    unique: false,
    options: { maxSelect: 1, values: ['active', 'pending', 'disabled'] }
  }))

  // Add invitedBy relation
  existingSchema.addField(new SchemaField({
    system: false,
    id: "userinvited1",
    name: 'invitedBy',
    type: 'relation',
    required: false,
    presentable: false,
    unique: false,
    options: {
      collectionId: "_pb_users_auth_",
      cascadeDelete: false,
      minSelect: null,
      maxSelect: 1,
      displayFields: ["name"]
    }
  }))

  // Restrict user listing/viewing to authenticated users only
  // Password auth doesn't require querying users - PocketBase handles it
  // PIN auth uses pb.authStore.model (already authenticated)
  users.listRule = "@request.auth.id != ''"
  users.viewRule = "@request.auth.id != ''"

  dao.saveCollection(users)

  // ============================================
  // INVITE_CODES COLLECTION
  // ============================================
  const inviteCodes = new Collection({
    id: INVITE_CODES_ID,
    name: 'invite_codes',
    type: 'base',
    system: false,
    schema: [
      {
        system: false,
        id: "iccode000001",
        name: 'code',
        type: 'text',
        required: true,
        presentable: true,
        unique: true,
        options: { min: 6, max: 6, pattern: "^[A-Z0-9]{6}$" }
      },
      {
        system: false,
        id: "icrole000001",
        name: 'role',
        type: 'select',
        required: true,
        presentable: false,
        unique: false,
        options: { maxSelect: 1, values: ['partner', 'employee'] }
      },
      {
        system: false,
        id: "iccreatedby1",
        name: 'createdBy',
        type: 'relation',
        required: true,
        presentable: false,
        unique: false,
        options: {
          collectionId: "_pb_users_auth_",
          cascadeDelete: false,
          minSelect: null,
          maxSelect: 1,
          displayFields: ["name"]
        }
      },
      {
        system: false,
        id: "icusedby0001",
        name: 'usedBy',
        type: 'relation',
        required: false,
        presentable: false,
        unique: false,
        options: {
          collectionId: "_pb_users_auth_",
          cascadeDelete: false,
          minSelect: null,
          maxSelect: 1,
          displayFields: ["name"]
        }
      },
      {
        system: false,
        id: "icexpires001",
        name: 'expiresAt',
        type: 'date',
        required: true,
        presentable: false,
        unique: false,
        options: { min: "", max: "" }
      },
      {
        system: false,
        id: "icused000001",
        name: 'used',
        type: 'bool',
        required: false,
        presentable: false,
        unique: false,
        options: {}
      }
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_invite_code ON invite_codes (code)"
    ],
    listRule: "@request.auth.role = 'owner'",
    viewRule: "",
    createRule: "@request.auth.role = 'owner'",
    updateRule: "@request.auth.role = 'owner'",
    deleteRule: "@request.auth.role = 'owner'",
    options: {}
  })
  dao.saveCollection(inviteCodes)

  // ============================================
  // APP_CONFIG COLLECTION
  // Tracks app setup state (e.g., whether owner exists)
  // ============================================
  const appConfig = new Collection({
    id: APP_CONFIG_ID,
    name: 'app_config',
    type: 'base',
    system: false,
    schema: [
      {
        system: false,
        id: "acsetup00001",
        name: 'setupComplete',
        type: 'bool',
        required: false,
        presentable: false,
        unique: false,
        options: {}
      },
      {
        system: false,
        id: "acowner00001",
        name: 'ownerEmail',
        type: 'text',
        required: false,
        presentable: false,
        unique: false,
        options: { min: null, max: null, pattern: "" }
      }
    ],
    indexes: [],
    // Public read access - anyone can check if setup is complete
    listRule: "",
    viewRule: "",
    // Only authenticated owners can modify
    createRule: "@request.auth.role = 'owner'",
    updateRule: "@request.auth.role = 'owner'",
    deleteRule: null, // No one can delete
    options: {}
  })
  dao.saveCollection(appConfig)

  // Create initial config record with setupComplete = false
  const configRecord = new Record(appConfig)
  configRecord.set('setupComplete', false)
  configRecord.set('ownerEmail', '')
  dao.saveRecord(configRecord)

}, (db) => {
  // Revert migration
  const dao = new Dao(db)

  // Remove app_config collection
  try {
    const appConfig = dao.findCollectionByNameOrId('app_config')
    if (appConfig) {
      dao.deleteCollection(appConfig)
    }
  } catch (e) {
    // Collection doesn't exist, skip
  }

  // Remove invite_codes collection
  try {
    const inviteCodes = dao.findCollectionByNameOrId('invite_codes')
    if (inviteCodes) {
      dao.deleteCollection(inviteCodes)
    }
  } catch (e) {
    // Collection doesn't exist, skip
  }

  // Remove added fields from users collection
  const users = dao.findCollectionByNameOrId("_pb_users_auth_")
  const fieldsToRemove = ['pin', 'role', 'status', 'invitedBy']

  for (const fieldName of fieldsToRemove) {
    const field = users.schema.getFieldByName(fieldName)
    if (field) {
      users.schema.removeField(field.id)
    }
  }
  dao.saveCollection(users)
})
