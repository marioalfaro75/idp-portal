variable "resource_group_name" {
  type        = string
  description = "Resource group name"
}

variable "location" {
  type        = string
  description = "Azure region"
  default     = "eastus"
}

variable "app_name" {
  type        = string
  description = "Container app name"
}

variable "container_image" {
  type        = string
  description = "Container image to deploy"
}

variable "target_port" {
  type        = number
  description = "Target port for the container"
  default     = 80
}

variable "cpu" {
  type        = number
  description = "CPU cores allocated"
  default     = 0.5
}

variable "memory" {
  type        = string
  description = "Memory allocated"
  default     = "1Gi"
}

variable "min_replicas" {
  type        = number
  description = "Minimum number of replicas"
  default     = 1
}

variable "max_replicas" {
  type        = number
  description = "Maximum number of replicas"
  default     = 5
}

variable "external_enabled" {
  type        = bool
  description = "Enable external ingress"
  default     = true
}

variable "tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}
