variable "region" {
  type        = string
  description = "AWS region"
  default     = "us-east-1"
}

variable "topic_name" {
  type        = string
  description = "SNS topic name"
}

variable "display_name" {
  type        = string
  description = "Display name for SMS subscriptions"
  default     = ""
}

variable "email_endpoint" {
  type        = string
  description = "Email address for subscription (leave empty to skip)"
  default     = ""
}

variable "kms_master_key_id" {
  type        = string
  description = "KMS key ID for SNS topic encryption (uses alias/aws/sns if not set)"
  default     = null
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
