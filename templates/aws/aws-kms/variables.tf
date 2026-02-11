variable "region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

variable "alias_name" {
  description = "Alias name for the KMS key (without 'alias/' prefix)"
  type        = string
}

variable "description" {
  description = "Description of the KMS key"
  type        = string
  default     = "KMS encryption key"
}

variable "key_usage" {
  description = "Key usage (ENCRYPT_DECRYPT or SIGN_VERIFY)"
  type        = string
  default     = "ENCRYPT_DECRYPT"
}

variable "key_spec" {
  description = "Key spec (SYMMETRIC_DEFAULT, RSA_2048, etc.)"
  type        = string
  default     = "SYMMETRIC_DEFAULT"
}

variable "deletion_window_in_days" {
  description = "Waiting period before the key is deleted (7-30 days)"
  type        = number
  default     = 30
}

variable "enable_key_rotation" {
  description = "Enable automatic key rotation (yearly)"
  type        = bool
  default     = true
}

variable "multi_region" {
  description = "Create a multi-region key"
  type        = bool
  default     = false
}

variable "key_policy" {
  description = "Custom key policy JSON. Leave empty to use the default policy."
  type        = string
  default     = ""
}

variable "admin_role_arns" {
  description = "List of IAM role ARNs that can administer the key"
  type        = list(string)
  default     = []
}

variable "usage_role_arns" {
  description = "List of IAM role ARNs that can use the key for encryption/decryption"
  type        = list(string)
  default     = []
}

variable "allow_service_usage" {
  description = "Allow specified AWS services to use the key"
  type        = bool
  default     = false
}

variable "allowed_services" {
  description = "List of AWS service principals allowed to use the key"
  type        = list(string)
  default     = []
}

variable "grants" {
  description = "List of KMS grants to create"
  type = list(object({
    name              = string
    grantee_principal = string
    operations        = list(string)
  }))
  default = []
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
