variable "resource_group_name" {
  type        = string
  description = "Resource group name"
}

variable "location" {
  type        = string
  description = "Azure region"
  default     = "eastus"
}

variable "namespace_name" {
  type        = string
  description = "Service Bus namespace name (must be globally unique)"
}

variable "queue_name" {
  type        = string
  description = "Queue name"
}

variable "sku" {
  type        = string
  description = "Service Bus SKU (Basic, Standard, Premium)"
  default     = "Standard"
}

variable "max_delivery_count" {
  type        = number
  description = "Maximum delivery count before dead-lettering"
  default     = 10
}

variable "message_ttl" {
  type        = string
  description = "Default message TTL (ISO 8601 duration)"
  default     = "P14D"
}

variable "lock_duration" {
  type        = string
  description = "Message lock duration (ISO 8601 duration)"
  default     = "PT1M"
}

variable "enable_partitioning" {
  type        = bool
  description = "Enable partitioning"
  default     = false
}

variable "environment" {
  type        = string
  description = "Environment name"
  default     = "dev"
}
