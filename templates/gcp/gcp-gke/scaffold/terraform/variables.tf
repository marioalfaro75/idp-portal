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

variable "cluster_name" {
  description = "GKE cluster name"
  type        = string
  default     = "{{cluster_name}}"
}
