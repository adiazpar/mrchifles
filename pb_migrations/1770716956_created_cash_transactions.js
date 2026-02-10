/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "ne662886rugvvyw",
    "created": "2026-02-10 09:49:16.943Z",
    "updated": "2026-02-10 09:49:16.943Z",
    "name": "cash_transactions",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "kb6llhga",
        "name": "cashDrawer",
        "type": "relation",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "collectionId": "bu7o5ngdbrj1gnv",
          "cascadeDelete": false,
          "minSelect": null,
          "maxSelect": 1,
          "displayFields": null
        }
      },
      {
        "system": false,
        "id": "p14wg6oi",
        "name": "type",
        "type": "select",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "maxSelect": 1,
          "values": [
            "cash_in",
            "cash_out",
            "Required"
          ]
        }
      },
      {
        "system": false,
        "id": "lrgopd0w",
        "name": "amount",
        "type": "number",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": 0,
          "max": null,
          "noDecimal": false
        }
      },
      {
        "system": false,
        "id": "z5zz6u0o",
        "name": "description",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      }
    ],
    "indexes": [],
    "listRule": null,
    "viewRule": null,
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "options": {}
  });

  return Dao(db).saveCollection(collection);
}, (db) => {
  const dao = new Dao(db);
  const collection = dao.findCollectionByNameOrId("ne662886rugvvyw");

  return dao.deleteCollection(collection);
})
