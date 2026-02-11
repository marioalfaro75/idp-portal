output "sink_name" {
  description = "The name of the logging sink"
  value       = google_logging_project_sink.sink.name
}

output "sink_destination" {
  description = "The destination of the logging sink"
  value       = google_logging_project_sink.sink.destination
}

output "writer_identity" {
  description = "The service account identity used to write logs"
  value       = google_logging_project_sink.sink.writer_identity
}

output "storage_bucket_name" {
  description = "The name of the log storage bucket (if using storage destination)"
  value       = var.destination_type == "storage" ? google_storage_bucket.log_bucket[0].name : null
}

output "bigquery_dataset_id" {
  description = "The BigQuery dataset ID (if using BigQuery destination)"
  value       = var.destination_type == "bigquery" ? google_bigquery_dataset.log_dataset[0].dataset_id : null
}

output "pubsub_topic_name" {
  description = "The Pub/Sub topic name (if using Pub/Sub destination)"
  value       = var.destination_type == "pubsub" ? google_pubsub_topic.log_topic[0].name : null
}
