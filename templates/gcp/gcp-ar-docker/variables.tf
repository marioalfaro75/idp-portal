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
  description = "Docker repository ID"
}

variable "description" {
  type        = string
  description = "Repository description"
  default     = "Docker container registry"
}

variable "immutable_tags" {
  type        = bool
  description = "Enable immutable tags"
  default     = false
}

variable "keep_count" {
  type        = number
  description = "Number of recent versions to keep"
  default     = 10
}

variable "environment" {
  type        = string
  description = "Environment name"
  default     = "dev"
}
