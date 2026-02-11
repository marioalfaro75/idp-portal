output "bucket_name" {
  description = "The name of the GCS bucket"
  value       = google_storage_bucket.bucket.name
}

output "bucket_url" {
  description = "The gs:// URL of the bucket"
  value       = google_storage_bucket.bucket.url
}

output "bucket_self_link" {
  description = "The self link of the bucket"
  value       = google_storage_bucket.bucket.self_link
}

output "bucket_location" {
  description = "The location of the bucket"
  value       = google_storage_bucket.bucket.location
}

output "bucket_storage_class" {
  description = "The storage class of the bucket"
  value       = google_storage_bucket.bucket.storage_class
}

output "bucket_uniform_access" {
  description = "Whether uniform bucket-level access is enabled"
  value       = google_storage_bucket.bucket.uniform_bucket_level_access
}

output "bucket_versioning" {
  description = "Whether object versioning is enabled"
  value       = google_storage_bucket.bucket.versioning[0].enabled
}
