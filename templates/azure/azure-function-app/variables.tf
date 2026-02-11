variable "resource_group_name" {
  description = "Name of the resource group to create"
  type        = string
}

variable "location" {
  description = "Azure region for all resources"
  type        = string
  default     = "eastus2"
}

variable "function_app_name" {
  description = "Name of the Function App"
  type        = string
}

variable "storage_account_name" {
  description = "Name of the storage account for the Function App"
  type        = string
}

variable "os_type" {
  description = "Operating system type (Linux or Windows)"
  type        = string
  default     = "Linux"

  validation {
    condition     = contains(["Linux", "Windows"], var.os_type)
    error_message = "os_type must be either Linux or Windows."
  }
}

variable "sku_name" {
  description = "SKU name for the service plan (Y1 for consumption, B1/S1/P1v2 for dedicated)"
  type        = string
  default     = "Y1"
}

variable "runtime" {
  description = "Runtime stack for the Function App (node, python, dotnet)"
  type        = string
  default     = "node"
}

variable "runtime_version" {
  description = "Version of the runtime stack"
  type        = string
  default     = "18"
}

variable "enable_app_insights" {
  description = "Whether to create and configure Application Insights"
  type        = bool
  default     = true
}

variable "app_settings" {
  description = "Additional application settings for the Function App"
  type        = map(string)
  default     = {}
}

variable "cors_allowed_origins" {
  description = "List of allowed CORS origins"
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
