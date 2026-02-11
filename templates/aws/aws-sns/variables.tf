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

variable "environment" {
  type        = string
  description = "Environment name"
  default     = "dev"
}
