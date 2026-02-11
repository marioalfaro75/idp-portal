output "function_name" {
  description = "The name of the Cloud Function"
  value       = google_cloudfunctions2_function.function.name
}

output "function_uri" {
  description = "The URI of the Cloud Function"
  value       = google_cloudfunctions2_function.function.service_config[0].uri
}

output "function_url" {
  description = "The URL of the Cloud Function (for HTTP triggers)"
  value       = google_cloudfunctions2_function.function.url
}

output "function_state" {
  description = "The state of the Cloud Function"
  value       = google_cloudfunctions2_function.function.state
}

output "source_bucket" {
  description = "The GCS bucket storing function source code"
  value       = google_storage_bucket.function_source.name
}

output "function_service_config" {
  description = "The service configuration of the function"
  value = {
    service                = google_cloudfunctions2_function.function.service_config[0].service
    available_memory       = google_cloudfunctions2_function.function.service_config[0].available_memory
    max_instance_count     = google_cloudfunctions2_function.function.service_config[0].max_instance_count
    timeout_seconds        = google_cloudfunctions2_function.function.service_config[0].timeout_seconds
  }
}
