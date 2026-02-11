variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region for resources"
  type        = string
  default     = "us-central1"
}

variable "sink_name" {
  description = "Name of the logging sink"
  type        = string
  default     = "project-log-sink"
}

variable "log_filter" {
  description = "Cloud Logging filter for the sink"
  type        = string
  default     = "severity >= WARNING"
}

variable "destination_type" {
  description = "Destination type: storage, bigquery, or pubsub"
  type        = string
  default     = "storage"

  validation {
    condition     = contains(["storage", "bigquery", "pubsub"], var.destination_type)
    error_message = "Destination type must be storage, bigquery, or pubsub."
  }
}

variable "exclusion_filters" {
  description = "Log exclusion filters to exclude certain log entries"
  type = list(object({
    name        = string
    description = string
    filter      = string
  }))
  default = []
}

variable "storage_bucket_name" {
  description = "Name of the GCS bucket for log storage (required if destination_type is storage)"
  type        = string
  default     = "project-logs-bucket"
}

variable "storage_location" {
  description = "Location for the log storage bucket"
  type        = string
  default     = "US"
}

variable "storage_class" {
  description = "Storage class for the log bucket"
  type        = string
  default     = "STANDARD"
}

variable "log_retention_days" {
  description = "Number of days to retain logs in Cloud Storage"
  type        = number
  default     = 365
}

variable "force_destroy" {
  description = "Whether to allow deletion of bucket with objects"
  type        = bool
  default     = false
}

variable "bigquery_dataset_id" {
  description = "BigQuery dataset ID for log storage (required if destination_type is bigquery)"
  type        = string
  default     = "project_logs"
}

variable "bigquery_dataset_name" {
  description = "BigQuery dataset friendly name"
  type        = string
  default     = "Project Logs"
}

variable "bigquery_location" {
  description = "Location for the BigQuery dataset"
  type        = string
  default     = "US"
}

variable "bigquery_table_expiration_days" {
  description = "Default table expiration in days (null for no expiration)"
  type        = number
  default     = null
}

variable "bigquery_partition_expiration_days" {
  description = "Default partition expiration in days (null for no expiration)"
  type        = number
  default     = 90
}

variable "bigquery_use_partitioned_tables" {
  description = "Whether to use partitioned tables in BigQuery"
  type        = bool
  default     = true
}

variable "pubsub_topic_name" {
  description = "Pub/Sub topic name for log streaming (required if destination_type is pubsub)"
  type        = string
  default     = "project-logs-topic"
}

variable "pubsub_message_retention" {
  description = "Message retention duration for the Pub/Sub topic"
  type        = string
  default     = "86400s"
}

variable "labels" {
  description = "Labels to apply to resources"
  type        = map(string)
  default     = {}
}
