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

resource "google_api_gateway_api" "api" {
  provider = google
  api_id   = var.api_id
  project  = var.project_id

  labels = merge(var.labels, { managed_by = "terraform" })
}

resource "google_api_gateway_api_config" "config" {
  provider      = google
  api           = google_api_gateway_api.api.api_id
  api_config_id = "${var.api_id}-config-${var.config_version}"
  project       = var.project_id

  openapi_documents {
    document {
      path     = "openapi.yaml"
      contents = base64encode(var.openapi_spec)
    }
  }

  gateway_config {
    backend_config {
      google_service_account = var.backend_service_account
    }
  }

  labels = merge(var.labels, { managed_by = "terraform" })

  lifecycle {
    create_before_destroy = true
  }
}

resource "google_api_gateway_gateway" "gateway" {
  provider   = google
  api_config = google_api_gateway_api_config.config.id
  gateway_id = "${var.api_id}-gateway"
  region     = var.region
  project    = var.project_id

  labels = merge(var.labels, { managed_by = "terraform" })
}

resource "google_project_service" "apigateway" {
  project = var.project_id
  service = "apigateway.googleapis.com"

  disable_dependent_services = false
  disable_on_destroy         = false
}

resource "google_project_service" "servicemanagement" {
  project = var.project_id
  service = "servicemanagement.googleapis.com"

  disable_dependent_services = false
  disable_on_destroy         = false
}

resource "google_project_service" "servicecontrol" {
  project = var.project_id
  service = "servicecontrol.googleapis.com"

  disable_dependent_services = false
  disable_on_destroy         = false
}
