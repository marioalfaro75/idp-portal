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

resource "google_firestore_database" "database" {
  project     = var.project_id
  name        = var.database_id
  location_id = var.location_id
  type        = var.database_type

  concurrency_mode            = var.concurrency_mode
  app_engine_integration_mode = "DISABLED"

  point_in_time_recovery_enablement = var.enable_pitr ? "POINT_IN_TIME_RECOVERY_ENABLED" : "POINT_IN_TIME_RECOVERY_DISABLED"
  delete_protection_state           = var.deletion_protection ? "DELETE_PROTECTION_ENABLED" : "DELETE_PROTECTION_DISABLED"

  labels = merge(var.labels, {
    managed_by = "terraform"
  })
}

resource "google_firestore_index" "indexes" {
  for_each   = { for idx in var.composite_indexes : idx.collection => idx }
  project    = var.project_id
  database   = google_firestore_database.database.name
  collection = each.value.collection

  dynamic "fields" {
    for_each = each.value.fields
    content {
      field_path = fields.value.field_path
      order      = lookup(fields.value, "order", null)
      array_config = lookup(fields.value, "array_config", null)
    }
  }
}

resource "google_firestore_backup_schedule" "daily" {
  count    = var.enable_daily_backup ? 1 : 0
  project  = var.project_id
  database = google_firestore_database.database.name

  retention = var.daily_backup_retention

  daily_recurrence {}
}

resource "google_firestore_backup_schedule" "weekly" {
  count    = var.enable_weekly_backup ? 1 : 0
  project  = var.project_id
  database = google_firestore_database.database.name

  retention = var.weekly_backup_retention

  weekly_recurrence {
    day = var.weekly_backup_day
  }
}

resource "google_project_service" "firestore" {
  project = var.project_id
  service = "firestore.googleapis.com"

  disable_dependent_services = false
  disable_on_destroy         = false
}
