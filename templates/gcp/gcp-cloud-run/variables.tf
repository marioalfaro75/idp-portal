variable "project_id" {
  type        = string
  description = "GCP project ID"
}

variable "region" {
  type        = string
  description = "GCP region"
  default     = "us-central1"
}

variable "service_name" {
  type        = string
  description = "Cloud Run service name"
}

variable "container_image" {
  type        = string
  description = "Container image URL"
}

variable "container_port" {
  type        = number
  description = "Container port"
  default     = 8080
}

variable "cpu_limit" {
  type        = string
  description = "CPU limit"
  default     = "1"
}

variable "memory_limit" {
  type        = string
  description = "Memory limit"
  default     = "512Mi"
}

variable "min_instances" {
  type        = number
  description = "Minimum number of instances"
  default     = 0
}

variable "max_instances" {
  type        = number
  description = "Maximum number of instances"
  default     = 10
}

variable "allow_unauthenticated" {
  type        = bool
  description = "Allow unauthenticated access"
  default     = false
}

variable "labels" {
  description = "Labels to apply to all resources"
  type        = map(string)
  default     = {}
}
