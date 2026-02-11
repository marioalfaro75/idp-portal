variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region for resources"
  type        = string
  default     = "us-central1"
}

variable "bucket_name" {
  description = "Globally unique name for the GCS bucket"
  type        = string
}

variable "location" {
  description = "Location for the bucket (region, dual-region, or multi-region)"
  type        = string
  default     = "US"
}

variable "storage_class" {
  description = "Storage class: STANDARD, NEARLINE, COLDLINE, ARCHIVE"
  type        = string
  default     = "STANDARD"

  validation {
    condition     = contains(["STANDARD", "NEARLINE", "COLDLINE", "ARCHIVE"], var.storage_class)
    error_message = "Storage class must be STANDARD, NEARLINE, COLDLINE, or ARCHIVE."
  }
}

variable "uniform_bucket_level_access" {
  description = "Whether to enable uniform bucket-level access"
  type        = bool
  default     = true
}

variable "force_destroy" {
  description = "Whether to allow bucket deletion even if it contains objects"
  type        = bool
  default     = false
}

variable "public_access_prevention" {
  description = "Public access prevention setting (inherited or enforced)"
  type        = string
  default     = "enforced"
}

variable "enable_versioning" {
  description = "Whether to enable object versioning"
  type        = bool
  default     = true
}

variable "lifecycle_rules" {
  description = "Lifecycle rules for objects in the bucket"
  type = list(object({
    action_type           = string
    storage_class         = optional(string)
    age                   = optional(number)
    num_newer_versions    = optional(number)
    with_state            = optional(string)
    matches_storage_class = optional(list(string))
  }))
  default = [
    {
      action_type        = "Delete"
      age                = 365
      num_newer_versions = null
      with_state         = "ARCHIVED"
    },
    {
      action_type    = "SetStorageClass"
      storage_class  = "NEARLINE"
      age            = 30
    }
  ]
}

variable "cors_config" {
  description = "CORS configuration for the bucket"
  type = object({
    origins          = list(string)
    methods          = list(string)
    response_headers = list(string)
    max_age_seconds  = number
  })
  default = null
}

variable "kms_key_name" {
  description = "Cloud KMS key name for default bucket encryption"
  type        = string
  default     = null
}

variable "log_bucket" {
  description = "GCS bucket name for access logs"
  type        = string
  default     = null
}

variable "log_object_prefix" {
  description = "Prefix for access log objects"
  type        = string
  default     = "access-logs/"
}

variable "retention_period_seconds" {
  description = "Minimum retention period for objects in seconds"
  type        = number
  default     = null
}

variable "retention_policy_locked" {
  description = "Whether the retention policy is locked"
  type        = bool
  default     = false
}

variable "iam_members" {
  description = "IAM members to grant access to the bucket"
  type = list(object({
    role   = string
    member = string
  }))
  default = []
}

variable "notification_topic" {
  description = "Pub/Sub topic for bucket notifications"
  type        = string
  default     = null
}

variable "notification_event_types" {
  description = "Event types to trigger notifications"
  type        = list(string)
  default     = ["OBJECT_FINALIZE", "OBJECT_DELETE"]
}

variable "notification_object_prefix" {
  description = "Object prefix filter for notifications"
  type        = string
  default     = null
}

variable "labels" {
  description = "Labels to apply to the bucket"
  type        = map(string)
  default     = {}
}
