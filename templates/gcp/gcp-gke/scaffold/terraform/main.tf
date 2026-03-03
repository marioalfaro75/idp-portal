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

resource "google_artifact_registry_repository" "main" {
  location      = var.region
  repository_id = "{{service_name}}"
  format        = "DOCKER"

  labels = {
    service = "{{service_name}}"
  }
}
