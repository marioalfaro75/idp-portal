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

variable "topic_name" {
  description = "Pub/Sub topic name"
  type        = string
  default     = "{{topic_name}}"
}
