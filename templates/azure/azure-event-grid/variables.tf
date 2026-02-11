variable "resource_group_name" {
  type        = string
  description = "Resource group name"
}

variable "location" {
  type        = string
  description = "Azure region"
  default     = "eastus"
}

variable "topic_name" {
  type        = string
  description = "Event Grid topic name"
}

variable "input_schema" {
  type        = string
  description = "Input schema (EventGridSchema, CloudEventSchemaV1_0, CustomInputSchema)"
  default     = "EventGridSchema"
}

variable "webhook_url" {
  type        = string
  description = "Webhook endpoint URL for subscription (leave empty to skip)"
  default     = ""
}

variable "max_delivery_attempts" {
  type        = number
  description = "Maximum delivery attempts"
  default     = 30
}

variable "event_ttl_minutes" {
  type        = number
  description = "Event time-to-live in minutes"
  default     = 1440
}

variable "environment" {
  type        = string
  description = "Environment name"
  default     = "dev"
}
