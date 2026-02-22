terraform {
  required_version = ">= 1.5"

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

resource "google_storage_bucket" "function_source" {
  name                        = "${var.project_id}-${var.function_name}-source"
  location                    = var.region
  uniform_bucket_level_access = true
  force_destroy               = true

  versioning {
    enabled = true
  }

  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      num_newer_versions = 5
    }
  }
}

resource "google_storage_bucket_object" "function_zip" {
  name   = "${var.function_name}-${var.source_archive_hash}.zip"
  bucket = google_storage_bucket.function_source.name
  source = var.source_archive_path
}

resource "google_cloudfunctions2_function" "function" {
  name        = var.function_name
  location    = var.region
  description = var.function_description

  build_config {
    runtime     = var.runtime
    entry_point = var.entry_point

    source {
      storage_source {
        bucket = google_storage_bucket.function_source.name
        object = google_storage_bucket_object.function_zip.name
      }
    }

    environment_variables = var.build_env_vars
  }

  service_config {
    max_instance_count             = var.max_instances
    min_instance_count             = var.min_instances
    available_memory               = var.memory
    timeout_seconds                = var.timeout_seconds
    environment_variables          = var.environment_variables
    ingress_settings               = var.ingress_settings
    all_traffic_on_latest_revision = true
    service_account_email          = var.service_account_email

    dynamic "secret_environment_variables" {
      for_each = var.secret_env_vars
      content {
        key        = secret_environment_variables.value.key
        project_id = var.project_id
        secret     = secret_environment_variables.value.secret
        version    = lookup(secret_environment_variables.value, "version", "latest")
      }
    }
  }

  dynamic "event_trigger" {
    for_each = var.trigger_type == "event" ? [1] : []
    content {
      trigger_region = var.region
      event_type     = var.event_type
      pubsub_topic   = var.pubsub_topic
      retry_policy   = var.retry_policy
    }
  }

  labels = merge(var.labels, { managed_by = "terraform" })
}

resource "google_cloud_run_service_iam_member" "invoker" {
  count    = var.allow_unauthenticated ? 1 : 0
  location = var.region
  service  = google_cloudfunctions2_function.function.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
