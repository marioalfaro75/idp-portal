variable "resource_group_name" {
  description = "Name of the resource group to create"
  type        = string
}

variable "location" {
  description = "Azure region for all resources"
  type        = string
  default     = "eastus2"
}

variable "workspace_name" {
  description = "Name of the Log Analytics workspace"
  type        = string
}

variable "sku" {
  description = "SKU of the Log Analytics workspace"
  type        = string
  default     = "PerGB2018"
}

variable "retention_in_days" {
  description = "Data retention period in days"
  type        = number
  default     = 30
}

variable "daily_quota_gb" {
  description = "Daily quota in GB (-1 for unlimited)"
  type        = number
  default     = -1
}

variable "solutions" {
  description = "List of Log Analytics solutions to deploy"
  type        = list(string)
  default = [
    "ContainerInsights",
    "SecurityCenterFree"
  ]
}

variable "windows_event_logs" {
  description = "List of Windows event log data sources"
  type = list(object({
    name           = string
    event_log_name = string
    event_types    = list(string)
  }))
  default = []
}

variable "diagnostic_settings" {
  description = "List of diagnostic settings to configure for target resources"
  type = list(object({
    name               = string
    target_resource_id = string
    log_categories     = list(string)
    metric_categories  = list(string)
  }))
  default = []
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
