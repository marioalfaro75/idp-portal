terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

resource "google_storage_bucket" "log_bucket" {
  count                       = var.destination_type == "storage" ? 1 : 0
  name                        = var.storage_bucket_name
  location                    = var.storage_location
  storage_class               = var.storage_class
  uniform_bucket_level_access = true
  force_destroy               = var.force_destroy

  lifecycle_rule {
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
    condition {
      age = 30
    }
  }

  lifecycle_rule {
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
    condition {
      age = 90
    }
  }

  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      age = var.log_retention_days
    }
  }

  labels = var.labels
}

resource "google_bigquery_dataset" "log_dataset" {
  count         = var.destination_type == "bigquery" ? 1 : 0
  dataset_id    = var.bigquery_dataset_id
  friendly_name = var.bigquery_dataset_name
  description   = "Dataset for log sink: ${var.sink_name}"
  location      = var.bigquery_location

  default_table_expiration_ms     = var.bigquery_table_expiration_days != null ? var.bigquery_table_expiration_days * 86400000 : null
  default_partition_expiration_ms = var.bigquery_partition_expiration_days != null ? var.bigquery_partition_expiration_days * 86400000 : null

  labels = var.labels
}

resource "google_pubsub_topic" "log_topic" {
  count = var.destination_type == "pubsub" ? 1 : 0
  name  = var.pubsub_topic_name

  message_retention_duration = var.pubsub_message_retention

  labels = var.labels
}

resource "google_logging_project_sink" "sink" {
  name                   = var.sink_name
  destination            = local.sink_destination
  filter                 = var.log_filter
  unique_writer_identity = true

  dynamic "bigquery_options" {
    for_each = var.destination_type == "bigquery" ? [1] : []
    content {
      use_partitioned_tables = var.bigquery_use_partitioned_tables
    }
  }

  dynamic "exclusions" {
    for_each = var.exclusion_filters
    content {
      name        = exclusions.value.name
      description = exclusions.value.description
      filter      = exclusions.value.filter
    }
  }
}

resource "google_project_iam_member" "log_writer_storage" {
  count   = var.destination_type == "storage" ? 1 : 0
  project = var.project_id
  role    = "roles/storage.objectCreator"
  member  = google_logging_project_sink.sink.writer_identity
}

resource "google_project_iam_member" "log_writer_bigquery" {
  count   = var.destination_type == "bigquery" ? 1 : 0
  project = var.project_id
  role    = "roles/bigquery.dataEditor"
  member  = google_logging_project_sink.sink.writer_identity
}

resource "google_project_iam_member" "log_writer_pubsub" {
  count   = var.destination_type == "pubsub" ? 1 : 0
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = google_logging_project_sink.sink.writer_identity
}

locals {
  sink_destination = (
    var.destination_type == "storage" ?
    "storage.googleapis.com/${google_storage_bucket.log_bucket[0].name}" :
    var.destination_type == "bigquery" ?
    "bigquery.googleapis.com/projects/${var.project_id}/datasets/${google_bigquery_dataset.log_dataset[0].dataset_id}" :
    "pubsub.googleapis.com/projects/${var.project_id}/topics/${google_pubsub_topic.log_topic[0].name}"
  )
}
