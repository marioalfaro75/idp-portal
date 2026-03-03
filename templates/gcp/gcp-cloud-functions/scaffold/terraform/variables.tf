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

variable "function_name" {
  description = "Cloud Function name"
  type        = string
  default     = "{{function_name}}"
}

variable "runtime" {
  description = "Cloud Function runtime"
  type        = string
  default     = "{{runtime}}"
}

variable "entry_point" {
  description = "Function entry point"
  type        = string
  default     = "{{entry_point}}"
}
