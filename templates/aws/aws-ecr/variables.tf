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
  default     = "MUTABLE"
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

variable "environment" {
  type        = string
  description = "Environment name"
  default     = "dev"
}
