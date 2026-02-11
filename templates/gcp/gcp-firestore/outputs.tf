output "database_id" {
  description = "The ID of the Firestore database"
  value       = google_firestore_database.database.name
}

output "database_location" {
  description = "The location of the Firestore database"
  value       = google_firestore_database.database.location_id
}

output "database_type" {
  description = "The type of the Firestore database"
  value       = google_firestore_database.database.type
}

output "database_uid" {
  description = "The unique system-generated identifier of the database"
  value       = google_firestore_database.database.uid
}

output "database_etag" {
  description = "The etag of the database for concurrency control"
  value       = google_firestore_database.database.etag
}

output "index_ids" {
  description = "Map of collection names to their composite index IDs"
  value       = { for k, v in google_firestore_index.indexes : k => v.name }
}
