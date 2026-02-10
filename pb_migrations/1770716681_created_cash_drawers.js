/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  const collection = new Collection({
    "id": "bu7o5ngdbrj1gnv",
    "created": "2026-02-10 09:44:41.122Z",
    "updated": "2026-02-10 09:44:41.122Z",
    "name": "cash_drawers",
    "type": "base",
    "system": false,
    "schema": [
      {
        "system": false,
        "id": "gkal6hus",
        "name": "date",
        "type": "date",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": "",
          "max": ""
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
  const collection = dao.findCollectionByNameOrId("bu7o5ngdbrj1gnv");

  return dao.deleteCollection(collection);
})
