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
  description = "Eventarc trigger name"
}

variable "event_type" {
  type        = string
  description = "Event type to match"
  default     = "google.cloud.audit.log.v1.written"
}

variable "cloud_run_service" {
  type        = string
  description = "Target Cloud Run service name"
}

variable "environment" {
  type        = string
  description = "Environment name"
  default     = "dev"
}
