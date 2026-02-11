variable "project_id" {
  type        = string
  description = "GCP project ID"
}

variable "region" {
  type        = string
  description = "GCP region"
  default     = "us-central1"
}

variable "trigger_name" {
  type        = string
  description = "Cloud Build trigger name"
}

variable "description" {
  type        = string
  description = "Trigger description"
  default     = "Cloud Build trigger"
}

variable "github_owner" {
  type        = string
  description = "GitHub repository owner"
}

variable "github_repo" {
  type        = string
  description = "GitHub repository name"
}

variable "branch_pattern" {
  type        = string
  description = "Branch pattern to trigger builds"
  default     = "^main$"
}

variable "cloudbuild_yaml" {
  type        = string
  description = "Path to cloudbuild.yaml"
  default     = "cloudbuild.yaml"
}
