terraform {
  required_providers {
    google = {
      source = "hashicorp/google"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

resource "google_project_service" "eventarc" {
  service            = "eventarc.googleapis.com"
  disable_on_destroy = false
}

resource "google_service_account" "eventarc" {
  account_id   = "${var.trigger_name}-sa"
  display_name = "Eventarc trigger service account"
}

resource "google_project_iam_member" "invoker" {
  project = var.project_id
  role    = "roles/run.invoker"
  member  = "serviceAccount:${google_service_account.eventarc.email}"
}

resource "google_eventarc_trigger" "this" {
  name     = var.trigger_name
  location = var.region

  matching_criteria {
    attribute = "type"
    value     = var.event_type
  }

  destination {
    cloud_run_service {
      service = var.cloud_run_service
      region  = var.region
    }
  }

  service_account = google_service_account.eventarc.email

  labels = {
    environment = var.environment
  }

  depends_on = [google_project_service.eventarc, google_project_iam_member.invoker]
}
