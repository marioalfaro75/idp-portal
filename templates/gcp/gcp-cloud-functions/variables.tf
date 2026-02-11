variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region for resources"
  type        = string
  default     = "us-central1"
}

variable "function_name" {
  description = "Name of the Cloud Function"
  type        = string
  default     = "my-function"
}

variable "function_description" {
  description = "Description of the Cloud Function"
  type        = string
  default     = "Managed Cloud Function"
}

variable "runtime" {
  description = "Runtime for the Cloud Function (e.g., python312, nodejs20, go122)"
  type        = string
  default     = "python312"
}

variable "entry_point" {
  description = "Entry point function name"
  type        = string
  default     = "main"
}

variable "source_archive_path" {
  description = "Local path to the function source archive (.zip)"
  type        = string
}

variable "source_archive_hash" {
  description = "Hash of the source archive for versioning"
  type        = string
  default     = "latest"
}

variable "memory" {
  description = "Memory allocated to the function (e.g., 256M, 512M, 1Gi)"
  type        = string
  default     = "256M"
}

variable "timeout_seconds" {
  description = "Function execution timeout in seconds"
  type        = number
  default     = 60
}

variable "max_instances" {
  description = "Maximum number of concurrent function instances"
  type        = number
  default     = 100
}

variable "min_instances" {
  description = "Minimum number of warm instances"
  type        = number
  default     = 0
}

variable "environment_variables" {
  description = "Environment variables for the function"
  type        = map(string)
  default     = {}
}

variable "build_env_vars" {
  description = "Environment variables available during build time"
  type        = map(string)
  default     = {}
}

variable "secret_env_vars" {
  description = "Secret environment variables from Secret Manager"
  type = list(object({
    key     = string
    secret  = string
    version = optional(string, "latest")
  }))
  default = []
}

variable "trigger_type" {
  description = "Trigger type: 'http' or 'event'"
  type        = string
  default     = "http"

  validation {
    condition     = contains(["http", "event"], var.trigger_type)
    error_message = "Trigger type must be 'http' or 'event'."
  }
}

variable "event_type" {
  description = "Event type for event-driven triggers"
  type        = string
  default     = "google.cloud.pubsub.topic.v1.messagePublished"
}

variable "pubsub_topic" {
  description = "Pub/Sub topic for event trigger"
  type        = string
  default     = null
}

variable "retry_policy" {
  description = "Retry policy for event triggers (RETRY_POLICY_RETRY or RETRY_POLICY_DO_NOT_RETRY)"
  type        = string
  default     = "RETRY_POLICY_DO_NOT_RETRY"
}

variable "ingress_settings" {
  description = "Ingress settings (ALLOW_ALL, ALLOW_INTERNAL_ONLY, ALLOW_INTERNAL_AND_GCLB)"
  type        = string
  default     = "ALLOW_ALL"
}

variable "service_account_email" {
  description = "Service account email for the function"
  type        = string
  default     = null
}

variable "allow_unauthenticated" {
  description = "Whether to allow unauthenticated invocations"
  type        = bool
  default     = false
}

variable "labels" {
  description = "Labels to apply to the function"
  type        = map(string)
  default     = {}
}
