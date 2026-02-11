variable "resource_group_name" {
  type        = string
  description = "Resource group name"
}

variable "location" {
  type        = string
  description = "Azure region"
  default     = "eastus"
}

variable "acr_name" {
  type        = string
  description = "Container registry name (must be globally unique, alphanumeric only)"
}

variable "sku" {
  type        = string
  description = "ACR SKU tier"
  default     = "Basic"
}

variable "admin_enabled" {
  type        = bool
  description = "Enable admin user"
  default     = false
}

variable "environment" {
  type        = string
  description = "Environment name"
  default     = "dev"
}
