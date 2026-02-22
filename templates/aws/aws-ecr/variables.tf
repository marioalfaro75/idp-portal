variable "region" {
  type        = string
  description = "AWS region"
  default     = "us-east-1"
}

variable "repository_name" {
  type        = string
  description = "ECR repository name"
}

variable "image_tag_mutability" {
  type        = string
  description = "Image tag mutability setting"
  default     = "IMMUTABLE"

  validation {
    condition     = contains(["MUTABLE", "IMMUTABLE"], var.image_tag_mutability)
    error_message = "image_tag_mutability must be MUTABLE or IMMUTABLE."
  }
}

variable "scan_on_push" {
  type        = bool
  description = "Enable image scanning on push"
  default     = true
}

variable "max_image_count" {
  type        = number
  description = "Maximum number of images to keep"
  default     = 30
}

variable "kms_key_arn" {
  type        = string
  description = "KMS key ARN for ECR encryption (uses AES256 if not set)"
  default     = null
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
