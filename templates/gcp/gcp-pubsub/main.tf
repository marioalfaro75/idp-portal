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

resource "google_project_service" "pubsub" {
  service            = "pubsub.googleapis.com"
  disable_on_destroy = false
}

resource "google_pubsub_topic" "this" {
  name = var.topic_name

  message_retention_duration = var.message_retention_duration

  labels = {
    environment = var.environment
  }

  depends_on = [google_project_service.pubsub]
}

resource "google_pubsub_topic" "dlq" {
  name = "${var.topic_name}-dlq"

  depends_on = [google_project_service.pubsub]
}

resource "google_pubsub_subscription" "this" {
  name  = "${var.topic_name}-sub"
  topic = google_pubsub_topic.this.id

  ack_deadline_seconds       = var.ack_deadline_seconds
  message_retention_duration = "604800s"

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.dlq.id
    max_delivery_attempts = var.max_delivery_attempts
  }

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }

  labels = {
    environment = var.environment
  }
}
