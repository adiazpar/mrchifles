/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Ownership Transfers System
 *
 * Creates ownership_transfers collection for transferring business ownership
 * - Owner can initiate transfer to another phone number
 * - Recipient accepts via WhatsApp link
 * - Owner confirms with PIN to finalize
 * - Old owner becomes partner, recipient becomes owner
 */

const OWNERSHIP_TRANSFERS_ID = "owntransfer01"

migrate((app) => {
  // ============================================
  // OWNERSHIP_TRANSFERS COLLECTION
  // ============================================
  const ownershipTransfers = new Collection({
    id: OWNERSHIP_TRANSFERS_ID,
    name: 'ownership_transfers',
    type: 'base',
    system: false,
    // Access rules:
    // - Only owners can create/view their transfers
    // - Public read for code validation (done via server endpoint)
    // - Updates handled via server-side endpoints
    listRule: '@request.auth.role ?= "owner"',
    viewRule: '@request.auth.role ?= "owner"',
    createRule: '@request.auth.role ?= "owner"',
    updateRule: null, // Only via server-side endpoints
    deleteRule: '@request.auth.role ?= "owner"',
    fields: [
      {
        id: "otcode000001",
        name: 'code',
        type: 'text',
        required: true,
        presentable: true,
        min: 8,
        max: 8,
        pattern: "^[A-Z0-9]{8}$",
      },
      {
        id: "otfromuser01",
        name: 'fromUser',
        type: 'relation',
        required: true,
        collectionId: "_pb_users_auth_",
        cascadeDelete: false,
        maxSelect: 1,
      },
      {
        id: "ottophone001",
        name: 'toPhone',
        type: 'text',
        required: true,
        min: 10,
        max: 20,
      },
      {
        id: "ottouser001",
        name: 'toUser',
        type: 'relation',
        required: false,
        collectionId: "_pb_users_auth_",
        cascadeDelete: false,
        maxSelect: 1,
      },
      {
        id: "otstatus0001",
        name: 'status',
        type: 'select',
        required: true,
        values: ['pending', 'accepted', 'completed', 'expired', 'cancelled'],
        maxSelect: 1,
      },
      {
        id: "otexpiresat1",
        name: 'expiresAt',
        type: 'date',
        required: true,
      },
      {
        id: "otacceptedat",
        name: 'acceptedAt',
        type: 'date',
        required: false,
      },
      {
        id: "otcompleteat",
        name: 'completedAt',
        type: 'date',
        required: false,
      },
      {
        id: "otcreated001",
        name: 'created',
        type: 'autodate',
        onCreate: true,
        onUpdate: false,
      },
      {
        id: "otupdated001",
        name: 'updated',
        type: 'autodate',
        onCreate: true,
        onUpdate: true,
      }
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_transfer_code ON ownership_transfers (code)",
      "CREATE INDEX idx_transfer_status ON ownership_transfers (status)",
      "CREATE INDEX idx_transfer_from ON ownership_transfers (fromUser)"
    ],
  })
  app.save(ownershipTransfers)

}, (app) => {
  // Revert migration
  try {
    const ownershipTransfers = app.findCollectionByNameOrId('ownership_transfers')
    if (ownershipTransfers) {
      app.delete(ownershipTransfers)
    }
  } catch (e) {
    // Collection doesn't exist, skip
  }
})
