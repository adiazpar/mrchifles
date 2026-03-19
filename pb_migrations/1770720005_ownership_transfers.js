/// <reference path="../pb_data/types.d.ts" />

/**
 * Ownership Transfer Schema Migration
 *
 * Creates the ownership_transfers collection for tracking business ownership transfers
 */

migrate((app) => {
  const collection = new Collection({
    id: "owntransfer01",
    name: 'ownership_transfers',
    type: 'base',
    system: false,
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.role = 'owner'",
    updateRule: "@request.auth.id != ''",
    deleteRule: null,
    fields: [
      {
        id: "owtcode00001",
        name: 'code',
        type: 'text',
        required: true,
        min: 8,
        max: 8,
        pattern: '^[A-Z0-9]{8}$',
      },
      {
        id: "owtfromuser1",
        name: 'fromUser',
        type: 'relation',
        required: true,
        collectionId: "_pb_users_auth_",
        cascadeDelete: false,
        maxSelect: 1,
      },
      {
        id: "owttophone01",
        name: 'toPhone',
        type: 'text',
        required: true,
        pattern: '^\\+[1-9]\\d{6,14}$',
      },
      {
        id: "owttouser001",
        name: 'toUser',
        type: 'relation',
        required: false,
        collectionId: "_pb_users_auth_",
        cascadeDelete: false,
        maxSelect: 1,
      },
      {
        id: "owtstatus001",
        name: 'status',
        type: 'select',
        required: true,
        values: ['pending', 'accepted', 'completed', 'expired', 'cancelled'],
        maxSelect: 1,
      },
      {
        id: "owtexpires01",
        name: 'expiresAt',
        type: 'date',
        required: true,
      },
      {
        id: "owtaccepted1",
        name: 'acceptedAt',
        type: 'date',
        required: false,
      },
      {
        id: "owtcomplete1",
        name: 'completedAt',
        type: 'date',
        required: false,
      },
      {
        id: "owtcreated01",
        name: 'created',
        type: 'autodate',
        onCreate: true,
        onUpdate: false,
      },
      {
        id: "owtupdated01",
        name: 'updated',
        type: 'autodate',
        onCreate: true,
        onUpdate: true,
      }
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_transfer_code ON ownership_transfers (code)",
    ],
  })

  app.save(collection)

}, (app) => {
  // Revert migration
  try {
    const collection = app.findCollectionByNameOrId("ownership_transfers")
    if (collection) {
      app.delete(collection)
    }
  } catch (e) {
    // Collection doesn't exist, skip
  }
})
