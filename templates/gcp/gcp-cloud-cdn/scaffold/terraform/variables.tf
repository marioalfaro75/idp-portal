variable "project_id" {
  description = "GCP project ID"
  type        = string
  default     = "{{project_id}}"
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "{{region}}"
}

variable "bucket_name" {
  description = "GCS bucket name"
  type        = string
  default     = "{{bucket_name}}"
}

variable "cdn_name" {
  description = "Cloud CDN name"
  type        = string
  default     = "{{cdn_name}}"
}
