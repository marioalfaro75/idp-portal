variable "region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

variable "bucket_name" {
  description = "Name of the S3 bucket (must be globally unique)"
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$", var.bucket_name))
    error_message = "bucket_name must be 3-63 characters, lowercase letters, numbers, hyphens, and periods only."
  }
}

variable "enable_versioning" {
  description = "Enable versioning on the S3 bucket"
  type        = bool
  default     = true
}

variable "force_destroy" {
  description = "Allow the bucket to be destroyed even if it contains objects"
  type        = bool
  default     = false
}

variable "block_public_access" {
  description = "Block all public access to the bucket"
  type        = bool
  default     = true
}

variable "kms_key_arn" {
  description = "ARN of a KMS key for server-side encryption. Leave empty for AES256."
  type        = string
  default     = ""
}

variable "lifecycle_rules" {
  description = "List of lifecycle rules for the bucket"
  type = list(object({
    id                                  = string
    enabled                             = bool
    prefix                              = string
    transition_days                     = number
    transition_storage_class            = string
    expiration_days                     = number
    noncurrent_version_expiration_days  = number
  }))
  default = []
}

variable "logging_target_bucket" {
  description = "S3 bucket for access logs. Leave empty to disable."
  type        = string
  default     = ""
}

variable "logging_target_prefix" {
  description = "Prefix for access log objects"
  type        = string
  default     = "logs/"
}

variable "cors_rules" {
  description = "List of CORS rules"
  type = list(object({
    allowed_headers = list(string)
    allowed_methods = list(string)
    allowed_origins = list(string)
    expose_headers  = list(string)
    max_age_seconds = number
  }))
  default = []
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
