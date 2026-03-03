variable "region" {
  description = "AWS region"
  type        = string
  default     = "{{region}}"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "{{project_name}}"
}

variable "bucket_name" {
  description = "S3 bucket name"
  type        = string
  default     = "{{bucket_name}}"
}
