variable "resource_group_name" {
  description = "Name of the resource group to create"
  type        = string
}

variable "location" {
  description = "Azure region for all resources"
  type        = string
  default     = "eastus2"
}

variable "action_group_name" {
  description = "Name of the monitor action group"
  type        = string
}

variable "action_group_short_name" {
  description = "Short name for the action group (max 12 chars)"
  type        = string
}

variable "email_receivers" {
  description = "List of email receivers for the action group"
  type = list(object({
    name  = string
    email = string
  }))
  default = []
}

variable "webhook_receivers" {
  description = "List of webhook receivers for the action group"
  type = list(object({
    name = string
    uri  = string
  }))
  default = []
}

variable "metric_alerts" {
  description = "List of metric alert rules"
  type = list(object({
    name             = string
    scopes           = list(string)
    description      = string
    severity         = number
    frequency        = string
    window_size      = string
    enabled          = bool
    auto_mitigate    = bool
    metric_namespace = string
    metric_name      = string
    aggregation      = string
    operator         = string
    threshold        = number
  }))
  default = []
}

variable "activity_log_alerts" {
  description = "List of activity log alert rules"
  type = list(object({
    name           = string
    scopes         = list(string)
    description    = string
    enabled        = bool
    category       = string
    operation_name = string
    level          = string
  }))
  default = []
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
