/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Add productName to sale_items for historical data preservation
 *
 * This allows products to be deleted while preserving sales history.
 * The productName is captured at time of sale as an immutable snapshot.
 */

migrate((app) => {
  const collection = app.findCollectionByNameOrId('sale_items')

  // Add productName field to store name at time of sale (after product field)
  collection.fields.addAt(2, new Field({
    "id": "siproductname",
    "name": "productName",
    "type": "text",
    "required": false,
    "system": false,
    "hidden": false,
    "presentable": false
  }))

  // Make product relation optional (can be null if product was deleted)
  const productField = collection.fields.find(f => f.name === 'product')
  if (productField) {
    productField.required = false
  }

  return app.save(collection)

}, (app) => {
  const collection = app.findCollectionByNameOrId('sale_items')

  // Remove productName field
  collection.fields.removeById("siproductname")

  // Make product relation required again
  const productField = collection.fields.find(f => f.name === 'product')
  if (productField) {
    productField.required = true
  }

  return app.save(collection)
})
