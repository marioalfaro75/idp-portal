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

resource "google_project_service" "cloudbuild" {
  service            = "cloudbuild.googleapis.com"
  disable_on_destroy = false
}

resource "google_cloudbuild_trigger" "this" {
  name        = var.trigger_name
  description = var.description

  github {
    owner = var.github_owner
    name  = var.github_repo
    push {
      branch = var.branch_pattern
    }
  }

  filename = var.cloudbuild_yaml

  depends_on = [google_project_service.cloudbuild]
}
