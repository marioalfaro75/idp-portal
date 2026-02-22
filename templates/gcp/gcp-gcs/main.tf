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

resource "google_storage_bucket" "bucket" {
  name                        = var.bucket_name
  location                    = var.location
  storage_class               = var.storage_class
  uniform_bucket_level_access = var.uniform_bucket_level_access
  force_destroy               = var.force_destroy
  public_access_prevention    = var.public_access_prevention

  versioning {
    enabled = var.enable_versioning
  }

  dynamic "lifecycle_rule" {
    for_each = var.lifecycle_rules
    content {
      action {
        type          = lifecycle_rule.value.action_type
        storage_class = lookup(lifecycle_rule.value, "storage_class", null)
      }
      condition {
        age                   = lookup(lifecycle_rule.value, "age", null)
        num_newer_versions    = lookup(lifecycle_rule.value, "num_newer_versions", null)
        with_state            = lookup(lifecycle_rule.value, "with_state", null)
        matches_storage_class = lookup(lifecycle_rule.value, "matches_storage_class", null)
      }
    }
  }

  dynamic "cors" {
    for_each = var.cors_config != null ? [var.cors_config] : []
    content {
      origin          = cors.value.origins
      method          = cors.value.methods
      response_header = cors.value.response_headers
      max_age_seconds = cors.value.max_age_seconds
    }
  }

  dynamic "encryption" {
    for_each = var.kms_key_name != null ? [1] : []
    content {
      default_kms_key_name = var.kms_key_name
    }
  }

  dynamic "logging" {
    for_each = var.log_bucket != null ? [1] : []
    content {
      log_bucket        = var.log_bucket
      log_object_prefix = var.log_object_prefix
    }
  }

  dynamic "retention_policy" {
    for_each = var.retention_period_seconds != null ? [1] : []
    content {
      retention_period = var.retention_period_seconds
      is_locked        = var.retention_policy_locked
    }
  }

  labels = merge(var.labels, { managed_by = "terraform" })
}

resource "google_storage_bucket_iam_member" "members" {
  for_each = { for m in var.iam_members : "${m.role}-${m.member}" => m }

  bucket = google_storage_bucket.bucket.name
  role   = each.value.role
  member = each.value.member
}

resource "google_storage_notification" "notification" {
  count              = var.notification_topic != null ? 1 : 0
  bucket             = google_storage_bucket.bucket.name
  payload_format     = "JSON_API_V1"
  topic              = var.notification_topic
  event_types        = var.notification_event_types
  object_name_prefix = var.notification_object_prefix
}
