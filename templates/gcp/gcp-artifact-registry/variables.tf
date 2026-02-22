variable "project_id" {
  type        = string
  description = "GCP project ID"
}

variable "region" {
  type        = string
  description = "GCP region"
  default     = "us-central1"
}

variable "repository_id" {
  type        = string
  description = "Repository ID"
}

variable "description" {
  type        = string
  description = "Repository description"
  default     = "Artifact Registry repository"
}

variable "format" {
  type        = string
  description = "Repository format (DOCKER, NPM, MAVEN, PYTHON, etc.)"
  default     = "DOCKER"
}

variable "environment" {
  type        = string
  description = "Environment name"
  default     = "dev"
}

variable "labels" {
  description = "Labels to apply to all resources"
  type        = map(string)
  default     = {}
}
