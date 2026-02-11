variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region for resources"
  type        = string
  default     = "us-central1"
}

variable "database_id" {
  description = "The ID of the Firestore database (use '(default)' for the default database)"
  type        = string
  default     = "(default)"
}

variable "location_id" {
  description = "The location for the Firestore database (e.g., nam5, eur3, us-central1)"
  type        = string
  default     = "nam5"
}

variable "database_type" {
  description = "The type of Firestore database (FIRESTORE_NATIVE or DATASTORE_MODE)"
  type        = string
  default     = "FIRESTORE_NATIVE"

  validation {
    condition     = contains(["FIRESTORE_NATIVE", "DATASTORE_MODE"], var.database_type)
    error_message = "Database type must be FIRESTORE_NATIVE or DATASTORE_MODE."
  }
}

variable "concurrency_mode" {
  description = "Concurrency mode: OPTIMISTIC, PESSIMISTIC, or OPTIMISTIC_WITH_ENTITY_GROUPS"
  type        = string
  default     = "OPTIMISTIC"
}

variable "deletion_protection" {
  description = "Whether to enable deletion protection on the database"
  type        = bool
  default     = true
}

variable "enable_pitr" {
  description = "Whether to enable point-in-time recovery"
  type        = bool
  default     = false
}

variable "composite_indexes" {
  description = "List of composite indexes to create"
  type = list(object({
    collection = string
    fields = list(object({
      field_path   = string
      order        = optional(string)
      array_config = optional(string)
    }))
  }))
  default = []
}

variable "enable_daily_backup" {
  description = "Whether to enable daily backup schedule"
  type        = bool
  default     = true
}

variable "daily_backup_retention" {
  description = "Retention duration for daily backups (e.g., 604800s for 7 days)"
  type        = string
  default     = "604800s"
}

variable "enable_weekly_backup" {
  description = "Whether to enable weekly backup schedule"
  type        = bool
  default     = true
}

variable "weekly_backup_retention" {
  description = "Retention duration for weekly backups (e.g., 2592000s for 30 days)"
  type        = string
  default     = "2592000s"
}

variable "weekly_backup_day" {
  description = "Day of the week for weekly backups (SUNDAY, MONDAY, etc.)"
  type        = string
  default     = "SUNDAY"
}
