/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Authentication system (PocketBase 0.36+)
 *
 * - Extends users collection with PIN, role, status fields
 * - Creates invite_codes collection for team invitations
 * - Creates app_config collection for app setup state
 */

const INVITE_CODES_ID = "invitecodes01"
const APP_CONFIG_ID = "appconfig0001"

migrate((app) => {
  // ============================================
  // EXTEND USERS COLLECTION
  // ============================================
  const users = app.findCollectionByNameOrId("users")

  // Add PIN field (stored as hash, ~64 chars for SHA-256)
  users.fields.add(new TextField({
    id: "userpin00001",
    name: 'pin',
    required: false,
    presentable: false,
  }))

  // Add role field
  users.fields.add(new SelectField({
    id: "userrole0001",
    name: 'role',
    required: true,
    values: ['owner', 'partner', 'employee'],
    maxSelect: 1,
  }))

  // Add status field
  users.fields.add(new SelectField({
    id: "userstatus01",
    name: 'status',
    required: true,
    values: ['active', 'pending', 'disabled'],
    maxSelect: 1,
  }))

  // Add invitedBy relation
  users.fields.add(new RelationField({
    id: "userinvited1",
    name: 'invitedBy',
    required: false,
    collectionId: "_pb_users_auth_",
    cascadeDelete: false,
    maxSelect: 1,
  }))

  // Restrict user access to prevent data exposure
  // - Users can only view their own record
  // - Owners can view all users (needed for team management)
  // - This prevents employees from seeing other users' PIN hashes
  // Note: Use ?= for safe comparison that returns false instead of error when field is null
  users.listRule = '@request.auth.id = id || @request.auth.role ?= "owner"'
  users.viewRule = '@request.auth.id = id || @request.auth.role ?= "owner"'

  // Restrict user updates:
  // - Users can only update their own record
  // - Owners can update any user (needed for status changes)
  // - Server-side hook enforces that only owners can change role/status of others
  users.updateRule = '@request.auth.id = id || @request.auth.role ?= "owner"'

  // User creation is handled by PocketBase auth - server-side hook enforces owner uniqueness

  app.save(users)

  // ============================================
  // INVITE_CODES COLLECTION
  // ============================================
  const inviteCodes = new Collection({
    id: INVITE_CODES_ID,
    name: 'invite_codes',
    type: 'base',
    system: false,
    // Access rules:
    // - listRule: Only owners can list all invite codes
    // - viewRule: Only owners can view individual codes (validation done via server-side endpoint)
    // - create/delete: Only owners can manage invite codes
    // - update: Authenticated users can mark as used (after registration creates their account)
    // Note: Invite validation during registration uses server-side /api/validate-invite endpoint
    // Note: Rules must check auth.id first to ensure user is authenticated before checking custom fields
    listRule: '@request.auth.role ?= "owner"',
    viewRule: '@request.auth.role ?= "owner"',
    createRule: '@request.auth.role ?= "owner"',
    updateRule: '@request.auth.id != ""',  // Allow authenticated users to mark as used
    deleteRule: '@request.auth.role ?= "owner"',
    fields: [
      {
        id: "iccode000001",
        name: 'code',
        type: 'text',
        required: true,
        presentable: true,
        min: 6,
        max: 6,
        pattern: "^[A-Z0-9]{6}$",
      },
      {
        id: "icrole000001",
        name: 'role',
        type: 'select',
        required: true,
        values: ['partner', 'employee'],
        maxSelect: 1,
      },
      {
        id: "iccreatedby1",
        name: 'createdBy',
        type: 'relation',
        required: true,
        collectionId: "_pb_users_auth_",
        cascadeDelete: false,
        maxSelect: 1,
      },
      {
        id: "icusedby0001",
        name: 'usedBy',
        type: 'relation',
        required: false,
        collectionId: "_pb_users_auth_",
        cascadeDelete: false,
        maxSelect: 1,
      },
      {
        id: "icexpires001",
        name: 'expiresAt',
        type: 'date',
        required: true,
      },
      {
        id: "icused000001",
        name: 'used',
        type: 'bool',
        required: false,
      },
      {
        id: "iccreated001",
        name: 'created',
        type: 'autodate',
        onCreate: true,
        onUpdate: false,
      },
      {
        id: "icupdated001",
        name: 'updated',
        type: 'autodate',
        onCreate: true,
        onUpdate: true,
      }
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_invite_code ON invite_codes (code)"
    ],
  })
  app.save(inviteCodes)

  // ============================================
  // APP_CONFIG COLLECTION
  // Tracks app setup state (e.g., whether owner exists)
  // ============================================
  const appConfig = new Collection({
    id: APP_CONFIG_ID,
    name: 'app_config',
    type: 'base',
    system: false,
    // Public read access - anyone can check if setup is complete
    listRule: "",
    viewRule: "",
    // Only authenticated owners can modify
    createRule: '@request.auth.role ?= "owner"',
    updateRule: '@request.auth.role ?= "owner"',
    deleteRule: null, // No one can delete
    fields: [
      {
        id: "acsetup00001",
        name: 'setupComplete',
        type: 'bool',
        required: false,
      },
      {
        id: "acowner00001",
        name: 'ownerEmail',
        type: 'text',
        required: false,
      }
    ],
    indexes: [],
  })
  app.save(appConfig)

  // Create initial config record with setupComplete = false
  const configRecord = new Record(appConfig)
  configRecord.set('setupComplete', false)
  configRecord.set('ownerEmail', '')
  app.save(configRecord)

}, (app) => {
  // Revert migration

  // Remove app_config collection
  try {
    const appConfig = app.findCollectionByNameOrId('app_config')
    if (appConfig) {
      app.delete(appConfig)
    }
  } catch (e) {
    // Collection doesn't exist, skip
  }

  // Remove invite_codes collection
  try {
    const inviteCodes = app.findCollectionByNameOrId('invite_codes')
    if (inviteCodes) {
      app.delete(inviteCodes)
    }
  } catch (e) {
    // Collection doesn't exist, skip
  }

  // Remove added fields from users collection
  try {
    const users = app.findCollectionByNameOrId("users")
    const fieldsToRemove = ['pin', 'role', 'status', 'invitedBy']

    for (const fieldName of fieldsToRemove) {
      users.fields.removeByName(fieldName)
    }
    app.save(users)
  } catch (e) {
    // Fields don't exist, skip
  }
})
