variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region for resources"
  type        = string
  default     = "us-central1"
}

variable "keyring_name" {
  description = "Name of the KMS keyring"
  type        = string
  default     = "app-keyring"
}

variable "keyring_location" {
  description = "Location for the keyring (region, multi-region, or global)"
  type        = string
  default     = "us-central1"
}

variable "crypto_keys" {
  description = "List of crypto keys to create in the keyring"
  type = list(object({
    name             = string
    purpose          = optional(string, "ENCRYPT_DECRYPT")
    rotation_period  = optional(string)
    algorithm        = optional(string, "GOOGLE_SYMMETRIC_ENCRYPTION")
    protection_level = optional(string)
    labels           = optional(map(string), {})
  }))
  default = [
    {
      name = "data-encryption-key"
    },
    {
      name    = "secrets-encryption-key"
      purpose = "ENCRYPT_DECRYPT"
    }
  ]
}

variable "default_rotation_period" {
  description = "Default rotation period for keys (e.g., 7776000s for 90 days)"
  type        = string
  default     = "7776000s"
}

variable "default_protection_level" {
  description = "Default protection level for keys (SOFTWARE or HSM)"
  type        = string
  default     = "SOFTWARE"

  validation {
    condition     = contains(["SOFTWARE", "HSM"], var.default_protection_level)
    error_message = "Protection level must be SOFTWARE or HSM."
  }
}

variable "key_iam_bindings" {
  description = "IAM bindings for crypto keys"
  type = list(object({
    key_name = string
    role     = string
    member   = string
  }))
  default = []
}

variable "labels" {
  description = "Labels to apply to crypto keys"
  type        = map(string)
  default     = {}
}
